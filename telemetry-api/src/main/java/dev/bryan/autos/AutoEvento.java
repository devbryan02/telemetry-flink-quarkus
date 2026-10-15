package dev.bryan.autos;
record AutoEvento(String carId,String companyId,String fleetId,double lat,double lon,int heading,
                  String engine,int battery,long ts) {
    Auto auto() { return new Auto(carId,companyId,fleetId,lat,lon,heading,engine,battery,ts); }
}
