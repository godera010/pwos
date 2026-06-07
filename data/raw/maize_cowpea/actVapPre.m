%This function calculates the actual vapor pressure in air
%Inputs: Air temperature C, Air relative humidity RH-%
%Output: Vapor pressure, kPa
%Actual vapor pressure, kPa
function ea = actVapPre(Tair,RH)

es = satVapPressure(Tair);
ea = RH/100.*es;
    
%Function for calculating saturated vapor pressure
    function es = satVapPressure(Tair)
        es = 0.6108*exp(17.27*Tair./(Tair+237.3));
    end
end
