%Calculates the Potential evapotranspiration according  FAO Penman-Monteith method
%as in FAO irrigation and drainage paper 56.

function ET = penmanMonteith(ea,es,Tair,RH,alpha,Rs,time,latitude,Gsc,altitude,sigma,Tmax,Tmin,press,uz)
%Constants
z = 2;

%Conversion
Rs = Rs*0.0864; %MJ/m^2

% computation
Delta = sloSatVapPreCur(es,Tair);
% ea = actVapPre(RH,es);
Rn = netRad(alpha,Rs,time,latitude,Gsc,altitude,sigma,Tmax,Tmin,ea);
G = soilHeatFlux( );
gamma = psyCon(press);
u2 = windProRel(uz,z);
ET = dPenmanMonteith(Delta, Rn,G,gamma,Tair,u2,es,ea);

% slope of saturated vapor pressure curve (kPa/C)
    function delta = sloSatVapPreCur(es, Tair)
        delta = 4098*es./(Tair+273.3).^2;
    end


% net radiation (MJ/m^2)
    function Rn = netRad(alpha, Rs, time, latitude, Gsc, altitude, sigma, Tmax, Tmin,ea)
        % net shortwave radiation
        Rns = (1-alpha)*Rs;
        
        % net longwave radiation
        J = time;
        dr = 1+ 0.033*cos(2*pi/365*J);
        phi = pi/180*latitude;
        rho = 0.409*sin(2*pi/365*J-1.39);  
        omegas = acos(-tan(phi)*tan(rho));
        
        %Extraterrestial radiation check
        Ra = 24*60/pi*Gsc*dr.*(omegas*sin(phi).*sin(rho)+cos(phi).*cos(rho).*sin(omegas));
        
        %Clear sky solar radiation check
        Rso = (0.75+2*10^-5*altitude)*Ra;
        
        %Longwave radiation
        Rnl = sigma*((Tmax+273.16).^4+(Tmin+273.16).^4 )/2.*(0.34-0.14*sqrt(ea)).*(1.35*Rs./Rso-0.35);
        
        Rn = Rns - Rnl;        
    end

    %Soil heat flux (MJ/m^2) check!
  
    function G = soilHeatFlux( )
    %As the magnitude of the day or ten-day soil heat flux beneath the grass reference surface is 
    %relatively small, it may be ignored and thus (FAO irrigation and drainage paper 56):
        G = 0;
    end

    %Psychrometric constant (kPa/C)
    function gamma = psyCon(press)
    gamma = 0.665*10^-3*press;
    end

    %Wind profile relationship
    function u2 = windProRel (uz,z)
    u2 = uz*4.87/log(67.8*z-5.42);
    end

    %Daily FAO Penman-Monteith equation
    function ET = dPenmanMonteith(Delta, Rn, G, gamma, Tair, u2, es, ea)
         ET = (0.408*Delta.*( Rn-G )+gamma*900./( Tair+273 ).*u2.*( es-ea ) )./( Delta+gamma.*( 1+0.34*u2 ) );
    end
end