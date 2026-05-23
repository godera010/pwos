% Written by Juuso Tuure (juuso.tuure@helsinki.fi) 2025
% This script interpolates and frames the soil data recorded by Decagon EM50 dataloggers.

close all;
clear;
clc;
load rawsoildata.mat
fields = fieldnames(rawsoildata);

for f=1:numel(fields)  %Loop through the given fieldnames
    
    time = rawsoildata.(fields{f}).time;
    theta = rawsoildata.(fields{f}).theta;
    t = rawsoildata.(fields{f}).t;
    
    % Set the limits and timesteps manually:
    start = datenum(2019,03,15,00,00,00);  % YYYY, MM, DD, HH, MM, SS
    stop = datenum(2021,10,25,00,00,00); % YYYY, MM, DD, HH, MM, SS
    dt = 30;
    
    add = dt/(60*24); % Time step add. dt is in minutes i.e. (1/(60*60*24) is the case for 1 second)
    dates = (start:add:stop)'; % pre allocate vector
    
    [~, ind] = unique(time); % ind = index of first occurrence of a repeated value
    time = time(ind);
    t = t(ind,:);
    theta = theta(ind,:);
    
    t = interp1(time,t,dates,'linear'); %Interpolate to dt timestep
    theta = interp1(time,theta,dates,'linear'); %Interpolate to dt timestep
    
    %Interpolate NaN-valus
    nanTheta = isnan(theta);
    nanT = isnan(t);
    idx    = 1:numel(theta);
    theta(nanTheta) = interp1(idx(~nanTheta), theta(~nanTheta), idx(nanTheta));
    t(nanT) = interp1(idx(~nanT), t(~nanT), idx(nanT));
    
    %Re-name the variables similar as before interpolation
    if f == 1
        soildata.time = dates;
        soildata.datetime = datetime(dates,'ConvertFrom','datenum');
        soildata.IC1.theta = theta(:,1:2);
        soildata.IC1.t = t(:,1:2);
        
    elseif f == 2
        soildata.SC1.theta = theta(:,1:2);
        soildata.SC1.t = t(:,1:2);
        
    elseif f == 3
        soildata.SC2.theta = theta(:,1:2);
        soildata.SC2.t = t(:,1:2);
        
    elseif f == 4
        soildata.IC2.theta = theta(:,1:2);
        soildata.IC2.t = t(:,1:2);
        
    elseif f == 5
        soildata.SC3.theta = theta(:,1:2);
        soildata.SC3.t = t(:,1:2);
        soildata.IC3.theta = theta(:,3:4);
        soildata.IC3.t = t(:,3:4);
    end
    % Clear the variables before the next loop
    clear  time theta t 
    
end


% Planting and harvest dates for framing the data
startGs1 = datetime(2019,4,12);
stopGs1 = datetime(2019,8,13);
startGs2 = datetime(2019,10,1);
stopGs2 = datetime(2020,2,1);
startGs3 = datetime(2020,3,17);
stopGs3 = datetime(2020,7,30);
startGs4 = datetime(2020,10,17);
stopGs4 = datetime(2021,2,28);
startGs5 = datetime(2021,3,30); 
stopGs5 = datetime(2021,7,19); 
startWholePeriod = datetime(2019,3,15);
stopWholePeriod = datetime(2021,10,20);

starts = [startGs1;startGs2;startGs3;startGs4;startGs5;startWholePeriod]; 
stops =[stopGs1;stopGs2;stopGs3;stopGs4;stopGs5;stopWholePeriod]; 

% Extract selected records from data and sort according to plots & growing
% seasons
for i = 1:numel(starts)
indices(i).idx = (soildata.datetime >= starts(i)...
    & soildata.datetime < stops(i));
    
seasonalSoildata(i).datetime = soildata.datetime(indices(i).idx,:); 
seasonalSoildata(i).IC1.theta = soildata.IC1.theta(indices(i).idx,:); 
seasonalSoildata(i).IC1.t = soildata.IC1.t(indices(i).idx,:); 

seasonalSoildata(i).SC1.theta = soildata.SC1.theta(indices(i).idx,:);
seasonalSoildata(i).SC1.t = soildata.SC1.t(indices(i).idx,:);

seasonalSoildata(i).SC2.theta = soildata.SC2.theta(indices(i).idx,:);
seasonalSoildata(i).SC2.t = soildata.SC2.t(indices(i).idx,:);

seasonalSoildata(i).IC2.theta = soildata.IC2.theta(indices(i).idx,:);
seasonalSoildata(i).IC2.t = soildata.IC2.t(indices(i).idx,:);

seasonalSoildata(i).SC3.theta = soildata.SC3.theta(indices(i).idx,:);
seasonalSoildata(i).IC3.theta = soildata.IC3.theta(indices(i).idx,:);
seasonalSoildata(i).SC3.t = soildata.SC3.t(indices(i).idx,:);
seasonalSoildata(i).IC3.t = soildata.IC3.t(indices(i).idx,:);
end

save seasonalSoildata.mat seasonalSoildata 
save growingseasontimes.mat starts stops




