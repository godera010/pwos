% Written by Juuso Tuure (juuso.tuure@helsinki.fi) 2025
% This script:
% Plots the weather parameters over the measurement period.
% Calculates seasonal statistics for weather parameters and outputs them in a spreadsheet table.

close all
clear
clc

load growingseasontimes.mat
load weatherData.mat

%-----------%Calculate reference evapotranspiration ET0
%Constants and variables for calculating Evapotranspiration (Penman-Monteith FAO-56 Method and Fick's law)
%Constants:
h = 0.01; %Height to extrapolate wind speed to, m
z = 2; %Wind measurement height, m
albedo = 0.16; %albedo, dimensionless ad hoc
latitude = (-3)+(25/60); %Latitude,°
Gsc = 0.0820; %Solar constant, MJ/m^2/min
altitude = 1056; %Altitude, m
sigma = 4.903*10^-9;% Stefan-Boltzmann constant, MJ/K^4/m2/d

%Variables:
%dynamic parameters

% Daily values for calculating ET0
RHD = dailyMean(weatherData(6).data(:,2),30);
pressD = dailyMean(((weatherData(6).data(:,8)/1000)*100),30); %Air pressure, kPa
RsD = dailyMean(weatherData(6).data(:,7),30);%Measured short-wave radiation, W/m^2
uD = dailyMean(weatherData(6).data(:,4),30);%Wind speed, m/s (At z =  2 m heihgt)
Tmin = dailyMin(weatherData(6).data(:,1),30);
Tmax = dailyMax(weatherData(6).data(:,1),30);
TairD = (Tmin + Tmax)/2;
TairMeanD = dailyMean(weatherData(6).data(:,1),30);
esD = satVapPressure(TairD); %Saturated vapor pressure, kPa
eaD = actVapPre(RHD,esD); %Air vapor pressure kPa
PD = dailySum(weatherData(6).data(:,3),30);
dailyTimes = dateshift(weatherData(6).timeDatetime, 'start', 'day');
dailyTimes = unique(dailyTimes);
numberOfDay = day(dailyTimes,'dayofyear');


%ea,es,Tair,RH,alpha,Rs,time,latitude,Gsc,altitude,sigma,Tmax,Tmin,press,uz
dailyET = penmanMonteith(eaD,esD,TairD,RHD,albedo,...
    RsD,numberOfDay,latitude,Gsc,altitude,sigma,...
    Tmax,Tmin,pressD,uD);

%% Growing Season Data Processing
growingSeasons = {starts(1), stops(1); starts(2), stops(2); starts(3), stops(3);
    starts(4), stops(4); starts(5), stops(5); starts(6), stops(6)};

for i = 1:numel(growingSeasons) / 2
    % Indices for each growing season
    indicesD(i).idx = (dailyTimes >= growingSeasons{i, 1} & dailyTimes < growingSeasons{i, 2});
    % Daily and total ET0 for each season
    ET0(i).daily = unique(dailyET(indicesD(i).idx));
    ET0(i).time = unique(dailyTimes(indicesD(i).idx));
    ET0(i).total = sum(ET0(i).daily);

    % Weather stats for each season
    seasonData = weatherData(i).data;
    weatherStats(i).meanTemp = mean(seasonData(:, 1));
    weatherStats(i).maxTemp = max(seasonData(:, 1));
    weatherStats(i).minTemp = min(seasonData(:, 1));
    weatherStats(i).meanRH = mean(seasonData(:, 2));
    weatherStats(i).maxRH = max(seasonData(:, 2));
    weatherStats(i).minRH = min(seasonData(:, 2));
    weatherStats(i).totalP = sum(seasonData(:, 3));
    weatherStats(i).daysP = nnz(dailySum(seasonData(:, 3), 30));
    weatherStats(i).totalET0 = sum(ET0(i).daily);
end

% Calculate monthly averages for weather using time tables
TT = timetable(weatherData(6).timeDatetime, weatherData(6).data(:, 1),...
    weatherData(6).data(:, 2),weatherData(6).data(:, 3),'VariableNames', {'T', 'RH', 'P'});

TT_monthly = struct();
TT_monthly.mean = retime(TT(:, {'T', 'RH'}), 'monthly', 'mean');
TT_monthly.max = retime(TT(:, {'T', 'RH'}), 'monthly', 'max');
TT_monthly.max.Properties.VariableNames = {'Tmax','RHmax'};

TT_monthly.min = retime(TT(:, {'T', 'RH'}), 'monthly', 'min');
TT_monthly.min.Properties.VariableNames = {'Tmin','RHmin'};
TT_monthly.sum = retime(TT(:, {'P'}), 'monthly', 'sum');
TT_monthly.ET0 = retime(timetable(dailyTimes, dailyET, 'VariableNames', {'ET0'}), 'monthly', 'sum');

% Combine Monthly Tables
TT_combined = [TT_monthly.mean, TT_monthly.max, TT_monthly.min, TT_monthly.sum, TT_monthly.ET0];

%% Make the table
T = timetable2table(TT_combined);
T.Time = datetime(T.Time, 'Format', 'MM/yyyy');
newOrder = {'Time','T','Tmax','Tmin','RH','RHmin','RHmax','P','ET0'};
T = T(:, newOrder);
T.Properties.VariableNames{'Time'} = 'Month';
writetable(T, 'monthlyweather.xlsx', 'Sheet', 1);

% Seasonal results
seasonLengths = days(stops - starts);

seasons = {'LR2019';'SR2019';'LR2020';'SR2020';'LR2021';'wholePeriod'};
weatherT = struct2table(weatherStats);
weatherT = addvars(weatherT,seasons, starts, stops, seasonLengths, 'Before','meanTemp');
varNames2 = {'GrowingPeriod','Planting','Harvest','PeriodLength','T','Tmax','Tmin','RH','RHmax','RHmin','P','Pdays','ET0'};
weatherT.Properties.VariableNames = varNames2;

% Write as speradsheet table for article 
writetable(weatherT,'seasonalweather.xlsx','Sheet',1, 'Range','A1');

%% Plotting parameters
color1 = [0, 0.4470, 0.7410];
color2 = [0.8500, 0.3250, 0.0980];
color3 = [0.9290, 0.6940, 0.1250];
color4 = [0.4940, 0.1840, 0.5560];
color5 = [0.4660, 0.6740, 0.1880];
color6 = [0.3010, 0.7450, 0.9330];
color7 = [0.6350, 0.0780, 0.1840];
colors = {color1,color2,color3,color4,color5,color6,color7};

% Monthly ticks for plotting

[y,m,d] = ymd(weatherData(6).timeDatetime(1)); %get year (y), month (m) and day (d)
startDate = datetime(y,m,1); %Set first day of first month as the start date

[y,m,d] = ymd(weatherData(6).timeDatetime(end));
endDate = datetime(y,m+1,1); %Set the first day of next to last month as the end date
monthDate = startDate:calmonths(1):endDate;
monthDate = monthDate(2:2:end);

%% Plot figures
figure
subplot(2,1,1)
hold on
plot(dailyTimes, TairMeanD ,'color',color1)
plot(dailyTimes, RHD,'color',color2)
ax = gca;
set(ax(1),'ylim', [0,100])
set(ax(1),'YColor','k');
ylabel(ax(1),(['T (' char(176) 'C) and RH (%)']))
ylim([0 100])
xlim([dailyTimes(1) dailyTimes(end)])
ax.XTick = monthDate;
xtickangle(45)
legend('T_{air}','RH','Position',[0.23 0.71 0.12 0.07])
legend boxoff
text(dailyTimes(1)+10,93,'(a)')
set(gca,'FontSize',8,'FontName', 'Times New Roman');
box on

subplot(2,1,2)
hold on
plot(dailyTimes, dailyET,'color',color3)
ax = gca;
set(ax(1),'YColor','k');
ylabel(ax(1),('ET_{0} (mm)'))
ylim([0 9])
xlim([dailyTimes(1) dailyTimes(end)])
ax.XTick = monthDate;

yyaxis right
bar(dailyTimes,PD,'FaceColor','k','EdgeColor','k')
set(ax(1),'YColor','k');
ylabel(ax(1),('P (mm)'))
xlim([dailyTimes(1) dailyTimes(end)])
ylim([0 50])
ax.XTick = monthDate;

xtickangle(45)
legend('ET_{0}','P','Position',[0.23 0.36 0.12 0.07])
legend boxoff
text(dailyTimes(1)+10,47,'(b)')
set(gca,'FontSize',8,'FontName', 'Times New Roman');
box on

save weatherStats.mat weatherStats


