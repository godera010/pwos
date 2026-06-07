% Written by Juuso Tuure (juuso.tuure@helsinki.fi) 2025
% This script calculates the WP parameters and plots a timeseries figure of P, ETc and SWC.
% Saves data for tables and 
close all;
clear;
clc;

% Load data files
load seasonalSoildata.mat
load growingseasontimes.mat
load weatherData.mat
load yieldDataWue.mat
load weatherStats.mat

% Decagon 5TM sensors measure 5 cm in both directions from the node, thus
% when haveing sensors buried at 10 cm and 20 cm nodes, the height of the
% measured profile is 250 mm. For simplicity, we round it to 30 cm
profileDepth = 300; % mm
gamma = 0.48; %Ratio of precipitation entering the soil from (Räsänen et al., 2020)

%The incipent point of stomatal closure (swc*)
swcStar = (0.28*0.43)*profileDepth;

%This is the permanent wilting point determined by Tuure in the lab.
pwp = 0.10*profileDepth; % Permanent wilting point at 15000 cmH2O suction
fc = 0.20*profileDepth; % Field capacity at 100 cmH2O suction

%To compute the soil water storage (SWC) in mm We average the
% soil volumetric water content readings of the two sensors and multiply it
% with the height of the measured soil profile.

fields = fieldnames(seasonalSoildata(2:end,1));
fields = fields(2:end,1); %Remove the time arrays

% Convert soil volumetric water content (theta) to soil water storage (mm)
% in the whole profile and calculate the water use
for f = 1:numel(fields)
    for i = 1:numel(seasonalSoildata)
        swc(i).(fields{f}) = mean((seasonalSoildata(i).(fields{f}).theta),2)*profileDepth;
        WU(i).(fields{f}) = swc(i).(fields{f})(1) -...
            swc(i).(fields{f})(end)...
            + weatherStats(i).totalP;
    end
end

% Get rid of unnecessary plots data


WU(:,6) = []; % This removes the whole season data from the structure.



%%
%-----------%Calculate reference evapotranspiration, ET0
%Constants and variables for calculating Evapotranspiration (Penman-Monteith FAO-56 Method and Fick's law)
%Constants:
z = 2; %Wind measurement height, m
albedo = 0.16; %albedo, dimensionless
latitude = (-3)+(25/60); %Latitude,°
Gsc = 0.0820; %Solar constant, MJ/m^2/min
altitude = 1056; %Altitude, m
sigma = 4.903*10^-9;% Stefan-Boltzmann constant, MJ/K^4/m2/d

% Dynamic parameters:
for i = 1:numel(weatherData)
    wData(i).Tair = weatherData(i).data(:,1); %Temperature, °C
    wData(i).RH = weatherData(i).data(:,2); % Relative humidity,%
    wData(i).press = (weatherData(i).data(:,8)/1000)*100; %Air pressure, kPa
    wData(i).Rs = weatherData(i).data(:,7); %Measured short-wave radiation, W/m^2
    wData(i).uz =  weatherData(i).data(:,4); %Wind speed, m/s (At z =  2 m heihgt)
    wData(i).P = weatherData(i).data(:,3); %Precipitation, mm
    wData(i).time = weatherData(i).time; %Time as serial date number
    wData(i).timeDatetime = weatherData(i).timeDatetime;
    
    % Daily values
    wDataD(i).RH = dailyMean(wData(i).RH,30);
    wDataD(i).press = dailyMean(wData(i).press,30);
    wDataD(i).Rs = dailyMean(wData(i).Rs,30);
    wDataD(i).uD = dailyMean(wData(i).uz,30);
    wDataD(i).Tmin = dailyMin(wData(i).Tair,30);
    wDataD(i).Tmax = dailyMax(wData(i).Tair,30);
    wDataD(i).TairMean = (wDataD(i).Tmin  + wDataD(i).Tmax)/2;
    wDataD(i).Tair = dailyMean(wData(i).Tair,30);
    wDataD(i).es = satVapPressure(wDataD(i).TairMean); %Saturated vapor pressure, kPa
    wDataD(i).ea = actVapPre(wDataD(i).RH,wDataD(i).es); %Air vapor pressure kPa
    wDataD(i).P = dailySum(wData(i).P,30);
    wDataD(i).time = dailyMin(wData(i).time,30);
    wDataD(i).timeDateTime = datetime(wDataD(i).time,'ConvertFrom', 'datenum');
    wDataD(i).numberOfDay = day(wDataD(i).timeDateTime,'dayofyear');
    
    % Daily ET0
    wDataD(i).ET =...
        penmanMonteith(wDataD(i).ea,...
        wDataD(i).es,wDataD(i).TairMean,...
        wDataD(i).RH,albedo,wDataD(i).Rs,wDataD(i).numberOfDay,...
        latitude,Gsc,altitude,sigma,wDataD(i).Tmax,wDataD(i).Tmin,...
        wDataD(i).press,wDataD(i).uD); %mm
    
end

%Find the values for the seasons calculate with 30 min timestep.
for f = 1:numel(fields)
    for  i = 1:numel(weatherData)
        swcD(i).(fields{f}) = mean((dailyMean(seasonalSoildata(i).(fields{f}).theta,30)),2)*profileDepth;
        deltaSwcD(i).(fields{f}) = [0; diff(swcD(i).(fields{f}))];
        ETcD(i).(fields{f}) = wDataD(i).P*gamma + deltaSwcD(i).(fields{f});
        ETcD(i).(fields{f}) = max(ETcD(i).(fields{f}),0);
        WUFromETcD(i).(fields{f}) = sum(ETcD(i).(fields{f}));
    end
end
%%

% Get rid of unnecessary plot data
WUFromETcD(:,numel(weatherData)) = []; % This removes the "whole season" data from the structure.

fields2 = fieldnames(WUFromETcD);
% Calculate the WP as kg/m^3. Therefore, factor 0.1 is used
%kg/ha/mm*0.1 -> kg/m3.
for f = 1:numel(fields2)
    for i = 1:numel(weatherData)-1
        WP_ETcD_maizegrain(i).(fields2{f}) =...
            (maizeData1.extrapolatedGrainMass(i).(fields2{f})./WUFromETcD(i).(fields2{f}))*0.1;
        WP_ETcD_totalbiomass(i).(fields2{f}) =...
            (maizeData1.totalBiomass(i).(fields2{f})./WUFromETcD(i).(fields2{f}))*0.1;
        WP_ETcD_totalgrain(i).(fields2{f}) =...
            (maizeData1.totalGrainMass(i).(fields2{f})./WUFromETcD(i).(fields2{f}))*0.1;
    end
end

% ETc = deltaS + P,
% where:
%  - ETc is the actual evapotranspiration per crop
%  - P is precipitaiton
%  - deltaS is the change in soil water storage

% Actual daily evapotranspiration is calculated as,
% ETc = Kc*ET0,
% where Kc is a crop coefficient calculated for each week accordingly,
% Kc = ETc/ET0.


%% Weekly calculation of above
Time = wData(6).timeDatetime;
P = wData(6).P;
TT_P = timetable(Time,P);

Time = wDataD(6).timeDateTime;
TT_ET0 = timetable(Time,wDataD(6).ET);

startTime = TT_P.Time(1);
stopTime = TT_P.Time(end);
time = (startTime:days(7):stopTime)';


% Re-time the data
TT2_P = retime(TT_P,time,'sum');
TT2_ET0 = retime(TT_ET0,time,'sum');

for f = 1:numel(fields2)
    TT_swc(1).(fields2{f}) = timetable(wData(6).timeDatetime,swc(6).(fields2{f}));
    TT2(1).(fields2{f}) = retime(TT_swc.(fields2{f}),time);
    TT2.(fields2{f}).deltaSwc = [0; diff(TT2.(fields2{f}).Var1)];
    TT2.(fields2{f}).P = TT2_P.P;
    
    TT2.(fields2{f}).ETc = TT2.(fields2{f}).deltaSwc + gamma*TT2_P.P;
    TT2.(fields2{f}).ETc = max(TT2.(fields2{f}).ETc,0); % Convert negative values to 0
    TT2.(fields2{f}).ET0 = TT2_ET0.Var1;
    TT2.(fields2{f}).Kc = TT2.(fields2{f}).ETc./TT2.(fields2{f}).ET0;
    
    % Make a time array for the weekly crop coefficient
    TT3(1).(fields2{f}) = timetable(TT2.(fields2{f}).Time,TT2.(fields2{f}).Kc);
    TT3_D(1).(fields2{f}) = retime(TT3.(fields2{f}), Time,'previous');
    TT3_D.(fields2{f}).Properties.VariableNames = {'Kc'};
    TT3_D.(fields2{f}).ET0 = wDataD(6).ET;
    TT3_D.(fields2{f}).ETc = TT3_D.(fields2{f}).Kc.*TT3_D.(fields2{f}).ET0;
    TT3_D.(fields2{f}).P =  wDataD(6).P;
    
    % Find the indices for each growing season and frame the data
    indicesgs(f).idx = (TT3_D.IC1.Time >= starts(f) & TT3_D.IC1.Time< stops(f));
end

% Frame the daily ETc, ET0, Kc and P for each growing season.
for i = 1:numel(indicesgs)
    for f = 1:numel(fields2)
        % Extract selected records
        TT4(i).(fields2{f}) = TT3_D.(fields2{f})(indicesgs(i).idx,:);
        
        % And calculate the sums of the above:
        WUKc(i).(fields2{f}) =  sum(TT4(i).(fields2{f}).ETc);
    end
end

% Now calculate WUs and WPs with these data
for f = 1:numel(fields2)
    for i = 1:numel(weatherData)-1
        WPKc_maizegrain(i).(fields2{f}) =...
            (maizeData1.extrapolatedGrainMass(i).(fields2{f})./WUKc(i).(fields2{f}))*0.1;
        WPKc_totalbiomass(i).(fields2{f}) =...
            (maizeData1.totalBiomass(i).(fields2{f})./WUKc(i).(fields2{f}))*0.1;
        WPKc_totalgrain(i).(fields2{f}) =...
            (maizeData1.totalGrainMass(i).(fields2{f})./WUKc(i).(fields2{f}))*0.1;
    end
end


%% Calculate the averages for solecrop and intercrop
intercropETC_mean = mean([TT4(6).IC1.ETc,TT4(6).IC2.ETc,...
    TT4(6).IC3.ETc],2);
solecropETC_mean = mean([TT4(6).SC1.ETc,TT4(6).SC2.ETc,...
    TT4(6).SC3.ETc],2);

intercropETC_ste = (std([TT4(6).IC1.ETc,TT4(6).IC2.ETc,...
    TT4(6).IC3.ETc],0,2))/sqrt(3);

solecropETC_ste = (std([TT4(6).SC1.ETc,TT4(6).SC2.ETc,...
    TT4(6).SC3.ETc],0,2))./sqrt(3);

intercropKc_mean = mean([TT4(6).IC1.Kc,TT4(6).IC2.Kc,...
    TT4(6).IC3.Kc],2);
solecropKc_mean = mean([TT4(6).SC1.Kc,TT4(6).SC2.Kc,...
    TT4(6).SC3.Kc],2);

intercropKc_ste = (std([TT4(6).IC1.Kc,TT4(6).IC2.Kc,...
    TT4(6).IC3.Kc],0,2))/sqrt(3);
solecropKc_ste = (std([TT4(6).SC1.Kc,TT4(6).SC2.Kc,...
    TT4(6).SC3.Kc],0,2))/sqrt(3);

intercropSwc_mean = mean([swcD(6).IC1,swcD(6).IC2,swcD(6).IC3],2);
solecropSwc_mean = mean([swcD(6).SC1,swcD(6).SC2,swcD(6).SC3],2);

intercropSwc_ste = (std([swcD(6).IC1,swcD(6).IC2,swcD(6).IC3],0,2))/sqrt(3);
solecropSwc_ste = (std([swcD(6).SC1,swcD(6).SC2,swcD(6).SC3],0,2))/sqrt(3);

%% Calculate when S < S*

startsdnum = datenum(starts(1:5)); % Exclude the whole period start
stopsdnum = datenum(stops(1:5));  % Exclude the whole period stop

for i = 1:numel(weatherData)-1
    % Calculate row-wise mean for IC fields
    resultsS(i).S_IC = dailyMean(mean([swc(i).IC1, swc(i).IC2, swc(i).IC3], 2),30);
    % Calculate row-wise mean for SC fields
    resultsS(i).S_SC = dailyMean(mean([swc(i).SC1, swc(i).SC2, swc(i).SC3], 2),30);
    
    resultsS(i).S_IC_periodLength = periodLength(resultsS(i).S_IC, swcStar);
    resultsS(i).S_IC_maxPeriodLength = max(resultsS(i).S_IC_periodLength);
    resultsS(i).S_IC_permanentWaterStress = permanentWaterStress(resultsS(i).S_IC, swcStar, wDataD(i).time, starts(i));
    resultsS(i).S_IC_totalDaysAbove = totalDaysAbove(resultsS(i).S_IC, swcStar);
    
    resultsS(i).S_SC_periodLength = periodLength(resultsS(i).S_SC, swcStar);
    resultsS(i).S_SC_maxPeriodLength = max(resultsS(i).S_SC_periodLength);
    resultsS(i).S_SC_permanentWaterStress = permanentWaterStress(resultsS(i).S_SC, swcStar, wDataD(i).time, starts(i));
    resultsS(i).S_SC_totalDaysAbove = totalDaysAbove(resultsS(i).S_SC, swcStar);
end

%% Write the results in a table
datarowNames = {'LR2019';'SR2019';'LR2020';'SR2020';'LR2021'};
variabeleNames = {'SC_maxPeriodLength', 'IC_maxPeriodLength', ...
    'SC_permanentWaterStress', 'IC_permanentWaterStress', ...
    'SC_totalDaysAbove', 'IC_totalDaysAbove'};

fields = {'S_SC_maxPeriodLength', 'S_IC_maxPeriodLength', ...
    'S_SC_permanentWaterStress', 'S_IC_permanentWaterStress', ...
    'S_SC_totalDaysAbove', 'S_IC_totalDaysAbove'};

% Preallocate dataTable
dataTable = zeros(numel(startsdnum), numel(fields));

% Populate dataTable dynamically
for i = 1:numel(startsdnum)
    for j = 1:numel(fields)
        dataTable(i, j) = resultsS(i).(fields{j});
    end
end

TS = array2table(dataTable, 'RowNames', datarowNames , 'VariableNames', variabeleNames);

%% Plot the figure
symax = 100;
pymax = 100;
textXdivider = 2.00015;
texty = 9.5;
ang = 45;
opacity = 0.6; % 40 percent visible = mainly transparent
opacity2 = 0.7;
my_color = [0 0.1 0];
my_color2 = [0.9 0.7 0.7];


tagtextsize = 10;

%pre-allocate and re-name variables (for simplicity)
[h,w] = size(wDataD(6).time);
daysArray = zeros(h,1);
timeArray = wDataD(6).time;

% Define the daysArray (Days after sowing = DAS) for each growing season
%over the whole measurement period
 for i = 1:h
     for j = 1:5
         if timeArray(i,1) >= startsdnum(j) && timeArray(i,1) <= stopsdnum(j)
             daysArray(i,1) = daysArray(i-1,1)+1;
         end
     end
 end

%Replace 0 wiht 8888 execpt for the 0 before 1
daysArray(daysArray == 0) = 8888;
daysArray(find(daysArray ==1)-1) = 0;

desiredTicks = [0;30;60;90;120;150];
l = numel(desiredTicks);
result2 = [];


for i = 1:l
    result = find(desiredTicks(i,1)==daysArray);
    result2 = [result2;result];
end

result2 = sort(result2);
% Sub-plot positions

left1 = 0.1;
bottom1 = 0.59;
width1 = 0.39;
height1 = 0.31;

left2 = 0.55;
bottom2 = 0.59;
width2 = 0.39;
height2 = 0.31;

left3 = 0.1;
bottom3 = 0.09;
width3 = 0.39;
height3 = 0.31;

left4 = 0.55;
bottom4 = 0.09;
width4 = 0.39;
height4 = 0.31;

f= bigFigure('wide');

subplot(2,2,1)
set(gca,'Position', [left1 bottom1 width1 height1]); % Adjust the first subplot position

hold on
h1 = bar(wDataD(6).time, wDataD(6).ET); %This is the ET0
h2 = bar(wDataD(6).time, solecropETC_mean,'FaceColor','r'); %This is the ETc for solecrop

ylim([0 14])
yticks(0:2:14)
for i = 1:5
    area([startsdnum(i),stopsdnum(i)],[symax,symax],'FaceColor','g','FaceAlpha',.1,'EdgeAlpha',.1)
    text(((startsdnum(i)+stopsdnum(i))/textXdivider),texty,datarowNames{i},'Color',(1 - opacity * (1 - my_color)),'FontSize',tagtextsize)
end
ylabel('ET (mm)')
xlabel('Date (mmm/yy)')

datetick('x','mmm/yy','keepticks','keeplimits')

hold off


hAx(1) = gca;
hAx(2) = axes('Position',hAx(1).Position,'XAxisLocation','top','YAxisLocation','right','color','none');
hold(hAx(2),'on')
plot(hAx(2),wDataD(6).time,wDataD(6).ET,'color','r','LineStyle','none')
set(hAx(2),'xtick',wDataD(6).time)

%get the ticks of top x-axis
xt = hAx(2).XTick;

%get the ticks of the Y-axis
yt = hAx(1).YTick;
hAx(2).YTick = yt;

%select only desired ticks
xt = xt(result2);
hAx(2).XTick = xt;
hAx(2).YTick = [];

set(hAx(2),'xticklabel',daysArray(result2))
xtickangle(45)
xlim([wDataD(6).time(1),wDataD(6).time(end)])
xlabel('DAS')
lgd1 = legend([h1 h2],{'ET_{0}','ET_{c}'},'Location','northeast','Orientation','horizontal');
set(lgd1,'Box','off')

text(startsdnum(1),7.5,'(a)','FontSize',12)
box off

subplot(2,2,2)
set(gca,'Position', [left2 bottom2 width2 height2]);
hold on
h1 = bar(wDataD(6).time, wDataD(6).ET); %This is the ET0

h2 = bar(wDataD(6).time, intercropETC_mean,'FaceColor','r'); %This is the ETc for intercrop

ylim([0 14])
yticks(0:2:14)
for i = 1:5
    area([startsdnum(i),stopsdnum(i)],[symax,symax],'FaceColor','g','FaceAlpha',.1,'EdgeAlpha',.1)
    text(((startsdnum(i)+stopsdnum(i))/textXdivider),texty,datarowNames{i},'Color',(1 - opacity * (1 - my_color)),'FontSize',tagtextsize)
end

ylabel('ET (mm)')
xlabel('Date (mmm/yy)')
datetick('x','mmm/yy','keepticks','keeplimits')

hold off


hAx(1) = gca;
hAx(2) = axes('Position',hAx(1).Position,'XAxisLocation','top','YAxisLocation','right','color','none');
hold(hAx(2),'on')
plot(hAx(2),wDataD(6).time,wDataD(6).ET,'color','r','LineStyle','none')
set(hAx(2),'xtick',wDataD(6).time)

%get the ticks of top x-axis
xt = hAx(2).XTick;

%get the ticks of the Y-axis
yt = hAx(1).YTick;
hAx(2).YTick = yt;

%select only desired ticks
xt = xt(result2);
hAx(2).XTick = xt;
hAx(2).YTick = [];

set(hAx(2),'xticklabel',daysArray(result2))
xtickangle(45)
xlim([wDataD(6).time(1),wDataD(6).time(end)])
xlabel('DAS')
lgd2 = legend([h1 h2],{'ET_{0}','ET_{c}'},'Location','northeast','Orientation','horizontal');
set(lgd2,'Box','off')
box on

text(startsdnum(1),7.5,'(b)','FontSize',12)

subplot(2,2,3)
set(gca,'Position', [left3 bottom3 width3 height3]);
x1 = wDataD(6).time;
y1 = solecropSwc_mean;
dy1 = solecropSwc_ste;  % standard error
x2 = wDataD(6).time;
y2 = intercropSwc_mean;
dy2 = intercropSwc_ste;  % standard error

hold on
b1 = bar(wDataD(6).time, wDataD(6).P,'FaceColor','black');
fill([x1;flipud(x1)],[y1-dy1;flipud(y1+dy1)],(1 - opacity2 * (1 - my_color2)),'linestyle','none');

h1 = plot(x1,y1,'color','r','LineStyle','-');
l1 = line([x2(1),x2(end)],[swcStar,swcStar],'color','k','LineStyle','--'); %Horizontal line for water stress limit
p1 = line([x2(1),x2(end)],[pwp,pwp],'color','k','LineStyle',':'); %Horizontal line for permanent wilting point
f1 = line([x2(1),x2(end)],[fc,fc],'color','k','LineStyle',':'); %Horizontal line for field capacity

ylabel('P and S (mm)')
xlabel('Date (mmm/yy)')
datetick('x','mmm/yy','keepticks','keeplimits')
box on

for i = 1:5
    area([startsdnum(i),stopsdnum(i)],[symax,symax],'FaceColor','g','FaceAlpha',.1,'EdgeAlpha',.1)
end

ylim([0 80])
yticks(0:10:80)
legend boxoff
text(startsdnum(1),75,'(c)','FontSize',12)

hold off

hAx(1) = gca;
box off
hAx(2) = axes('Position',hAx(1).Position,'XAxisLocation','top','YAxisLocation','right','color','none');
hold(hAx(2),'on')
plot(hAx(2),wDataD(6).time,wDataD(6).ET,'color','r','LineStyle','none')
set(hAx(2),'xtick',wDataD(6).time)

%get the ticks of top x-axis
xt = hAx(2).XTick;

%get the ticks of the Y-axis
yt = hAx(1).YTick;
hAx(2).YTick = yt;

%select only desired ticks
xt = xt(result2);
hAx(2).XTick = xt;
hAx(2).YTick = [];

set(hAx(2),'xticklabel',daysArray(result2))
xtickangle(45)
xlim([wDataD(6).time(1),wDataD(6).time(end)])
xlabel('DAS')
legend([b1 h1 l1], 'P','S','S*','Orientation','Horizontal');

subplot(2,2,4)
set(gca,'Position', [left4 bottom4 width4 height4]);
x2 = wDataD(6).time;
y2 = intercropSwc_mean;
dy2 = intercropSwc_ste;  % standard error

hold on
b2 = bar(wDataD(6).time, wDataD(6).P,'FaceColor','black');
fill([x2;flipud(x2)],[y2-dy2;flipud(y2+dy2)],(1 - opacity2 * (1 - my_color2)),'linestyle','none');
h2 = plot(x2,y2,'color','r','LineStyle','-');
l2 = line([x2(1),x2(end)],[swcStar,swcStar],'color','k','LineStyle','--'); %Horizontal line for water stress limit
p2 = line([x2(1),x2(end)],[pwp,pwp],'color','k','LineStyle',':'); %Horizontal line for permanent wilting point
f2 = line([x2(1),x2(end)],[fc,fc],'color','k','LineStyle',':'); %Horizontal line for field capacity

text(startsdnum(1),75,'(d)','FontSize',12)
ylabel('P and S (mm)')
xlabel('Date (mmm/yy)')
datetick('x','mmm/yy','keepticks','keeplimits')

for i = 1:5
    area([startsdnum(i),stopsdnum(i)],[symax,symax],'FaceColor','g','FaceAlpha',.1,'EdgeAlpha',.1)
end
ylim([0 80])
yticks(0:10:80)

hold off

hAx(1) = gca;
box off
hAx(2) = axes('Position',hAx(1).Position,'XAxisLocation','top','YAxisLocation','right','color','none');
hold(hAx(2),'on')
plot(hAx(2),wDataD(6).time,wDataD(6).ET,'color','r','LineStyle','none')
set(hAx(2),'xtick',wDataD(6).time)

%get the ticks of top x-axis
xt = hAx(2).XTick;

%get the ticks of the Y-axis
yt = hAx(1).YTick;
hAx(2).YTick = yt;

%select only desired ticks
xt = xt(result2);
hAx(2).XTick = xt;
hAx(2).YTick = [];

set(hAx(2),'xticklabel',daysArray(result2))
xtickangle(45)
xlim([wDataD(6).time(1),wDataD(6).time(end)])
xlabel('DAS')
lgd4 = legend([b2 h2 l2], 'P','S','S*','Orientation','Horizontal');
set(lgd4,'Box','off')

print('ET_overlook_smartland', '-dpng', '-r600'); %<-Save as PNG with 600 DPI

% Save the results for later use in statistics tables.
save wuedata.mat...
    WP_ETcD_maizegrain...
    WP_ETcD_totalbiomass...
    WP_ETcD_totalgrain...
    WPKc_maizegrain...
    WPKc_totalbiomass...
    WPKc_totalgrain...
    WUKc %This is bacically ETc