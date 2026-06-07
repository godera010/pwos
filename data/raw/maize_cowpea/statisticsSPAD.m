% This script calculates descriptive statistics for the SPAD measurements
% Performs ANOVA (Kruskall-Wallis) and plots a figure of the results

close all;close all hidden;clear;clc

%Load the data for the treatments
load manualMeasurementsResults.mat
load growingseasontimes.mat


fontstyle = 'Times';
fontsize1 = 14;
linewidthnumber = 2;

% %Exclude NaN rows from the end of LR2020
%Exclude NaN rows from the end of LR2020
results.gs3_Maize_Flat_Solecrop_SPAD = results.gs3_Maize_Flat_Solecrop_SPAD(1:10,:);
results.gs3_Maize_Flat_Intercrop_SPAD = results.gs3_Maize_Flat_Intercrop_SPAD(1:10,:);

% %Exclude NaN rows from the end of LR2020
manualObservationDates{3} = manualObservationDates{3}(1:10,:);

manualObservationDates{4} = manualObservationDates{4}(3:end,:);

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
    [p{k}, stats{k}, n{k}] = performKruskalWallis(results.(['gs', num2str(k), '_Maize_Flat_Solecrop_SPAD']), ...
        results.(['gs', num2str(k), '_Maize_Flat_Intercrop_SPAD']), ['GS' num2str(k)], ['GS' num2str(k)]);
    
    % Calculate means and differences in means
    meanSCGs{k} = nanmean(results.(['gs', num2str(k), '_Maize_Flat_Solecrop_SPAD']), 2);
    meanICGs{k} = nanmean(results.(['gs', num2str(k), '_Maize_Flat_Intercrop_SPAD']), 2);
    meanCowPeaGs{k} = nanmean(results.(['gs',num2str(k), '_Cowpea_Flat_Intercrop_SPAD']),2);
    
    differenceGs{k} = meanSCGs{k} - meanICGs{k};
    
    % Calculate standard errors
    seICGs{k} = nanstd(results.(['gs', num2str(k), '_Maize_Flat_Intercrop_SPAD']), [], 2) ...
        / sqrt(size(results.(['gs', num2str(k), '_Maize_Flat_Intercrop_SPAD']), 2));
    
    seSCGs{k} = nanstd(results.(['gs', num2str(k), '_Maize_Flat_Solecrop_SPAD']), [], 2) ...
        / sqrt(size(results.(['gs', num2str(k), '_Maize_Flat_Solecrop_SPAD']), 2));
    
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
    TT(k).data.Properties.VariableNames = {'DAS','MeanSPADSC','SeSPADSC','nSC','MeanSPADIC','SeSPADIC','nIC','Difference','pValue'};
    T(k).data = timetable2table(TT(k).data);
    writetable(T(k).data,'SPADStats.xlsx','Sheet',k)
end


%%%%%%%

for i = 1:length(differenceGs{1})
    if differenceGs{1}(i) < 0
        yTextlocationGs1(i) = meanICGs{1}(i);
    else
        yTextlocationGs1(i) = meanSCGs{1}(i);
    end
end


for i = 1:length(differenceGs{2})
    if differenceGs{2}(i) < 0
        yTextlocationGs2(i) = meanICGs{2}(i);
    else
        yTextlocationGs2(i) = meanSCGs{2}(i);
    end
end

for i = 1:length(differenceGs{3})
    if differenceGs{3}(i) < 0
        yTextlocationGs3(i) = meanICGs{3}(i);
    else
        yTextlocationGs3(i) = meanSCGs{3}(i);
    end
end

for i = 1:length(differenceGs{4})
    if differenceGs{4}(i) < 0
        yTextlocationGs4(i) = meanICGs{4}(i);
    else
        yTextlocationGs4(i) = meanSCGs{4}(i);
    end
end


for i = 1:length(differenceGs{5})
    if differenceGs{5}(i) < 0
        yTextlocationGs5(i) = meanICGs{5}(i);
    else
        yTextlocationGs5(i) = meanSCGs{5}(i);
    end
end
f = bigFigure('square');
subplot(2,3,1)
xTextLocation = das{1}-5;

hold on
h1 = plot(das{1},meanSCGs{1},'Marker','x','LineWidth',linewidthnumber);
h2 = plot(das{1},meanICGs{1},'Marker','x','LineWidth',linewidthnumber);
h3 = plot(das{1},meanCowPeaGs{1},'Marker','x','LineWidth',linewidthnumber);
h4 = plot([harvestDay{1} harvestDay{1}],[0 85],'color','k','Linestyle','--','LineWidth',linewidthnumber); %Vertical line at harvest 
xlim([0 140])
xticks([0 20 40 60 80 100 harvestDay{1}])
ylim([0 85])
ylabel('SPAD units')
xlabel('DAS')
text(6,80,'LR2019','FontWeight','bold') %LR2019
t1 = text(xTextLocation,yTextlocationGs1+5,textGs(1).data,'FontSize',8);
txt = 'Harvest \rightarrow';
text(harvestDay{1}-40,32,5,txt)
legend('Maize SC','Maize IC','Cowpea',...
    'Position',[0.225 0.86 0.062 0.06]);

legend box off
set(gca,'FontName',fontstyle)
box on


subplot(2,3,2)

xTextLocation = das{2}-5;
xTextLocation(3) = xTextLocation(3)+5;
yTextlocationGs2(3) = yTextlocationGs2(3)-14;
xTextLocation(4) = xTextLocation(4)+8;
yTextlocationGs2(4) = yTextlocationGs2(4)-4;

hold on
h1 = plot(das{2},meanSCGs{2},'Marker','x','LineWidth',linewidthnumber);
h2 = plot(das{2},meanICGs{2},'Marker','x','LineWidth',linewidthnumber);
h3 = plot(das{2},meanCowPeaGs{2},'Marker','x','LineWidth',linewidthnumber);
h4 = plot([harvestDay{2} harvestDay{2}],[0 85],'color','k','Linestyle','--','LineWidth',linewidthnumber); %Vertical line at harvest 
xlim([0 140])
xticks([0 20 40 60 80 100 harvestDay{2}])
ylim([0 85])
%ylabel('SPAD units')
xlabel('DAS')
text(6,80,'SR2019','FontWeight','bold') %SR2019
t1 = text(xTextLocation,yTextlocationGs2+5,textGs(2).data,'FontSize',8);
txt = 'Harvest \rightarrow';
text(harvestDay{2}-40,32,5,txt)
legend('Maize SC','Maize IC','Cowpea',...
     'Position',[0.505 0.86 0.062 0.06]);
legend box off
set(gca,'FontName',fontstyle)
set(gca,'yticklabel',[])
box on

subplot(2,3,3)
xTextLocation = das{3}-5;
yTextlocationGs3(2) = yTextlocationGs3(2) -8;

xTextLocation(3) = xTextLocation(3) -3;
yTextlocationGs3(3) = yTextlocationGs3(3) -3;

xTextLocation(4) = xTextLocation(4)+1 ;
yTextlocationGs3(4) = yTextlocationGs3(4) -11;

xTextLocation(5) = xTextLocation(5)-3 ;
yTextlocationGs3(5) = yTextlocationGs3(5) -2;

xTextLocation(6) = xTextLocation(6)-6 ;
yTextlocationGs3(6) = yTextlocationGs3(6) -2;

xTextLocation(7) = xTextLocation(7)-3 ;
yTextlocationGs3(7) = yTextlocationGs3(7) -2;

yTextlocationGs3(8) = yTextlocationGs3(8) -1;

xTextLocation(9) = xTextLocation(9)+3 ;
yTextlocationGs3(9) = yTextlocationGs3(9) -2;

xTextLocation(10) = xTextLocation(10)+3 ;
yTextlocationGs3(10) = yTextlocationGs3(10) -2;

hold on
h1 = plot(das{3},meanSCGs{3},'Marker','x','LineWidth',linewidthnumber);
h2 = plot(das{3},meanICGs{3},'Marker','x','LineWidth',linewidthnumber);
h3 = plot(das{3}, meanCowPeaGs{3}(1:10),'Marker','x','LineWidth',linewidthnumber);
h4 = plot([harvestDay{3} harvestDay{3}],[0 85],'color','k','Linestyle','--','LineWidth',linewidthnumber); %Vertical line at harvest 
xlim([0 140])
xticks([0 20 40 60 80 100 harvestDay{3}])
ylim([0 85])
%ylabel('SPAD units')
xlabel('DAS')
text(6,80,'LR2020','FontWeight','bold') %LR2020
t1 = text(xTextLocation,yTextlocationGs3+5,textGs(3).data,'FontSize',8);
legend('Maize SC','Maize IC','Cowpea',...
     'Position',[0.785 0.86 0.062 0.06]);
legend box off
txt = 'Harvest \rightarrow';
text(harvestDay{3}-40,32,5,txt)
set(gca,'FontName',fontstyle)
set(gca,'yticklabel',[])

x = [0.76 0.745];
y = [0.66 0.715];
annotation('textarrow',x,y,'String',char(8224))
box on

subplot(2,3,4)
xTextLocation = das{4}-6;
xTextLocation(1) = xTextLocation(1) -3;
yTextlocationGs4(1) = yTextlocationGs4(1) -3;

xTextLocation(2) = xTextLocation(2) +1;
yTextlocationGs4(2) = yTextlocationGs4(2);

xTextLocation(3) = xTextLocation(3) +1;
yTextlocationGs4(3) = yTextlocationGs4(3) -3;

xTextLocation(4) = xTextLocation(4)-2;
yTextlocationGs4(4) = yTextlocationGs4(4) -11;

xTextLocation(5) = xTextLocation(5)+5 ;
yTextlocationGs4(5) = yTextlocationGs4(5)-3;

hold on
h1 = plot(das{4},meanSCGs{4},'Marker','x','LineWidth',linewidthnumber);
h2 = plot(das{4},meanICGs{4},'Marker','x','LineWidth',linewidthnumber);
h3 = plot(das{4}, meanCowPeaGs{4},'Marker','x','LineWidth',linewidthnumber);
h4 = plot([harvestDay{4} harvestDay{4}],[0 85],'color','k','Linestyle','--','LineWidth',linewidthnumber); %Vertical line at harvest 


xlim([0 140])
xticks([0 20 40 60 80 100 harvestDay{4}])
ylim([0 85])
ylabel('SPAD units')
xlabel('DAS')
text(6,80,'SR2020','FontWeight','bold') %SR2020
t1 = text(xTextLocation,yTextlocationGs4+5,textGs(4).data,'FontSize',8);
txt = 'Harvest \rightarrow';
text(harvestDay{4}-40,32,5,txt)
legend('Maize SC','Maize IC','Cowpea',...
    'Position', [0.225 0.388 0.062 0.06]);
legend box off
set(gca,'FontName',fontstyle)
box on

subplot(2,3,5)
xTextLocation = das{5}-5;

xTextLocation(1) = xTextLocation(1) -4;
yTextlocationGs5(1) = yTextlocationGs5(1) -2.5;

xTextLocation(2) = xTextLocation(2) -4;
yTextlocationGs5(2) = yTextlocationGs5(2)-3;

xTextLocation(3) = xTextLocation(3) -2;
yTextlocationGs5(3) = yTextlocationGs5(3) -3;

xTextLocation(4) = xTextLocation(4)-1;
yTextlocationGs5(4) = yTextlocationGs5(4) -8;

xTextLocation(5) = xTextLocation(5)-1.5;
yTextlocationGs5(5) = yTextlocationGs5(5)-2.5;

xTextLocation(6) = xTextLocation(6)-1;
yTextlocationGs5(6) = yTextlocationGs5(6)-1.5;

xTextLocation(7) = xTextLocation(7)-1;
yTextlocationGs5(7) = yTextlocationGs5(7)-1.5;

xTextLocation(end-2) = xTextLocation(end-2)+3;
yTextlocationGs5(end-2) = yTextlocationGs5(end-2);


xTextLocation(end-1) = xTextLocation(end-1)+3;
yTextlocationGs5(end-1) = yTextlocationGs5(end-1)-3;

xTextLocation(end) = xTextLocation(end)+5;
yTextlocationGs5(end) = yTextlocationGs5(end)-3;

hold on
h1 = plot(das{5},meanSCGs{5},'Marker','x','LineWidth',linewidthnumber);
h2 = plot(das{5},meanICGs{5},'Marker','x','LineWidth',linewidthnumber);
h3 = plot(das{5},meanCowPeaGs{5},'Marker','x','LineWidth',linewidthnumber);
h4 = plot([harvestDay{5} harvestDay{5}],[0 85],'color','k','Linestyle','--','LineWidth',linewidthnumber); %Vertical line at harvest 
xlim([0 140])
xticks([0 20 40 60 80 100 harvestDay{5}])
ylim([0 85])
%ylabel('SPAD units')
xlabel('DAS')
text(6,80,'LR2021','FontWeight','bold') %LR2021
t1 = text(xTextLocation,yTextlocationGs5+5,textGs(5).data,'FontSize',8);
txt = 'Harvest \rightarrow';
text(harvestDay{5}-40,32,5,txt)
legend('Maize SC','Maize IC','Cowpea',...
'Position',[0.505 0.388 0.062 0.06]);
legend box off

set(gca,'FontName',fontstyle)
set(gca,'yticklabel',[])
box on
% Create a tile on the right column to get its position

% ax = subplot(2,3,6,'Visible','off');
% axPos = ax.Position;
% delete(ax)
% % Construct a Legend with the data from the sub-plots
% hL = legend([h1 h2,h3],'Maize SC','Maize IC','Cowpea','FontSize',fontsize1,'Box','off');
% % Move the legend to the position of the extra axes
% hL.Position(1:1) = axPos(1:1);


print('spadMeansGrowingseasons', '-dpng', '-r600'); %<-Save as PNG with 600 DPI


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
