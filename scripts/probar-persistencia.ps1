param([switch]$SkipBuild, [switch]$KeepStack)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$repoPath=Split-Path $PSScriptRoot -Parent
$composePath=Join-Path $repoPath 'telemetry-api/src/test/resources/compose-persistencia.yml'
$projectName='telemetria-persistencia-e2e-'+[guid]::NewGuid().ToString('N').Substring(0,8)
$artifacts=Join-Path $repoPath ('telemetry-api/target/'+$projectName)
New-Item -ItemType Directory -Path $artifacts -Force | Out-Null
# Sin BOM: el pipeline hacia comandos nativos lo antepondría a la key del evento
$OutputEncoding=New-Object System.Text.UTF8Encoding $false
function DC {
    # Un comando nativo dentro de una función no recibe el pipeline de la función: se reenvía con $input
    if($MyInvocation.ExpectingInput){$input | & docker compose -p $projectName -f $composePath @args}
    else{& docker compose -p $projectName -f $composePath @args}
    if($LASTEXITCODE -ne 0){throw "Fallo de compose: $($args[0])"}
}
function Assert-Case([bool]$Value,[string]$Name){
    if(-not $Value){throw "FAIL: $Name"}; Write-Output "PASS: $Name"
}
function Wait-For([scriptblock]$Condition,[string]$Name){
    $deadline=[DateTime]::UtcNow.AddSeconds(120)
    # Solo cuenta el último valor: la salida de comandos intermedios haría verdadero el arreglo
    do{try{$r=@(& $Condition);if($r.Count -gt 0 -and $r[-1]){Write-Output "READY: $Name";return}}catch{}
        Start-Sleep -Milliseconds 500
    }while([DateTime]::UtcNow -lt $deadline)
    throw "Timeout: $Name"
}
function Api-Url{'http://'+((DC port api 8080)-join '').Trim()}
function GET([string]$Path){Invoke-RestMethod -Uri ($baseUrl+$Path) -TimeoutSec 5}
function POST([string]$Path,$Body){Invoke-RestMethod -Uri ($baseUrl+$Path) -Method Post -ContentType 'application/json' -Body ($Body|ConvertTo-Json -Compress) -TimeoutSec 10}
function SQL([string]$Query){((DC exec -T postgres psql -U e2e -d e2e -At -c $Query)-join [Environment]::NewLine).Trim()}
function Publish($Event){
    ($Event.carId+'|'+($Event|ConvertTo-Json -Compress -Depth 10)) |
        DC exec -T kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka:29092 --topic telemetria --property parse.key=true --property 'key.separator=|' |
        Out-Null
}
function Event([string]$Car,[string]$Trip,[long]$Ts,[string]$Tipo='POSICION',[string]$Fin=$null){
    [ordered]@{carId=$Car;companyId=$null;fleetId=$null;lat=0;lon=0;heading=0;engine='ON';battery=100;ts=$Ts;
        schemaVersion=2;eventId=[guid]::NewGuid().ToString();carreraId=$raceId;viajeId=$Trip;rutaId='av-brasil';
        inicioViajeTs=1000;tipoEvento=$Tipo;motivoFin=if($Tipo -eq 'FIN'){$Fin}else{$null}}
}
function Group-State {
    $text=(DC exec -T kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka:29092 --describe --group quarkus-viajes-postgres)-join [Environment]::NewLine
    $text|Out-File (Join-Path $artifacts 'offsets.txt') -Append -Encoding utf8
    $row=@($text -split '\r?\n'|Where-Object{$_ -match '^\s*quarkus-viajes-postgres\s+telemetria\s+0\s+'})
    if($row.Count -ne 1){throw 'Offsets historicos no disponibles'}
    $parts=$row[0].Trim() -split '\s+'
    @{offset=[long]$parts[3];lag=[long]$parts[5]}
}
function Ready-Down {
    try{$null=GET '/q/health/ready';return $false}
    catch{return $null -ne $_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 503}
}
try{
    if(-not $SkipBuild){
        Push-Location (Join-Path $repoPath 'telemetry-api')
        try{& .\mvnw.cmd package -DskipTests;if($LASTEXITCODE -ne 0){throw 'Package fallo'}}
        finally{Pop-Location}
    }
    DC up -d --build postgres kafka
    Wait-For {(DC exec -T postgres pg_isready -U e2e -d e2e)-match 'accepting connections'} 'PostgreSQL'
    Wait-For {$null=DC exec -T kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:29092 --list;$true} 'Kafka'
    DC exec -T kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:29092 --create --if-not-exists --topic telemetria --partitions 1 --config retention.ms=3600000
    DC exec -T kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:29092 --create --if-not-exists --topic ultima-posicion --partitions 1 --config cleanup.policy=compact
    DC up -d --build api
    $baseUrl=Api-Url
    Wait-For {(GET '/q/health/ready').status -eq 'UP'} 'API y consumidores'
    Wait-For {
        Publish ([ordered]@{carId='legacy-e2e';companyId=$null;fleetId=$null;lat=0;lon=0;heading=0;engine='ON';battery=100;ts=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()})
        @((GET '/autos')|Where-Object carId -eq 'legacy-e2e').Count -eq 1
    } 'source Flink activo'
    Assert-Case ((SQL "SELECT count(*) FROM tb_viaje WHERE car_id='legacy-e2e'") -eq '0') 'legado sin viajes falsos'
    $raceId=[guid]::NewGuid().ToString();$tripId=[guid]::NewGuid().ToString()
    $inicio=Event 'e2e-car' $tripId 1000 'INICIO'
    $nuevo=Event 'e2e-car' $tripId 3000
    $tardio=Event 'e2e-car' $tripId 2000
    Publish $inicio;Publish $nuevo;Publish $tardio
    Wait-For {(GET "/viajes/$tripId").resumen.cantidadMuestras -eq 3 -and @((GET '/autos')|Where-Object{$_.carId -eq 'e2e-car' -and $_.ts -eq 3000}).Count -eq 1} 'tardios en historial sin retroceso actual'
    $received=SQL "SELECT received_at FROM tb_posicion_historial WHERE event_id='$($tardio.eventId)'"
    Publish $tardio
    Wait-For {(GET '/q/metrics') -match 'viajes_eventos_duplicados_total\s+[1-9]'} 'reentrega contada'
    Assert-Case ((SQL "SELECT count(*) FROM tb_posicion_historial WHERE viaje_id='$tripId'") -eq '3') 'sin duplicados'
    Assert-Case ((SQL "SELECT received_at FROM tb_posicion_historial WHERE event_id='$($tardio.eventId)'") -eq $received) 'receivedAt estable'
    Publish (Event 'e2e-car' $tripId 4000 'FIN' 'META')
    Wait-For {(GET "/viajes/$tripId").viaje.estado -eq 'FINALIZADO'} 'FIN META'
    $pagina=GET "/viajes/$tripId/posiciones?limit=1"
    Assert-Case ($pagina.items.Count -eq 1 -and $null -ne $pagina.nextCursor) 'pagina acotada'
    $carrera=POST '/simulacion/iniciar' @{ruta='av-brasil'}
    Wait-For {(GET ("/viajes?carreraId="+$carrera.carreraId)).items.Count -eq 3} 'tres viajes por carrera'
    $null=POST '/simulacion/detener' @{}
    Wait-For {@((GET ("/viajes?carreraId="+$carrera.carreraId)).items|Where-Object estado -eq 'DETENIDO').Count -eq 3} 'FIN DETENIDO'
    $segunda=POST '/simulacion/iniciar' @{ruta='av-brasil'}
    $tercera=POST '/simulacion/iniciar' @{ruta='panamericana-sur'}
    Wait-For {@((GET ("/viajes?carreraId="+$segunda.carreraId)).items|Where-Object estado -eq 'REEMPLAZADO').Count -eq 3} 'FIN REEMPLAZADO'
    Assert-Case ($segunda.carreraId -ne $tercera.carreraId) 'nueva identidad'
    $null=POST '/simulacion/detener' @{}
    Wait-For {(Group-State).lag -eq 0} 'sin lag antes del fallo'
    $antes=Group-State
    DC stop postgres
    $recoveryTrip=[guid]::NewGuid().ToString()
    Publish (Event 'recovery-car' $recoveryTrip 1000 'INICIO')
    Wait-For {Ready-Down} 'readiness DOWN por BD'
    $durante=Group-State
    Assert-Case ($durante.offset -eq $antes.offset) 'sin commit del lote fallido'
    DC start postgres
    Wait-For {(DC exec -T postgres pg_isready -U e2e -d e2e)-match 'accepting connections'} 'BD recuperada'
    DC restart api
    $baseUrl=Api-Url   # el puerto aleatorio cambia al reiniciar el contenedor
    Wait-For {(GET '/q/health/ready').status -eq 'UP'} 'canales reiniciados'
    Wait-For {(GET "/viajes/$recoveryTrip").resumen.cantidadMuestras -eq 1} 'reproceso de pendiente'
    Assert-Case ((GET "/viajes/$tripId").resumen.cantidadMuestras -eq 4) 'historial persiste sin nueva carrera'
    Assert-Case (@((GET '/autos')|Where-Object{$_.carId -eq 'e2e-car' -and $_.ts -eq 4000}).Count -eq 1) 'ultima posicion persiste'
    $conflicto=[ordered]@{};foreach($key in $inicio.Keys){$conflicto[$key]=$inicio[$key]};$conflicto.lon=1
    Publish $conflicto
    Wait-For {Ready-Down} 'conflicto detiene canal'
    Assert-Case ((SQL "SELECT lon FROM tb_posicion_historial WHERE event_id='$($inicio.eventId)'") -eq '0') 'conflicto no sobrescribe'
    $config=(DC exec -T kafka /opt/kafka/bin/kafka-configs.sh --bootstrap-server kafka:29092 --entity-type topics --entity-name telemetria --describe)-join [Environment]::NewLine
    Assert-Case ($config -match 'retention.ms=3600000') 'retencion de una hora'
    'PASS: todos los escenarios E2E'|Tee-Object -FilePath (Join-Path $artifacts 'resultado.txt')
}finally{
    try{DC logs --no-color|Out-File (Join-Path $artifacts 'servicios.log') -Encoding utf8}catch{}
    if(-not $KeepStack){
        if($projectName -notmatch '^telemetria-persistencia-e2e-[0-9a-f]{8}$'){throw 'Proyecto de limpieza invalido'}
        DC down --volumes --remove-orphans
    }
    Write-Output "Artefactos: $artifacts"
    if($KeepStack){Write-Output "Proyecto conservado: $projectName"}
}
