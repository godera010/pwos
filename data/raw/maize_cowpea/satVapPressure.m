%This fucntion calculates saturated vapor pressure of air (kPa) at given air
%temperature (°C)
function es = satVapPressure(Tair)

es = 0.6108*exp(17.27*Tair./(Tair+237.3));

end