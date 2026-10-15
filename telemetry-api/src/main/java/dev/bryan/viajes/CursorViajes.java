package dev.bryan.viajes;
import com.fasterxml.jackson.databind.*;
import java.util.*;
final class CursorViajes {
    private static final ObjectMapper M=new ObjectMapper();
    record Clave(long ts,UUID id){}
    record Datos(int version,String tipo,JsonNode filtro,UUID viajeId,int limit,long ts,UUID id){}
    static String codificar(String tipo,Object filtro,UUID viajeId,int limit,long ts,UUID id){
        try{return Base64.getUrlEncoder().withoutPadding().encodeToString(M.writeValueAsBytes(new Datos(1,tipo,M.valueToTree(filtro),viajeId,limit,ts,id)));}
        catch(Exception ex){throw new IllegalStateException("No se pudo crear cursor",ex);}
    }
    static Clave decodificar(String cursor,String tipo,Object filtro,UUID viajeId,int limit){
        if(cursor==null)return null;
        if(cursor.length()>4096)throw new ConsultaViajesInvalidaException();
        try{
            var d=M.readValue(Base64.getUrlDecoder().decode(cursor),Datos.class);
            if(d.version()!=1||!Objects.equals(d.tipo(),tipo)||!Objects.equals(d.filtro(),M.valueToTree(filtro))
                ||!Objects.equals(d.viajeId(),viajeId)||d.limit()!=limit||d.id()==null||d.ts()<0)throw new ConsultaViajesInvalidaException();
            return new Clave(d.ts(),d.id());
        }catch(Exception ex){throw new ConsultaViajesInvalidaException();}
    }
}
