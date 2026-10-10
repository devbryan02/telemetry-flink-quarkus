# CPU (% del equipo, medido durante 5 s) y memoria (MB) del proceso Java de telemetry-api.
# Lo usa scripts/medir-carga.sh. Imprime "<cpu> <mem>" o "- -" si no encuentra el proceso.
$p = Get-CimInstance Win32_Process -Filter "Name='java.exe'" |
    Where-Object { $_.CommandLine -match 'quarkus|telemetry-api' } |
    Select-Object -First 1
if (-not $p) { "- -"; exit }
$antes = (Get-Process -Id $p.ProcessId).CPU
Start-Sleep -Seconds 5
$proc = Get-Process -Id $p.ProcessId
$cpu = [int](($proc.CPU - $antes) / 5 / [Environment]::ProcessorCount * 100)
$mem = [int]($proc.WorkingSet64 / 1MB)
"$cpu $mem"
