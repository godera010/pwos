%This function extrapolates the wind speed measured at certain height to
%wind speed a desired height
%From Campbell and Norman (1998 )- An Introduction to environmental biophysics, p 66 ->
%Input: Measured wind speed uZ (m/s), measurement heihgt z (m), desired height h (m)

%Output: uH m/s

function uH = windExtrapolate(uz,z,h)

%Examples of roughness lengths (cm)
%Table from Hansen 1993.
% Hansen, F. V. (1993) Surface Roughness Lengths. ARL Technical Report, U. S. Army, White Sands Missile Range, NM 88002-5501. 

% ice = 0.001
% dry lake bed = 0.003
% calm open sea = 0.01
% desert smooth = 0.03
% grass closely mowed = 0.1
% farmland snow covered = 0.2
% bare soil tilled = 0.2-0.6
% thick grass 50 cm height = 9
% forest, level topography = 70-120
% coniferous forest = 110
% alfalfa = 3
% Potatoes  60 cm height = 4
% Cotton 1.3 m tall = 13
% Citrus orchard = 31-40
% Villages, Towns = 40 - 50 
% Residental, low density = 110
% Urban buildings, business district 175-320

%uZ = (uStar/0.4)*log((z-d)/zM);

d = 0.65*h; %zero plane displacement (Campbell and Norman 1998)
zm = 0.1*h; %roughness length 

%Solving for uStar (friction velocity)
uStar = 0.4*(uz/log((z-d)/zm));
%And solving uH for wind speed at target H height
uH = (uStar/0.4)*(log((h-d)/zm));
end