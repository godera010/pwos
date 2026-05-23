% Written by Juuso Tuure (juuso.tuure@helsinki.fi) 2025
% This script plots the long term seasonal weather statistics 
% and compares them to the study period's seasons.
close all; close all hidden; clear; clc;

% Load the long term weather data 
load weatherDataLongterm.mat

%Calcuate the daily sum of P for later averaging
reshapeT = TT(:,{'P'});
TT2 = retime(reshapeT,'daily','sum'); %Calculate daily sum for P

longRainMonths = 3:8; % March to August
shortRainMonths = [1, 2, 10, 11, 12]; % Jan, Feb, Oct, Nov, Dec

longrains = TT(ismember(month(TT.TIME), longRainMonths), :);
shortrains = TT(ismember(month(TT.TIME), shortRainMonths), :);

%Create a grouping variables
longrains.Month=month(longrains.TIME); % add month and day
longrains.Day=day(longrains.TIME); % individually to table
shortrains.Month=month(shortrains.TIME); % add month and day
shortrains.Day=day(shortrains.TIME); % individually to table

%For long rains
longrainsMeansT = groupsummary(longrains,{'Month','Day'},{'mean','std',@(x)std(x)/sqrt(numel(x))},'T');
longrainsMeansT.Properties.VariableNames(6) = {'ste_T'};
longrainsMeansRH = groupsummary(longrains,{'Month','Day'},{'mean','std',@(x)std(x)/sqrt(numel(x))},'RH');
longrainsMeansRH.Properties.VariableNames(6) = {'ste_RH'};

%For short rains
shortrainsMeansT = groupsummary(shortrains,{'Month','Day'},{'mean','std',@(x)std(x)/sqrt(numel(x))},'T');
shortrainsMeansT.Properties.VariableNames(6) = {'ste_T'};
shortrainsMeansRH = groupsummary(shortrains,{'Month','Day'},{'mean','std',@(x)std(x)/sqrt(numel(x))},'RH');
shortrainsMeansRH.Properties.VariableNames(6) = {'ste_RH'};

%For long rains
longrainsP = TT2(ismember(month(TT2.TIME), longRainMonths), :);  %3 to 8 is March to August
longrainsP.Month=month(longrainsP.TIME); % add month and day
longrainsP.Day=day(longrainsP.TIME); % individually to table
longrainsMeansP = groupsummary(longrainsP,{'Month','Day'},{'mean','std',@(x)std(x)/sqrt(numel(x))},'P');
longrainsMeansP.Properties.VariableNames(6) = {'ste_P'};

Year = zeros(length(longrainsMeansP.Month),1)+2021;
timeLongrainsMeansP = datetime(Year,longrainsMeansP.Month,longrainsMeansP.Day);

%Create a running number for the long rains season.
RunningDayNumber = (1:length(Year))';


longrainsMeansP = addvars(longrainsMeansP,Year,'Before','GroupCount');
longrainsMeansP = addvars(longrainsMeansP,RunningDayNumber,'Before','GroupCount');

longrainsMeansT = addvars(longrainsMeansT,Year,'Before','GroupCount');
longrainsMeansT = addvars(longrainsMeansT,RunningDayNumber,'Before','GroupCount');

longrainsMeansRH = addvars(longrainsMeansRH,Year,'Before','GroupCount');
longrainsMeansRH = addvars(longrainsMeansRH,RunningDayNumber,'Before','GroupCount');
%%
%For short rains
shortrainsP = TT2(ismember(month(TT2.TIME),shortRainMonths), :);  %3 to 8 is March to August
shortrainsP.Month=month(shortrainsP.TIME); % add month and day
shortrainsP.Day=day(shortrainsP.TIME); % individually to table
shortrainsMeansP = groupsummary(shortrainsP,{'Month','Day'},{'mean','std',@(x)std(x)/sqrt(numel(x))},'P');
shortrainsMeansP.Properties.VariableNames(6) = {'ste_P'};

%Create a short rains time array here
years1= zeros(60,1)+2021;
years2=zeros(92,1)+2020;
Year =[years1;years2];
shortrainsMeansP = addvars(shortrainsMeansP,Year,'Before','GroupCount');

%Create a running day number for the short rains season.
DateNumber = datenum(shortrainsMeansP.Year,shortrainsMeansP.Month,shortrainsMeansP.Day);
shortrainsMeansP = addvars(shortrainsMeansP,DateNumber,'Before','GroupCount');
shortrainsMeansP = sortrows(shortrainsMeansP,'DateNumber');


RunningDayNumber = (1:length(Year))';
shortrainsMeansP = addvars(shortrainsMeansP,RunningDayNumber,'Before','GroupCount');

shortrainsMeansT = addvars(shortrainsMeansT,Year,'Before','GroupCount');
shortrainsMeansT = addvars(shortrainsMeansT,RunningDayNumber,'Before','GroupCount');

shortrainsMeansRH = addvars(shortrainsMeansRH,Year,'Before','GroupCount');
shortrainsMeansRH = addvars(shortrainsMeansRH,RunningDayNumber,'Before','GroupCount');


shortrainsMeansP(end,:) = [];
shortrainsMeansRH(end,:) = [];
shortrainsMeansT(end,:) = [];

%Dates for framing the data
seasons = {
    {'gs1', [2019,3,1], [2019,9,1]},   % Long Rains 2019
    {'gs2', [2019,10,1], [2020,2,29]}, % Short Rains 2019/20
    {'gs3', [2020,3,1], [2020,9,1]},   % Long Rains 2020
    {'gs4', [2020,10,1], [2021,2,29]}, % Short Rains 2020/21
    {'gs5', [2021,3,1], [2021,9,1]}    % Long Rains 2021
    };

weather_datenum = datenum(TT.TIME);

%% Retrieve the data according to the timestamps
for i = 1:5
    
    idx = weather_datenum >= datenum(seasons{i, 1}{1, 2}) & weather_datenum < datenum(seasons{i, 1}{1, 3});
    
    % Extract selected records
    temp = TT.T(idx,:);
    rh = TT.RH(idx,:);
    p = TT.P(idx,:);
    Time = datetime(weather_datenum(idx,:),'ConvertFrom','datenum');
    
    seasonsData(i).TT = timetable(Time,temp,rh,p,...
        'VariableNames',{'T','RH','P'});
    
    reshapeTT = seasonsData(i).TT(:,{'P'});
    TTP = retime(reshapeTT,'daily','sum');
    seasonsData(i).TT = retime(seasonsData(i).TT,'daily','mean');
    seasonsData(i).TT= removevars(seasonsData(i).TT,'P');
    seasonsData(i).TT = addvars(seasonsData(i).TT,TTP.P,'After','RH');
    RunningDayNumber = (1:length(seasonsData(i).TT.Time))';
    seasonsData(i).TT = addvars(seasonsData(i).TT, RunningDayNumber,'Before','T');
    
    seasonsData(i).TT.Properties.VariableNames{4} = 'P';  %% Rename the P variable
    
    clear reshapeTT TTP RunningDayNumber temp rh p Time idx
end

%% Annual mean values
annualP =retime(reshapeT , 'yearly', 'sum');
nYears = years(reshapeT.TIME(end) - reshapeT.TIME(1));
meanAnnualP = round(sum(annualP.P)/nYears,0); % Precipitation
annualTT = retime(TT, 'yearly', 'mean');
meanAnnualT = round(sum(annualTT.T)/nYears,1); % Temperature 

%% Colors and fonts for plotting
color1 = [0 0.4470 0.7410];
color2 = [0.8500 0.3250 0.0980];
color3 = [0.9290 0.6940 0.1250];
color4 = 'black';
linewidthnumber = 2;

%Specify font and fontsize
fontsize1 = 14;
fontstyle = 'Times';

%% Long rains P
bigFigure
subplot(2,2,1)
hold on
plot(seasonsData(1).TT.Time, cumsum(seasonsData(1).TT.P),'color',color1,'LineWidth',linewidthnumber);
plot(seasonsData(1).TT.Time, cumsum(seasonsData(3).TT.P),'color',color2,'LineWidth',linewidthnumber);
plot(seasonsData(1).TT.Time, cumsum(seasonsData(5).TT.P),'color',color3,'LineWidth',linewidthnumber);
plot(seasonsData(1).TT.Time, cumsum(longrainsMeansP.mean_P),'color',color4,'LineStyle','--','LineWidth',linewidthnumber);
lgd = legend('LR2019','LR2020','LR2021','Mean','Position',[0.2 0.805 0.096 0.10],'Box', 'off');
lgd.NumColumns = 2;
datetick('x','dd/mmm','keepticks')
set(gca,'xticklabel',[])
ylabel('P (mm)')
ylim([0 500])
text1 = text(8,475,'(a)');
text1.FontSize = 20;
text1.FontName = fontstyle;
set(gca,'FontSize',fontsize1,'FontName',fontstyle)
box on

% Short rains P
subplot(2,2,2)
hold on
plot(seasonsData(2).TT.Time, cumsum(seasonsData(2).TT.P),'color',color1,'LineWidth',linewidthnumber);
plot(seasonsData(2).TT.Time, cumsum(seasonsData(4).TT.P),'color',color2,'LineWidth',linewidthnumber);
plot(seasonsData(2).TT.Time,cumsum(shortrainsMeansP.mean_P),'color',color4,'LineStyle','--','LineWidth',linewidthnumber)
lgd = legend('SR2019','SR2020','Mean', 'Position',[0.555 0.805 0.096 0.10],'Box','off');
xticks(datetime('01-Oct-2019') : calmonths(1) : datetime('01-Mar-2020'))
datetick('x','dd/mmm','keeplimits','keepticks')
set(gca,'xticklabel',[])
set(gca,'yticklabel',[])
ylim([0 500])
text3 = text(8,475,'(b)');
text3.FontSize = 20;
text3.FontName = fontstyle;
set(gca,'FontSize',fontsize1,'FontName',fontstyle)
box on

% Long rains T and RH
subplot(2,2,3)
hold on
plot(seasonsData(1).TT.Time, seasonsData(1).TT.T,'color',color1,'LineWidth',linewidthnumber);
plot(seasonsData(1).TT.Time, seasonsData(3).TT.T,'color',color2,'LineWidth',linewidthnumber);
plot(seasonsData(1).TT.Time, seasonsData(5).TT  .T,'color',color3,'LineWidth',linewidthnumber);
plot(seasonsData(1).TT.Time,longrainsMeansT.mean_T,'color',color4,'LineStyle','--','LineWidth',linewidthnumber)
lgd = legend('LR2019','LR2020','LR2021','Mean','Position',[0.196 0.415 0.096 0.10],'Box','off');
lgd.NumColumns = 2;
ylim([18 28])
datetick('x','dd/mmm','keepticks')
xtickangle(45)
xlabel('dd/mmm')
ylabel(['T (' char(176) 'C)'])
text2 = text(8,27.5,'(c)');
text2.FontSize = 20;
text2.FontName = fontstyle;
set(gca,'FontSize',fontsize1,'FontName',fontstyle)
box on

% Short rains T and RH
subplot(2,2,4)
hold on
plot(seasonsData(2).TT.Time, seasonsData(2).TT.T,'color',color1,'LineWidth',linewidthnumber);
plot(seasonsData(2).TT.Time, seasonsData(4).TT  .T,'color',color2,'LineWidth',linewidthnumber);
plot(seasonsData(2).TT.Time,shortrainsMeansT.mean_T,'color',color4,'LineStyle','--','LineWidth',linewidthnumber)
lgd = legend('SR2019','SR2020','Mean','Position',[0.55 0.415 0.096 0.10],'Box','off');
ylim([18 28])
xticks(datetime('01-Oct-2019') : calmonths(1) : datetime('01-Mar-2020'))
datetick('x','dd/mmm','keeplimits','keepticks')
xtickangle(45)
xlabel('dd/mmm')
set(gca,'yticklabel',[])
text4 = text(8,27.5,'(d)');
text4.FontSize = 20;
text4.FontName = fontstyle;
set(gca,'FontSize',fontsize1,'FontName',fontstyle)
box on

% Adjusting positions of subplots
subplot(2,2,1)
set(gca,'Position', [0.1 0.55 0.35 0.35]) % Adjust the first subplot position
subplot(2,2,2)
set(gca,'Position', [0.5 0.55 0.35 0.35]) % Adjust the second subplot position (closer to the first)
subplot(2,2,3)
set(gca,'Position', [0.1 0.16 0.35 0.35]) % Adjust the third subplot position
subplot(2,2,4)
set(gca,'Position', [0.5 0.16 0.35 0.35]) % Adjust the fourth subplot position (closer to the third)

% Save figure
print('weatherLongTermComparison', '-dpng', '-r600'); %<-Save as PNG with 600 DPI