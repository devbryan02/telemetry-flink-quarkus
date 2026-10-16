package dev.bryan.viajes;
import com.fasterxml.jackson.databind.*;
import java.io.IOException;
import java.util.Set;
import java.util.UUID;
/** Validación del contrato de entrada de esta feature, sin dependencias entre features. */
final class EventoJson {
    private static final ObjectMapper MAPPER=new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,false);
    static <T> T leer(byte[] bytes,Class<T> type)throws IOException {
        if(bytes==null)throw new IOException("Evento ausente");
        JsonNode n=MAPPER.readTree(bytes);
        validar(n);
        return MAPPER.treeToValue(n,type);
    }
    static void validar(JsonNode n)throws IOException {
        if(n==null||!n.isObject())throw new IOException("Evento invalido");
        texto(n,"carId");texto(n,"engine");
        for(String f:new String[]{"lat","lon"})if(!n.hasNonNull(f)||!n.get(f).isNumber()||!Double.isFinite(n.get(f).asDouble()))throw new IOException("Coordenada invalida");
        if(Math.abs(n.get("lat").asDouble())>90||Math.abs(n.get("lon").asDouble())>180)throw new IOException("Coordenada fuera de rango");
        entero(n,"heading",359);entero(n,"battery",100);entero(n,"ts",Long.MAX_VALUE);
        if(!Set.of("ON","OFF").contains(n.get("engine").asText()))throw new IOException("Motor invalido");
        for(String f:new String[]{"companyId","fleetId"})if(n.hasNonNull(f)&&!n.get(f).isTextual())throw new IOException("Identidad invalida");
        if(n.hasNonNull("schemaVersion"))entero(n,"schemaVersion",2);
        int version=n.path("schemaVersion").isNull()?1:n.path("schemaVersion").asInt(1);
        if(version!=1&&version!=2)throw new IOException("Version no soportada");
        if(version==1) {
            for(String f:new String[]{"eventId","carreraId","viajeId","rutaId","inicioViajeTs","tipoEvento","motivoFin"})
                if(n.hasNonNull(f))throw new IOException("Contexto legado parcial");
            return;
        }
        for(String f:new String[]{"eventId","carreraId","viajeId"}) {
            texto(n,f);String value=n.get(f).asText();
            if(!value.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"))throw new IOException("UUID invalido");
            UUID.fromString(value);
        }
        texto(n,"rutaId");texto(n,"tipoEvento");entero(n,"inicioViajeTs",Long.MAX_VALUE);
        String tipo=n.get("tipoEvento").asText();
        if(!Set.of("INICIO","POSICION","FIN").contains(tipo))throw new IOException("Tipo invalido");
        long inicio=n.get("inicioViajeTs").asLong(), ts=n.get("ts").asLong();
        if(ts<inicio||("INICIO".equals(tipo)&&ts!=inicio))throw new IOException("Intervalo invalido");
        if("FIN".equals(tipo)) {
            texto(n,"motivoFin");
            if(!Set.of("META","DETENIDO","REEMPLAZADO").contains(n.get("motivoFin").asText()))throw new IOException("Cierre invalido");
        } else if(n.hasNonNull("motivoFin"))throw new IOException("Motivo sin cierre");
    }
    private static void texto(JsonNode n,String f)throws IOException {
        if(!n.hasNonNull(f)||!n.get(f).isTextual()||n.get(f).asText().isBlank())throw new IOException("Campo requerido: "+f);
    }
    private static void entero(JsonNode n,String f,long max)throws IOException {
        if(!n.hasNonNull(f)||!n.get(f).isIntegralNumber()||!n.get(f).canConvertToLong()||n.get(f).asLong()<0||n.get(f).asLong()>max)throw new IOException("Numero invalido: "+f);
    }
}
