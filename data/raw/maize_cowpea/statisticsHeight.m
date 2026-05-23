% Written by Juuso Tuure (juuso.tuure@helsinki.fi) 2025
% This script calculates descriptive statistics for the height measurements
% Performs ANOVA (Kruskall-Wallis) and plots a figure of the results

close all; clear; clc;

%Load the data for the treatments
load manualMeasurementsResults.mat
load growingseasontimes.mat

fontstyle = 'Times';
fontsize1 = 14;
linewidthnumber = 2;

% %Exclude NaN rows from the end of LR2020
manualObservationDates{3} = manualObservationDates{3}(1:10,:);

% %Exclude NaN rows from the end of SR2019
results.gs2_Maize_Flat_Solecrop_PlantHeight = results.gs2_Maize_Flat_Solecrop_PlantHeight(1:2,:);
results.gs2_Maize_Flat_Intercrop_PlantHeight = results.gs2_Maize_Flat_Intercrop_PlantHeight(1:2,:);
manualObservationDates{2} = manualObservationDates{2}(1:2,:);

% pre-allocate variables 
das = cell(1,numel(manualObservationDates));
harvestDay = cell(1,numel(manualObservationDates));
p = cell(1,numel(manualObservationDates));
stats = cell(1,numel(manualObservationDates));
n = cell(1,numel(manualObservationDates));

meanSCGs = cell(1,numel(manualObservationDates));
meanICGs = cell(1,numel(manualObservationDates));
differenceGs = cell(1,numel(manualObservationDates));
meanCowPeaGs = cell(1,numel(manualObservationDates));

seICGs = cell(1,numel(manualObservationDates));
seSCGs = cell(1,numel(manualObservationDates));
seCpGs = cell(1,numel(manualObservationDates));

textGs = struct(); 

for k = 1:numel(manualObservationDates)
    das{1,k} = days(manualObservationDates{k} - starts(k));
    harvestDay{1,k} = days(stops(k) - starts(k));
    
    % Perform the Kruskall-Wallis test
    [p{k}, stats{k}, n{k}] = performKruskalWallis(results.(['gs', num2str(k), '_Maize_Flat_Solecrop_PlantHeight']), ...
        results.(['gs', num2str(k), '_Maize_Flat_Intercrop_PlantHeight']), ['GS' num2str(k)], ['GS' num2str(k)]);
    
    % Calculate means and differences in means
    meanSCGs{k} = nanmean(results.(['gs', num2str(k), '_Maize_Flat_Solecrop_PlantHeight']), 2);
    meanICGs{k} = nanmean(results.(['gs', num2str(k), '_Maize_Flat_Intercrop_PlantHeight']), 2);
    meanCowPeaGs{k} = nanmean(results.(['gs',num2str(k), '_Cowpea_Flat_Intercrop_PlantHeight']),2);
    
    differenceGs{k} = meanSCGs{k} - meanICGs{k};
    
    % Calculate standard errors
    seICGs{k} = nanstd(results.(['gs', num2str(k), '_Maize_Flat_Intercrop_PlantHeight']), [], 2) ...
        / sqrt(size(results.(['gs', num2str(k), '_Maize_Flat_Intercrop_PlantHeight']), 2));
    
    seSCGs{k} = nanstd(results.(['gs', num2str(k), '_Maize_Flat_Solecrop_PlantHeight']), [], 2) ...
        / sqrt(size(results.(['gs', num2str(k), '_Maize_Flat_Solecrop_PlantHeight']), 2));
    
    seCpGs{k} = nanstd(results.(['gs', num2str(k), '_Cowpea_Flat_Intercrop_PlantHeight']), [], 2) ...
        / sqrt(size(results.(['gs', num2str(k), '_Cowpea_Flat_Intercrop_PlantHeight']), 2));
    
    % Write significance text labels
    for i = 1:length(p{1,k})
        if p{1,k}(i) <= 0.01
            textGs(k).data{i} = [num2str(differenceGs{k}(i),2) '**'];
        elseif p{1,k}(i) <= 0.05
            textGs(k).data{i} = [num2str(differenceGs{k}(i),2) '*'];
        else
            textGs(k).data{i} = num2str(differenceGs{k}(i),2);
        end
    end
    
    % Write the results in tables and print them out as spreadsheet tables
    TT(k).data = timetable(manualObservationDates{k},das{k},meanSCGs{k},seSCGs{k},n{1,k}(:,1),meanICGs{k},seICGs{k},n{1,k}(:,2),differenceGs{k},p{1,k});
    TT(k).data.Properties.DimensionNames{1} = 'ObservationDate';
    TT(k).data.Properties.VariableNames = {'DAS','MeanHeightSC','SeHeightSC','nSC','MeanHeightIC','SeHeightIC','nIC','Difference','pValue'};
    T(k).data = timetable2table(TT(k).data);
    writetable(T(k).data,'HeightStats.xlsx','Sheet',k)
end


%% Plot Figures of the means as a function of observations
f = bigFigure('square');
subplot(2,2,1)
xTextLocation = das{1}-5;
yTextLocation1 = meanSCGs{1}+25;

yTextLocation1(4) = yTextLocation1(4)-5;

hold on
h1 = plot(das{1},meanSCGs{1},'Marker','x','LineWidth',linewidthnumber);
h2 = plot(das{1},meanICGs{1},'Marker','x','LineWidth',linewidthnumber);
h3 = plot(das{1}, meanCowPeaGs{1},'Marker','x','LineWidth',linewidthnumber);
h4 = plot([harvestDay{1} harvestDay{1}],[0 250],'color','k','Linestyle','--','LineWidth',linewidthnumber); %Vertical line at harvest
xlim([0 140])
xticks([0 20 40 60 80 100 harvestDay{1}])
ylim([0 250])
ylabel('Height (cm)')
xlabel('DAS')
text(6,232,'LR2019','FontWeight','bold') 
ax = gca;
set(ax, 'XTickLabel', xticklabels);
t1 = text(xTextLocation,yTextLocation1,textGs(1).data,'FontSize',8);
txt = 'Harvest \rightarrow';
text(harvestDay{1}-25,125,txt)
legend('Maize SC','Maize IC','Cowpea','Position',[0.320 0.850 0.088 0.055]);
legend boxoff
set(gca,'FontName',fontstyle)
box on

subplot(2,2,2)
xTextLocation3 = das{3} - 5;
yTextLocation3 = meanSCGs{3}+25;
xTextLocation3(1) = xTextLocation3(1)- 4;
yTextLocation3(1) = yTextLocation3(1)- 6;
xTextLocation3(2) = xTextLocation3(2)- 4;
yTextLocation3(2) = yTextLocation3(2)- 6;
xTextLocation3(3) = xTextLocation3(3)- 3;
yTextLocation3(3) = yTextLocation3(3)- 5;
xTextLocation3(4) = xTextLocation3(4)- 4;
yTextLocation3(4) = yTextLocation3(4)- 6;
xTextLocation3(5) = xTextLocation3(5)- 4;
yTextLocation3(5) = yTextLocation3(5)- 6;
yTextLocation3(6) = yTextLocation3(6)- 5;
yTextLocation3(7) = yTextLocation3(7)- 13;
yTextLocation3(8) = yTextLocation3(8)- 8;
xTextLocation3(9) = xTextLocation3(9) +2;
yTextLocation3(9) = yTextLocation3(9) -1;
yTextLocation3(end) = yTextLocation3(end)- 0.5;
xTextLocation3(end) = xTextLocation3(end)+ 6;


hold on
h1 = plot(das{3},meanSCGs{3},'Marker','x','LineWidth',linewidthnumber);
h2 = plot(das{3},meanICGs{3},'Marker','x','LineWidth',linewidthnumber);
h3 = plot(das{3}, meanCowPeaGs{3}(1:10), 'Marker','x','LineWidth',linewidthnumber);
h4 = plot([harvestDay{3} harvestDay{3}],[0 250],'color','k','Linestyle','--','LineWidth',linewidthnumber); %Vertical line at harvest
xlim([0 140])
xticks([0 20 40 60 80 100 harvestDay{3}])
ylim([0 250])
%ylabel('Height (cm)')
xlabel('DAS')
text(6,232,'LR2020','FontWeight','bold') 
t1 = text(xTextLocation3,yTextLocation3,textGs(3).data,'FontSize',8);
txt = 'Harvest \rightarrow';
text(harvestDay{3}-25,125,txt)
legend('Maize SC','Maize IC','Cowpea','Position',[0.78 0.85 0.088 0.055]);
legend boxoff
set(gca,'FontName',fontstyle)
set(gca,'yticklabel',[])

x = [0.65 0.645];
y = [0.63 0.59];
annotation('textarrow',x,y,'String',char(8224))
box on

subplot(2,2,3)
xTextLocation4 = das{4} - 5;
yTextLocation4 = meanSCGs{4}+20;
xTextLocation4(1) = xTextLocation4(1)- 4;
xTextLocation4(end) = xTextLocation4(end)+ 5;
yTextLocation4(end) = yTextLocation4(end) + 5;
yTextLocation4(end-2) = yTextLocation4(end-2) - 6;

hold on
h1 = plot(das{4},meanSCGs{4},'Marker','x','LineWidth',linewidthnumber);
h2 = plot(das{4},meanICGs{4},'Marker','x','LineWidth',linewidthnumber);
h3 = plot(das{4},meanCowPeaGs{4},'Marker','x','LineWidth',linewidthnumber);
h4 = plot([harvestDay{4} harvestDay{4}],[0 250],'color','k','Linestyle','--','LineWidth',linewidthnumber); %Vertical line at harvest
xlim([0 136])
xticks([0 20 40 60 80 100 harvestDay{4}])
ylim([0 250])
%ylabel('Height (cm)')
xlabel('DAS')
text(6,232,'SR2020','FontWeight','bold')
t1 = text(xTextLocation4,yTextLocation4,textGs(4).data,'FontSize',8);
txt = 'Harvest \rightarrow';
text(harvestDay{4}-25,125,txt)
legend('Maize SC','Maize IC','Cowpea','Position',[0.32 0.38 0.088 0.056]);
legend boxoff
set(gca,'FontName',fontstyle)
set(gca,'yticklabel',[])
box on

subplot(2,2,4)
xTextLocation5 = das{5}-6;
yTextLocation5 = meanSCGs{5}+22;
yTextLocation5(1) = yTextLocation5(1)- 5;
yTextLocation5(3) = yTextLocation5(3)- 6;
yTextLocation5(4) = yTextLocation5(4)- 6;
yTextLocation5(5) = yTextLocation5(5)- 6;
xTextLocation5(end) = xTextLocation5(end)+ 5;
yTextLocation5(end) = yTextLocation5(end) + 5;
yTextLocation5(end-1) = yTextLocation5(end-1) - 6;
yTextLocation5(end-2) = yTextLocation5(end-2) - 6;
yTextLocation5(end-3) = yTextLocation5(end-3) - 6;


hold on
h1 = plot(das{5},meanSCGs{5},'Marker','x','LineWidth',linewidthnumber);
h2 = plot(das{5},meanICGs{5},'Marker','x','LineWidth',linewidthnumber);
h3 = plot(das{5}, meanCowPeaGs{5}, 'Marker', 'x','LineWidth',linewidthnumber);
h4 = plot([harvestDay{5} harvestDay{5}],[0 250],'color','k','Linestyle','--','LineWidth',linewidthnumber); %Vertical line at harvest
xlim([0 136])
xticks([0 20 40 60 80 100 harvestDay{5}])
ylim([0 250])
ylabel('Height (cm)')
xlabel('DAS')
text(6,232,'LR2021','FontWeight','bold') 

t1 = text(xTextLocation5,yTextLocation5,textGs(5).data,'FontSize',8);
txt = 'Harvest \rightarrow';
text(harvestDay{5}-25,125,txt)
legend('Maize SC','Maize IC','Cowpea','Position',[0.737 0.38 0.0887 0.056]);
legend boxoff
set(gca,'FontName',fontstyle)
box on

print('heightMeansGrowingseasons', '-dpng', '-r600'); %<-Save as PNG with 600 DPI



%% Analysis Function
function [pValues, stats, n1] = performKruskalWallis(data1, data2, seasonLabel, obsLabel)
% Performs Kruskal-Wallis tests and generates boxplots for plant height data.
% Inputs:
%   data1, data2 - Solecrop and Intercrop data matrices
%   seasonLabel  - String label for the season
%   obsLabel     - String label for observations
% Outputs:
%   pValues - P-values for each observation
%   stats   - Kruskal-Wallis test statistics for each observation

numObs = size(data1, 1);
pValues = zeros(numObs, 1);
stats = cell(numObs, 1);

for i = 1:numObs
    % Combine and prepare data
    yData = [data1(i, :); data2(i, :)]';
    
    % Perform Kruskal-Wallis test
    [pValues(i), ~, stats{i}] = kruskalwallis(yData, [], 'off');
    n1(i,1:2) = stats{i}.n;
end
end
