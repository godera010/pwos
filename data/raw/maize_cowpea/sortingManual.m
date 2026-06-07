% Written by Juuso Tuure (juuso.tuure@helsinki.fi) 2025
% This script prepares and arranges the manual observation data for statistical analysis and imputes missing observation values 

close all; close all hidden; clear; clc;

load manualObservations.mat

% Define the conditions for filtering
gsData = {'gs1','gs2','gs3','gs4','gs5'}; % Data sources
cropTreatments = {'Solecrop', 'Intercrop'}; % Crop treatments
treatments = {'Flat'}; % Treatments
attributes = {'PlantHeight', 'SPAD'}; % Attributes to filter
crops = {'Maize', 'Cowpea'}; % Crops to filter

% Initialize a structure to store results
results = struct();

% Loop through combinations of conditions for both Maize and Cowpea
for g = 1:numel(gsData) % Iterate over gs3 and gs4
    for c = 1:numel(crops) % Iterate over Maize and Cowpea
        for ct = 1:numel(cropTreatments) % Solecrop, Intercrop
            for t = 1:numel(treatments) % Flat, Raised
                for a = 1:numel(attributes) % PlantHeight, SPAD
                    
                    % Construct a dynamic field name for storing results
                    fieldName = sprintf('%s_%s_%s_%s_%s', gsData{g}, crops{c}, treatments{t}, cropTreatments{ct}, attributes{a});
                    
                    % Choose the appropriate filter function based on crop type
                    if strcmp(crops{c}, 'Maize')
                        % Call the Maize filter function
                        results.(fieldName) = filterMaizeParameter(manual.(gsData{g}), crops{c}, ...
                            cropTreatments{ct}, treatments{t}, attributes{a});
                    elseif strcmp(crops{c}, 'Cowpea')
                        % Call the Cowpea filter function
                        results.(fieldName) = filterCowpeaParameter(manual.(gsData{g}), crops{c}, ...
                            cropTreatments{ct}, treatments{t}, attributes{a});
                    end
                    
                end
            end
        end
    end
end


% Remove these manually (some bug causes them to appear)
results.gs3_Cowpea_Raised_Solecrop_PlantHeight = [];
results.gs3_Cowpea_Raised_Solecrop_SPAD = [];

% Remove empty cells from the structre
% Get all field names
fields = fieldnames(results);

% Loop through the fields
for i = 1:numel(fields)
    fieldName = fields{i};
    
    % Check if the field contains an empty value
    if isempty(results.(fieldName))
        % Remove the field
        results = rmfield(results, fieldName);
    end
end


%% Conditioning the data
% Exclude NaN rows from the end of LR2020

fieldsToAdjustMaize = {'gs3_Maize_Flat_Solecrop_PlantHeight',...
    'gs3_Maize_Flat_Solecrop_SPAD',...
    'gs3_Maize_Flat_Intercrop_PlantHeight',...
    'gs3_Maize_Flat_Intercrop_SPAD'};

for i = 1:numel(fieldsToAdjustMaize)
    results.(fieldsToAdjustMaize{i}) = results.(fieldsToAdjustMaize{i})(1:10, :);
end

fieldsToAdjustCowpea = {'gs3_Cowpea_Flat_Intercrop_PlantHeight',...
    'gs3_Cowpea_Flat_Intercrop_SPAD'};

for i = 1:numel(fieldsToAdjustCowpea)
    results.(fieldsToAdjustCowpea{i}) = results.(fieldsToAdjustCowpea{i})(1:13, :);
end

%Impute the missing canopy height values using knnimpute (Euclidian distance)
results.gs3_Cowpea_Flat_Intercrop_PlantHeight =...
    knnimpute(results.gs3_Cowpea_Flat_Intercrop_PlantHeight);

results.gs3_Cowpea_Flat_Intercrop_PlantHeight(all(isnan(...
    results.gs3_Cowpea_Flat_Intercrop_PlantHeight),2),:) = [];

%Impute missing values for Cowpea using knnimpute (Euclidian distance)
results.gs3_Cowpea_Flat_Intercrop_SPAD = knnimpute(...
    results.gs3_Cowpea_Flat_Intercrop_SPAD);

%Impute missing values for maize using knnimpute (Euclidian distance)
results.gs3_Maize_Flat_Intercrop_SPAD = knnimpute(...
    results.gs3_Maize_Flat_Intercrop_SPAD);


%% Condition data for GS4 (SR2020)
% Remove the two first rows of observations for GS4 as they are NaN

fieldsToAdjust2 = {'gs4_Maize_Flat_Intercrop_SPAD',...
    'gs4_Maize_Flat_Solecrop_SPAD',...<f
    'gs4_Cowpea_Flat_Intercrop_SPAD'};


for f = 1:numel(fieldsToAdjust2)
    results.(fieldsToAdjust2{f}) = results.(fieldsToAdjust2{f})(3:end, :);
end
%%

%Impute the missing NaN values for GS4
results.gs4_Maize_Flat_Intercrop_SPAD = knnimpute(...
    results.gs4_Maize_Flat_Intercrop_SPAD);

results.gs4_Cowpea_Flat_Intercrop_SPAD = knnimpute(...
    results.gs4_Cowpea_Flat_Intercrop_SPAD);

results.gs4_Maize_Flat_Intercrop_PlantHeight =...
    knnimpute(results.gs4_Maize_Flat_Intercrop_PlantHeight);

results.gs4_Maize_Flat_Intercrop_PlantHeight =...
    knnimpute(results.gs4_Maize_Flat_Intercrop_PlantHeight);

results.gs4_Cowpea_Flat_Intercrop_PlantHeight =...
    knnimpute(results.gs4_Cowpea_Flat_Intercrop_PlantHeight);

% Get the observation dates 
for i = 1:5
    manualObservationDates{i,1} = unique(manual.(gsData{i}).block1(1).plotData.Date);
end

save manualMeasurementsResults.mat results manualObservationDates

function allValues = filterMaizeParameter(Data, cropString, cropTreatmentString, treatmentString, parameter)
% Inputs:
% - plotData: A structured dataset containing maizePlantData for all blocks, plots, and plants.
% - cropString: String to match in the 'Crop' field (e.g., 'Maize').
% - cropTreatmentString: String to match in the 'CropTreatment' field (e.g., 'Solecrop').
% - treatmentString: String to match in the 'Treatment' field (e.g., 'Flat').

% Define the number of blocks, plots, and plants
numBlocks = 3;
numPlots = 2;
numPlants = 10;

% Preallocate filteredPlantHeight as a cell array
filteredPlantHeight = cell(numBlocks, numPlots, numPlants);

% Loop through blocks, plots, and plants
for block = 1:numBlocks
    for plot = 1:numPlots
        % Extract plot data
        currentPlotData = Data.(['block' num2str(block)])(plot).maizePlantData;
        
        for plant = 1:numPlants
            % Extract plant data
            plantData = currentPlotData{1, plant};
            
            % Check conditions
            isCropValid = strcmp(plantData.Crop, cropString);
            isSoleCrop = strcmp(plantData.CropTreatment, cropTreatmentString);
            isTreatmentFlat = strcmp(plantData.Treatment, treatmentString);
            
            % Combine conditions
            validRows = isCropValid & isTreatmentFlat & isSoleCrop;
            
            % Filter PlantHeight
            filteredPlantHeight{block, plot, plant} = plantData.(parameter)(validRows);
        end
    end
end

% Concatenate non-empty 14x1 columns into a 14xX matrix
allValues = [];
for block = 1:numBlocks
    for plot = 1:numPlots
        for plant = 1:numPlants
            % Check if the current cell contains a non-empty double vector
            if ~isempty(filteredPlantHeight{block, plot, plant})
                % Append the 14x1 column vector to the result matrix
                allValues = [allValues, filteredPlantHeight{block, plot, plant}];
            end
        end
    end
end
end


function allValues = filterCowpeaParameter(Data, cropString, cropTreatmentString, treatmentString, parameter)
% Define the number of blocks, plots, and plants
numBlocks = 3;
numPlots = 2;
numPlants = 10;

% Preallocate filteredPlantHeight as a cell array
filteredPlantHeight = cell(numBlocks, numPlots, numPlants);

% Loop through blocks, plots, and plants
for block = 1:numBlocks
    for plot = 1:numPlots
        % Extract plot data
        currentPlotData = Data.(['block' num2str(block)])(plot).cowpeaPlantData;
        
        for plant = 1:numPlants
            % Extract plant data
            plantData = currentPlotData{1, plant};
            
            % Check conditions only if plantData is not empty and is a struct
            if ~isempty(plantData)
                isCropValid = strcmp(plantData.Crop, cropString);
                isSoleCrop = strcmp(plantData.CropTreatment, cropTreatmentString);
                isTreatmentFlat = strcmp(plantData.Treatment, treatmentString);
                
                % Combine conditions
                validRows = isCropValid & isTreatmentFlat & isSoleCrop;
                
                % Filter PlantHeight
                filteredPlantHeight{block, plot, plant} = plantData.(parameter)(validRows);
            else
                filteredPlantHeight{block, plot, plant} = [];
            end
        end
    end
end

% Concatenate non-empty 14x1 columns into a 14xX matrix
allValues = [];
for block = 1:numBlocks
    for plot = 1:numPlots
        for plant = 1:numPlants
            % Check if the current cell contains a non-empty double vector
            if ~isempty(filteredPlantHeight{block, plot, plant})
                % Append the 14x1 column vector to the result matrix
                allValues = [allValues, filteredPlantHeight{block, plot, plant}];
            end
        end
    end
end
end





