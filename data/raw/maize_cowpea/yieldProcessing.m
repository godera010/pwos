% Written by Juuso Tuure juuso.tuure@helsinki.fi 2025
% This script calculates the yield statistics
% Prepares the data for ANOVA and WUE calculations 
close all
clear
clc
% This script prepares the data for the statistical analysis of yields in (kg/ha)
load yields.mat

% For LR2019 replace NaN values of calculated 100 grain weights
% They were calculated only once during this season
[h,w] = size(yieldsMaize);
for i = 1:w
    yieldsMaize(i).data.hundredKernelsWeight2(1) = yieldsMaize(i).data.hundredKernelsWeight1(1);
    yieldsMaize(i).data.hundredKernelsWeight3(1) = yieldsMaize(i).data.hundredKernelsWeight1(1);
end

[h,w] = size(yieldsCowpea);
for i = 1:w
    yieldsCowpea(i).data.hundredgrainsWeight2(1) = yieldsCowpea(i).data.hundredgrainsWeight1(1);
    yieldsCowpea(i).data.hundredgrainsWeight3(1) = yieldsCowpea(i).data.hundredgrainsWeight1(1);
end

% Datetimes for harvest specifying the growing season
LR2019 = datetime("2019-08-03");
SR2019 = datetime("2020-02-01");
LR2020 = datetime("2020-07-01");
SR2020 = datetime("2021-02-01");
LR2021 = datetime("2021-07-19");
LR2021_2 = datetime("2021-06-12");

fields1 = {yieldsMaize(1).name;yieldsMaize(2).name;...
    yieldsMaize(3).name;yieldsMaize(4).name;...
    yieldsMaize(5).name;yieldsMaize(6).name};

for j =1:5
    T = table();
    for i = 1:numel(yieldsMaize)
        season = yieldsMaize(i).data.Date(j);
        cropTreatment = yieldsMaize(i).data.cropTreatment(j);
        plotCode = yieldsMaize(i).data.PlotCode(j);
        plantPopulation = yieldsMaize(i).data.plantPopulation(j)*400; %[plants ha^-1] converted from 25 m^2 plot
        totalYieldFrom25m2 = yieldsMaize(i).data.finalYield(j)*0.4; %Final yield of plot as kg/ha. The factor comes from g = 1/1000 kg, 1 ha = 400*25 m^2
        wholePlantWeight = yieldsMaize(i).data.WholePlantWeight(j);
        grainYield = yieldsMaize(i).data.kernelsWeight(j); %Sum of grain yield of 10 monitored plants [g]
        dryGrainYield = yieldsMaize(i).data.dryGrainYield(j);
        if ~isnan(dryGrainYield) % replace the grain yields with the dry yields
            grainYield = dryGrainYield;
        end
        thousandGrainWeight = (yieldsMaize(i).data.hundredKernelsWeight1(j) +...
            yieldsMaize(i).data.hundredKernelsWeight2(j) +...
            yieldsMaize(i).data.hundredKernelsWeight3(j))/0.3;
       extrapolatedGrainMass = (plantPopulation*(grainYield/10000)); %[kg/ha] conversion from  yield for 10 plants in g
       extrapolatedDryGrainMass = (plantPopulation*(dryGrainYield/10000)); %[kg/ha] conversion from  yield for 10 plants in g
       extrapolatedVegetativeMass = (plantPopulation*(wholePlantWeight/10000)); %[kg/ha] conversion from  yield for 10 plants in g
       seedbed = yieldsMaize(i).data.seedbed(j);
        
        t(1,1) = plantPopulation;
        t(1,2) =  extrapolatedGrainMass;
        t(1,3) = extrapolatedVegetativeMass;
        t(1,4) = thousandGrainWeight;
        t(1,5) = totalYieldFrom25m2; %This is reported final yield, not sure about the unit kg or g?
        
        maizeData1.plantPopulation(j).(fields1{i}) = plantPopulation;
        maizeData1.extrapolatedGrainMass(j).(fields1{i}) = extrapolatedGrainMass;
        maizeData1.extrapolatedVegetativeMass(j).(fields1{i}) = extrapolatedVegetativeMass;
        maizeData1.thousandGrainWeight(j).(fields1{i}) = thousandGrainWeight;
        maizeData1.totalYieldFrom25m2(j).(fields1{i}) = totalYieldFrom25m2;
        
        
        if season == LR2019
            seasontxt = "LR";
            seasontxt_alt = "LR2019";
            year = 2019;
        end
        
        if season == SR2019
            seasontxt = "SR";
            seasontxt_alt = "SR2019";
            year = 2019;
        end
        
        if season == LR2020
            seasontxt = "LR";
            seasontxt_alt = "LR2020";
            year = 2020;
        end
        
        if season == SR2020
            seasontxt = "SR";
            seasontxt_alt = "SR2020";
            year = 2020;
        end
        
        if season == LR2021 || season == LR2021_2
            seasontxt = "LR";
            seasontxt_alt = "LR2021";
            year = 2021;
        end
        
        T = [T;cell2table(plotCode),cell2table(cropTreatment),...
            table(seasontxt_alt),table(year),table(seasontxt),...
            array2table(t(:,1:5))];
    end
    
    T.Properties.VariableNames = {'plotCode','cropTreatment', 'season',...
        'year','rainyseason' 'plantPopulation', 'extrapolatedGrainMass',...
        'extrapolatedVegetativeMass','thousandGrainWeight','totalYieldFrom25m2'};
    
    yieldDataMaize(j).data = T;
end

T= [yieldDataMaize(1).data;yieldDataMaize(2).data;yieldDataMaize(3).data;...
    yieldDataMaize(4).data;yieldDataMaize(5).data];

%Sort the rows
T = sortrows(T,2);
T.cropTreatment(strcmp(T.cropTreatment,'Maize pure stand plots')) = {'SC'};
T.cropTreatment(strcmp(T.cropTreatment,'Maize/Cowpea plots')) = {'IC'};

%Define a function to extract the first number and map it to 1, 2, or 3
getNumber = @(str) str2double(str(3));

% Apply the function to each element of the table
T.block = cellfun(getNumber, T.plotCode);

%% This is the cowpea part.

fields2 = {yieldsCowpea(1).name;yieldsCowpea(2).name;...
    yieldsCowpea(3).name};

for j = 1:5
    Tc = table();
    for i = 1:numel(yieldsCowpea)
        season = yieldsCowpea(i).data.Date(j);
        cropTreatment = yieldsCowpea(i).data.cropTreatment(j);
        plotCode = yieldsCowpea(i).data.PlotCode(j);
        plantPopulation = yieldsCowpea(i).data.plantPopulation(j)*400; %%[plants ha^-1] converted from 25 m^2 plot
        totalYieldFrom25m2 = yieldsCowpea(i).data.finalYield(j)*0.4; %Final yield of plot (kg/ha)
        wholePlantWeight = yieldsCowpea(i).data.WholePlantWeight(j);
        grainYield = yieldsCowpea(i).data.grainsWeight(j); %Sum of grain yield of 10 monitored plants [g]
        dryGrainYield = yieldsCowpea(i).data.dryGrainYield(j); %Sum of dry grain yield of 10 monitored plants [g]
        if ~isnan(dryGrainYield)%replace the grain yields with the dry yields
            grainYield = dryGrainYield;
        end
        thousandGrainWeight = (yieldsCowpea(i).data.hundredgrainsWeight1(j) +...
            yieldsCowpea(i).data.hundredgrainsWeight2(j) +...
            yieldsCowpea(i).data.hundredgrainsWeight3(j))/0.3;
        extrapolatedGrainMass = (plantPopulation*(grainYield/10000)); %[kg/ha] conversion from  yield for 10 plants in g
        calculatedDryGrainYield = (plantPopulation*(dryGrainYield/10000)); %[kg/ha] conversion from  yield for 10 plants in g
        extrapolatedVegetativeMass = (plantPopulation*(wholePlantWeight/10000)); %[kg/ha] conversion from  yield for 10 plants in g
        seedbed = yieldsCowpea(i).data.seedbed(j);
        
        t(1,1) = plantPopulation;
        t(1,2) = extrapolatedGrainMass;
        t(1,3) = calculatedDryGrainYield;
        t(1,4) = extrapolatedVegetativeMass;
        t(1,5) = thousandGrainWeight;
        t(1,6) = totalYieldFrom25m2;
        
        cowpeaData1.plantPopulation(j).(fields2{i}) = plantPopulation;
        cowpeaData1.extrapolatedGrainMass(j).(fields2{i}) = extrapolatedGrainMass;
        cowpeaData1.extrapolatedVegetativeMass(j).(fields2{i}) = extrapolatedVegetativeMass;
        cowpeaData1.thousandGrainWeight(j).(fields2{i}) = thousandGrainWeight;
        cowpeaData1.totalYieldFrom25m2(j).(fields2{i}) = totalYieldFrom25m2;
        
        if season == LR2019
            seasontxt = "LR";
            seasontxt_alt = "LR2019";
            year = 2019;
        end
        
        if season == SR2019
            seasontxt = "SR";
            seasontxt_alt = "SR2019";
            year = 2019;
        end
        
        if season == LR2020
            seasontxt = "LR";
            seasontxt_alt = "LR2020";
            year = 2020;
        end
        
        if season == SR2020
            seasontxt = "SR";
            seasontxt_alt = "SR2020";
            year = 2020;
        end
        
        if season == LR2021 || season == LR2021_2
            seasontxt = "LR";
            seasontxt_alt = "LR2021";
            year = 2021;
        end
        Tc = [Tc;cell2table(plotCode),cell2table(cropTreatment),table(seedbed),table(seasontxt_alt),table(year),table(seasontxt),array2table(t)];
    end
    
    Tc.Properties.VariableNames = {'plotCode','cropTreatment' 'seedbed','season','year','rainySeason','plantPopulation', 'extrapolatedGrainMass',...
        'calculatedDryGrainYield','extrapolatedVegetativeMass', 'thousandGrainWeight',...
        'totalYieldFrom25m2'};
    
    yieldDataCowpea(j).data = Tc;
end

Tc= [yieldDataCowpea(1).data;yieldDataCowpea(2).data;yieldDataCowpea(3).data;...
    yieldDataCowpea(4).data;yieldDataCowpea(5).data];

% Sort the rows
Tc = sortrows(Tc,2);
Tc = sortrows(Tc,3);
Tc.block = cellfun(getNumber, Tc.plotCode);

% Total aboveground biomasses
SCTotalBiomass = T.extrapolatedGrainMass(1:15) +...
    T.extrapolatedVegetativeMass(1:15);
ICTotalBiomass = T.extrapolatedGrainMass(16:30) +...
    T.extrapolatedVegetativeMass(16:30) +...
    Tc.extrapolatedGrainMass + Tc.extrapolatedVegetativeMass;
T.totalBiomasses = [SCTotalBiomass; ICTotalBiomass];

%%  Total plot level (25 m^2) grain yields
SCPlotGrainMasses = T.totalYieldFrom25m2(1:15);
ICPlotGrainMasses = T.totalYieldFrom25m2(16:30) +...
    Tc.totalYieldFrom25m2;
T.plotTotalGrainYield = [SCPlotGrainMasses;ICPlotGrainMasses];

%% Total above ground biomasses
% And total plot level grain yields
% Calculate the above ground biomass for maize
fields1 = fieldnames(maizeData1.extrapolatedGrainMass);
for f = 1:numel(fields1)
    for i = 1:5
        maizeData1.totalBiomass(i).(fields1{f}) =...
            maizeData1.extrapolatedGrainMass(i).(fields1{f})+...
            maizeData1.extrapolatedVegetativeMass(i).(fields1{f});
        
        maizeData1.totalGrainMass(i).(fields1{f}) =...
            maizeData1.extrapolatedGrainMass(i).(fields1{f});
        
        maizeData1.plotTotalGrainYield(i).(fields1{f}) =...
            maizeData1.totalYieldFrom25m2(i).(fields1{f});
        
    end
end

% For the intercrop plots add the cowpea grain yields to the total grain
% yields and add the cowpea biomasses to the total biomass
fields2 = fieldnames(cowpeaData1.extrapolatedGrainMass);
for f = 1:numel(fields2)
    for i = 1:5
        maizeData1.totalBiomass(i).(fields2{f}) =...
            maizeData1.totalBiomass(i).(fields2{f}) +...
            cowpeaData1.extrapolatedGrainMass(i).(fields2{f})+...
            cowpeaData1.extrapolatedVegetativeMass(i).(fields2{f});
        
        maizeData1.totalGrainMass(i).(fields2{f}) =...
            maizeData1.extrapolatedGrainMass(i).(fields2{f})+...
            cowpeaData1.extrapolatedGrainMass(i).(fields2{f});
        
        maizeData1.plotTotalGrainYield(i).(fields2{f}) =...
            maizeData1.totalYieldFrom25m2(i).(fields2{f})+...
            cowpeaData1.totalYieldFrom25m2(i).(fields2{f});
    end
end

% Harvest indices
SCFlatHI = T.extrapolatedGrainMass(1:15)./(T.extrapolatedGrainMass(1:15)+T.extrapolatedVegetativeMass(1:15));
ICFlatHI = T.extrapolatedGrainMass(16:30)./(T.extrapolatedGrainMass(16:30)+T.extrapolatedVegetativeMass(16:30));
cowpeaHI = Tc.extrapolatedGrainMass./(Tc.extrapolatedGrainMass+Tc.extrapolatedVegetativeMass);
cowpeaHI(isnan(cowpeaHI)) = 0; %Change the result to 0 if NaN
HIs = [SCFlatHI; ICFlatHI];
T.HI = HIs;
Tc.HI = cowpeaHI;

% Calculate the LER
%Sole cowpea yields in TTU plots 2020: 0, 0, 317 kg/ha (= 794 g/25m2).
%LER = Intercrop Maize yield/Monocrop maize yield + Intercrop cowpea yield/mono crop cowpea yield
meanFlatLER = (nanmean(T.extrapolatedGrainMass(16:30))/nanmean(T.extrapolatedGrainMass(1:15)))+...
    (nanmean(Tc.extrapolatedGrainMass)/0);

%These are calculated accordingly because otherwise the division would be
%by 0
meanFlatLER2 = (nanmean(T.extrapolatedGrainMass(16:30))/nanmean(T.extrapolatedGrainMass(1:15)));
checkLERValues = [meanFlatLER;meanFlatLER2];

%This is to save the LER variables with more convinient names
meanFlatLER = meanFlatLER2;

% Save the variables
save yieldData.mat T Tc
save yieldDataWue.mat maizeData1 cowpeaData1

