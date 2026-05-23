

% In this script:
%   - Creates table with descriptive statistics
%   - Runs Two-way Anova for the maize yield components (response variables)
%   - One-way Anova for the cowpea yield components (response variables)

close all hidden;clear;clc
load yieldData.mat
load wuedata.mat

plots = {'SC1';'SC2';'SC3';...
    'SC1';'SC2';'SC3';...
    'SC1';'SC2';'SC3';...
    'SC1';'SC2';'SC3';...
    'SC1';'SC2';'SC3';...
    'IC1';'IC2';'IC3';...
    'IC1';'IC2';'IC3';...
    'IC1';'IC2';'IC3';...
    'IC1';'IC2';'IC3';...
    'IC1';'IC2';'IC3'};

% Repeat the values and reshape into a column vector
season_num = reshape(repmat(1:5, 3, 1), [], 1);
season_num = [season_num ;season_num];
%%
for i = 1:numel(plots)
    WP_ETcD_maizegrains(i,1) = WP_ETcD_maizegrain(season_num(i)).(plots{i});
    WP_ETcD_biomasses(i,1) = WP_ETcD_totalbiomass(season_num(i)).(plots{i});
    WP_ETcD_totalgrains(i,1) = WP_ETcD_totalgrain(season_num(i)).(plots{i});
    
    WP_Kc_maizegrains(i,1) = WPKc_maizegrain(season_num(i)).(plots{i});
    WP_Kc_biomass(i,1) = WPKc_totalbiomass(season_num(i)).(plots{i});
    WP_Kc_totalgrains(i,1) = WPKc_totalgrain(season_num(i)).(plots{i});
    
    WU_Kc(i,1) = WUKc(season_num(i)).(plots{i});
end

T.WP_etcbiomass = WP_ETcD_biomasses;
T.WP_etcmaizegrain = WP_ETcD_maizegrains;
T.WP_etctotalgrain = WP_ETcD_totalgrains;

T.WP_kcbiomass = WP_Kc_biomass;
T.WP_kcmaizegrains =WP_Kc_maizegrains;
T.WP_kctotalgrains = WP_Kc_totalgrains;
T.ETc = WU_Kc;

%%
replicates = 3;%number of plot replicates of both treatments.
numberOfSeasons = 5; %Number of seasons
numberOfCropTreatments = 2; %Number of crop treatments


% Maize repsonse variables
vars = {'extrapolatedGrainMass' 'extrapolatedVegetativeMass' 'totalYieldFrom25m2' 'totalBiomasses'...
    'plantPopulation' 'thousandGrainWeight' 'plotTotalGrainYield'...
    'HI' 'WP_etcbiomass' 'WP_etcmaizegrain' 'WP_etctotalgrain'...
    'WP_kcbiomass' 'WP_kcmaizegrains' 'WP_kctotalgrains','ETc'};

%Cowpea response variables
varsC = {'extrapolatedGrainMass' 'extrapolatedVegetativeMass' 'totalYieldFrom25m2'...
    'plantPopulation' 'thousandGrainWeight' 'HI' };

% Make a table of numeric data of the response variables
T2 = T{:,vars};

%% NAN (missing) VALUES ARE CHANGED TO 0
T2(isnan(T2)) = 0; % Replace NaN with 0 for the response variables in tables
T{:,vars} = T2;

Tc2 = Tc{:,varsC};
Tc2(isnan(Tc2)) = 0;
Tc{:,varsC} = Tc2;

%% Two way-anova part begins here

% Define grouping variables
g1 = T.cropTreatment;
g2 = T.season;
[h,w] = size(T2); %Get the size of the to be tested response variables table

for i = 1:w
    set(0, 'DefaultFigureVisible', 'off')
    [p{i},tbl{i},stats{i},terms{i}] = anovan(T2(:,i),{g1 g2},...
        'model','interaction','varnames',{'Crop treatment','Season'});
    
    % Tukey's HSD posthoc test
    [cmat{i},mmat{i},hmat{i},gnames] = multcompare(stats{i},"Dimension",[1 2],'Display', 'off');
    
    %headingObj = findall(0,'Type','uicontrol','Tag','Heading');
    %headingObj(1).String = ['2-way anova table ' vars{i}];
    
    % Fetch the post-hoc labels for plotting and for th descriptive statistics
    labelsM{i} = my_ph_letters_v2(cmat{i},hmat{i});
end


%% Check the normality of residuals
 [h,w] = size(stats);
 for i = 1:w
     figure
     hold on
     subplot(2,1,1)
     qqplot(stats{i}.resid) %QQ plot od the residuals (errors)
     
     subplot(2,1,2)
     hist(stats{i}.resid) %Histogram of the residuals
     sgtitle(vars{i})
     
     formatSpec = "%s comes from a normal distribution: %d";
     %Lilliefors test;
     %Result is 1 if rejects the null hypothesis at 5% significance level,
     %and 0 otherwise.
     normality_check_str{i,1} = sprintf(formatSpec,vars{i},...
         lillietest(stats{i}.resid));
 end

%% Next, calculate the descriptive statistics

[h,w] = size(T2);
for i=1:floor(h/replicates)
    for j = 1:w
        means(i,j) = nanmean(T2((i-1)*replicates+1:i*replicates,j));
        standarderrors(i,j) = nanstd(T2((i-1)*replicates+1:i*replicates,j))/sqrt(size(T2((i-1)*replicates+1:i*replicates,j),1));
    end
end

% Write strings with means +/- the standard errors
[h,w] = size(means);
for i = 1:h
    for j = 1:w
        if j <8
            Tdescriptive{i,j} =  [num2str(round(means(i,j),0)) ' ' char(177) ' ' num2str(round(standarderrors(i,j),0))];
        else
            Tdescriptive{i,j} =  [num2str(round(means(i,j),1)) ' ' char(177) ' ' num2str(round(standarderrors(i,j),1))];
        end
    end
end

% Get the p-values and merge to descriptive stats table
[h,w1] = size(tbl{1,1});
number_of_pvalues = h-3;
for i = 1:number_of_pvalues
    for j = 1:w
        TestingTable{i,j} = tbl{1,j}{i+1,7};
    end
end
Tdescriptive = [Tdescriptive; TestingTable];

%% Dump the results into a structure variable M for maize


seasonNames = {'2019LR'; '2019SR'; '2020LR'; '2020SR'; '2021LR';...
    '2019LR'; '2019SR'; '2020LR'; '2020SR'; '2021LR'};

cropSystemNames = {'Sole crop';'Intercrop';'Sole crop';'Intercrop';...
    'Sole crop';'Intercrop';'Sole crop';'Intercrop';'Sole crop';'Intercrop'};

% Get the names for the p-values from the anova result table
for i = 1:(size(tbl{1}, 1)-3)
    pvalueNames{i,1} = ['pvalue', num2str(i), ' ', tbl{1,i}{i+1,1}];
end


seasonNames2 = [seasonNames;pvalueNames];
cropSystemNames2 = [cropSystemNames;{'';'';''}]; 

M.means = array2table(means);
M.means.Properties.VariableNames = vars;
M.means = addvars(M.means,seasonNames,'Before','extrapolatedGrainMass');
M.means = addvars(M.means,cropSystemNames ,'Before','extrapolatedGrainMass');

M.means = sortrows(M.means,1); %Sort according to the season
M.means.Properties.VariableNames{1} = 'GrowingSeason';
M.means.Properties.VariableNames{2} = 'CroppingSystem';


M.standarderrors = array2table(standarderrors);
M.standarderrors.Properties.VariableNames = vars;
M.standarderrors = addvars(M.standarderrors,seasonNames,'Before','extrapolatedGrainMass');
M.standarderrors = addvars(M.standarderrors,cropSystemNames ,'Before','extrapolatedGrainMass');
M.standarderrors = sortrows(M.standarderrors,1); %Sort according to the season
M.standarderrors.Properties.VariableNames{1} = 'GrowingSeason';
M.standarderrors.Properties.VariableNames{2} = 'CroppingSystem';


M.descriptiveStats = cell2table(Tdescriptive);
M.descriptiveStats.Properties.VariableNames = vars;
M.descriptiveStats = addvars(M.descriptiveStats,seasonNames2,'Before','extrapolatedGrainMass');
M.descriptiveStats = addvars(M.descriptiveStats,cropSystemNames2,'Before','extrapolatedGrainMass');
M.descriptiveStats = sortrows(M.descriptiveStats,1); %Sort according to the season
M.descriptiveStats.Properties.VariableNames{1} = 'GrowingSeason';
M.descriptiveStats.Properties.VariableNames{2} = 'CroppingSystem';
%%
%Add the post-hoc labels to the descriptive stats
[h,w] = size(M.descriptiveStats);
for j = 1:w-2
    for i = 1:h-number_of_pvalues
        M.descriptiveStats.(j+2){i} = [M.descriptiveStats.(j+2){i} ' ' labelsM{1,j}{i}];
    end
end


%% One-way anova for cowpea

%Re-organize the data for anova
resultMatrices = organizeDataForAnova(Tc2,numberOfSeasons ,replicates);

% Now loop through the result matrices
[~,w] = size(Tc2);
for i = 1:w
    set(0, 'DefaultFigureVisible', 'off')
    [pC{i},tblC{i},statsC{i}] = anova1(resultMatrices{1,i});
    [cmatC{i},mmatC{i},hmatC{i},gnamesC] = multcompare(statsC{i},'Display', 'off');
%     headingObj = findall(0,'Type','uicontrol','Tag','Heading');
%     headingObj(1).String = ['one-way anova table ' varsC{i}];
    
    labelsC{i} = my_ph_letters_v2(cmatC{i},hmatC{i});
end

[h,w] = size(Tc2);
for i=1:floor(h/replicates)
    for j = 1:w
        meansC(i,j) = nanmean(Tc2((i-1)*replicates+1:i*replicates,j));
        standarderrorsC(i,j) = nanstd(Tc2((i-1)*replicates+1:i*replicates,j))/sqrt(size(T2((i-1)*replicates+1:i*replicates,j),1));
    end
end

[h,w] = size(meansC);
for i = 1:h
    for j = 1:w
        if j < 6
            TdescriptiveC{i,j} =  [num2str(round(meansC(i,j),0)) ' ' char(177) ' ' num2str(round(standarderrorsC(i,j),0))];
        else
            TdescriptiveC{i,j} =  [num2str(round(meansC(i,j),1)) ' ' char(177) ' ' num2str(round(standarderrorsC(i,j),1))];
        end
    end
end

% Get the p-values and merge to descriptive stats table
[h,w1] = size(tblC{1,1});
number_of_pvaluesC = h-3;
for i = 1:number_of_pvaluesC
    for j = 1:w
        TestingTableC{i,j} = tblC{1,j}{i+1,6};
    end
end
TdescriptiveC = [TdescriptiveC; TestingTableC];



%% Dump the results into a structure variable C for cowpea
rowNamesC = {'2019LR';'2019SR';'2020LR';'2020SR';'2021LR'};
rowNamesC2 = {'2019LR';'2019SR';'2020LR';'2020SR';'2021LR';'pValue'};

C.means = array2table(meansC);
C.means.Properties.VariableNames = varsC;
C.means = addvars(C.means,rowNamesC,'Before','extrapolatedGrainMass');
C.means.Properties.VariableNames{1} = 'GrowingSeason';

C.standarderrors = array2table(standarderrorsC);
C.standarderrors.Properties.VariableNames = varsC;
C.standarderrors = addvars(C.standarderrors,rowNamesC,'Before','extrapolatedGrainMass');
C.standarderrors.Properties.VariableNames{1} = 'GrowingSeason';

C.descriptiveStats = cell2table(TdescriptiveC);
C.descriptiveStats.Properties.VariableNames = varsC;
C.descriptiveStats = addvars(C.descriptiveStats,rowNamesC2,'Before','extrapolatedGrainMass');
C.descriptiveStats.Properties.VariableNames{1} = 'GrowingSeason';

%Add the post-hoc labels to the descriptive stats
[h,w] = size(C.descriptiveStats);
for j = 1:w-1
    for i = 1:h-number_of_pvaluesC
        C.descriptiveStats.(j+1){i} = [C.descriptiveStats.(j+1){i} ' ' labelsC{1,j}{i}];
    end
end

% Write the descriptive stats in an excel spreadheet

save yieldDataForTablesAndFigures.mat M C labelsM labelsC

function organizedDataForAnova = organizeDataForAnova(originalMatrix,treatments,replicates)

% Preallocate a cell array to store the resulting treatments x replicates matrices
resultMatrices = cell(1, size(originalMatrix, 2));

% Loop through each column of the original matrix
for col = 1:size(originalMatrix, 2)
    
    % Preallocate a treatments x replicates sized matrix for the current column
    currentMatrix = zeros(replicates, treatments);
    
    % Loop through columns of the current column and populate the new matrix
    for sub_col = 1:treatments
        % Extract the elements from the original matrix
        currentMatrix(:, sub_col) = originalMatrix((sub_col-1)*replicates + 1:sub_col*replicates, col);
    end
    
    % Store the current matrix in the cell array
    resultMatrices{col} = currentMatrix;
    
    organizedDataForAnova = resultMatrices;
    
end
end

