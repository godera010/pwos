% Written by Juuso Tuure (juuso.tuure@helsinki.fi) 2025
% This script plots yields as a bar graph and prints out the yield
% statistics as a spreadsheet table.


close all; close all hidden; clear; clc;

load yieldDataForTablesAndFigures.mat
%% Plot bar figures of the yields
columnNamesM = M.means.Properties.VariableNames;
columnNamesM(1:2) = []; %Remove the first and second column names as unnecessary

%Y-axis labels
ylabelsM = {'Grain yield(kg ha^{-1})',...
    'Stover yield (kg ha^{-1})',...
    'Grain yield (kg ha^{-1})',...
    'Total biomass (kg ha^{-1})',...
    'plants ha^{-1}','1000 grains mass (g)',...
    'Grain yield(kg ha^{-1})', 'Harvest index','WUE_etcbiomass',...
    'WUE_etcmaizegrain','WUE_etctotalgrain','WUE_kcbiomass',...
    'WUE_kcmaizegrains', 'WUE_kctotalgrains','ETc'};

xticklabelsM = {'SC, LR2019','IC, LR2019','SC, SR2019','IC, SR2019',...
    'SC, LR2020','IC, LR2020', 'SC, SR2020','IC, SR2020',...
    'SC, LR2021','IC, LR2021'};

xticklabelsM = cellfun(@(x) strrep(x,' ','\newline'),xticklabelsM,'UniformOutput',false);
fontsize1 = 10;

%% Plot bar figures of the Cowpea yields
columnNamesC = C.means.Properties.VariableNames;
columnNamesC(1) = []; %Remove the first column name as unnecessary
ylabelsC = {'kg ha^{-1}', 'kg ha^{-1}', 'kg ha^{-1}',...
    'plants ha^{-1}','g', ' '};

%% Next the total calculated biomasses 
meansToBarMaize2 = M.means.(columnNamesM{1}) + M.means.(columnNamesM{2});
meansToBarCowpea2 = C.means.(columnNamesC{1}) + C.means.(columnNamesC{2});
meansToBar2(1,:) = meansToBarMaize2;

stesToBar2 = M.standarderrors.(columnNamesM{4});

for i = 1:10
    if rem(i,2) == 0
        meansToBar2(2,i) = meansToBarCowpea2(i/2);
    else
        meansToBar2(2,i) = 0;
    end
end

 f = bigFigure('square');
 bar(meansToBar2.','stacked');
 hold on

errorbarlocations2 = meansToBar2(1,:)+meansToBar2(2,:);
errorbar(errorbarlocations2.', stesToBar2.','.k');
ax = gca;
ylim([0 46000])
yticks(0:2000:46000)
ax.YAxis.Exponent = 0;
set(gca, 'XTickLabel', xticklabelsM)
    xt2 = get(gca, 'XTick');
    text(xt2, M.means.(columnNamesM{4})+M.standarderrors.(columnNamesM{4}),...
        labelsM{4},'HorizontalAlignment','center', 'VerticalAlignment','bottom','FontSize',fontsize1)
ylabel('Total above ground mass (kg ha^{-1})')

ax.XLabel.String = sprintf('\n%s', 'Season and treatment');
legend('Maize','Cowpea')
legend 'boxoff'
print('meanTotalAboveGroundMassKgHa', '-dpng', '-r600'); %<-Save as PNG with 600 DPI


%% Make the tables for the article 
CroppingSystem= {'Solecrop'; 'Intercrop'; 'Solecrop';...
    'Intercrop'; 'Solecrop';'Intercrop';'Solecrop';'Intercrop';...
    'Solecrop';'Intercrop';' ';' ';' '};

yieldTableMaize = M.descriptiveStats(:, {'GrowingSeason', 'extrapolatedGrainMass',...
    'extrapolatedVegetativeMass','totalYieldFrom25m2','plantPopulation',...
    'thousandGrainWeight'});
yieldTableMaize = addvars(yieldTableMaize, CroppingSystem, 'Before', 'extrapolatedGrainMass');

yieldTableCowpea = C.descriptiveStats(:, {'GrowingSeason', 'extrapolatedGrainMass',...
    'extrapolatedVegetativeMass','totalYieldFrom25m2','plantPopulation',...
    'thousandGrainWeight'}); 


wpTable = M.descriptiveStats(:, {'GrowingSeason','WP_kcbiomass',...
    'WP_kcmaizegrains','WP_kctotalgrains','ETc'});
wpTable = addvars(wpTable, CroppingSystem, 'Before', 'WP_kcbiomass');

% Export the tables as spreadsheets 
writetable(yieldTableMaize, 'yieldTableMaize.xlsx'); 
writetable(yieldTableCowpea, 'yieldTableCowpea.xlsx'); 

writetable(wpTable, 'wpTable.xlsx'); 