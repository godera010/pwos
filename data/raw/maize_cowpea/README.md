********************************************************************************
Maize-cowpea intercropping dataset and scripts
********************************************************************************

Paper Title: Maize yields and water productivity as affected by cowpea
intercropping over five consecutive growing seasons in a semi-arid
environment in Kenya 

Paper DOI: https://doi.org/10.1016/j.agwat.2025.109779

Dataset DOI: https://doi.org/10.5281/zenodo.16930024

Journal: Agricultural Water Management

Authors: Juuso Tuure, Kevin Z. Mganga, Pirjo S. A. Mäkelä, Matti Räsänen,
 Petri Pellikka, Sheila Wachiye, Laura Alakukku

Corresponding Author: Juuso Tuure  
Contact Information: juuso.tuure@helsinki.fi

Date: 23/08/2025

********************************************************************************
Dataset Overview:
********************************************************************************
This dataset contains raw data collected during an
experiment on maize-cowpea intercropping over five consecutive seasons in 
semi-arid regions of Kenya. The data includes measurements of soil moisture,
temperature, crop yields and other traits, plant populations, and weather 
conditions during the study period. This dataset also contains scritps that have 
been used to process the data and produce the result figures and tables presented 
in the research article.

********************************************************************************
Dataset Contents:
********************************************************************************
1. Raw Datasets
2. Scripts
3. Functions
4. Data Usage & Citation

********************************************************************************
1. Raw Datasets:
********************************************************************************

**1.1 Soil Volumetric Water Content and Temperature Data**  
The raw data files contain data logged using Decagon EM50 dataloggers and Decagon 5TM soil sensors. The data is labeled as follows:
- `Theta` – Volumetric water content (m³/m³)
- `T` – Temperature (°C)
- `IC`: Intercrop (maize-cowpea) plot 
- `SC`: Sole crop (maize) plot
- Measurement depths are indicated as 10cm, 20cm.

Raw Data Files:
- `datalogger2_Raw.txt`
- `datalogger3_Raw.txt`
- `datalogger4_Raw.txt`
- `datalogger5_Raw.txt`

The data is also included in the MATLAB MAT-file: `rawsoildata.mat`.

**1.2 Plant Populations Data**  
This file contains recorded plant populations for each experimental plot during the experimental period. Each row represents data for one growing season:
- Row 1: Long rains 2019
- Row 2: Short rains 2019-2020
- Row 3: Long rains 2020
- Row 4: Short rains 2020-2021
- Row 5: Long rains 2021

Variables:
- `IC`: Intercrop (maize-cowpea) plot 
- `SC`: Sole crop (maize) plot

File:  
- `plantPopulations.txt

The data is also included in the MATLAB MAT-file: `plantpopulations.mat`.


**1.3 Weather Data**  
Raw weather data for the study period. Includes parameters used in the manuscript:
- `Time`: Timestamp
- `AirTC`: Air temperature (°C)
- `RH`: Relative humidity (%)
- `Rain`: Precipitation (mm)
- `WS`: Windspeed (m/s)
- `WD`: Wind direction (degrees)
- `WDSD1`: Standard deviation of wind direction (degrees)
- `Srad`: Pyranometer incoming solar radiation (W/m²)
- `pressmb`: Barometric pressure (mbar)

File:  
- `weatherData.txt`

The data is also included in the MATLAB MAT-file: `weatherData.mat`.

**1.4 Long-term Weather Data**  
This file contains the same parameters as `weatherData.txt` starting from September 2014.

File:  
- `weatherDataLongTerm.txt`
The data is also included in the MATLAB MAT-file: `weatherDataLongTerm.mat`.

**1.5 Yield Data (Maize)**  
This file contains the recorded yield components for maize.

Variables:
- `Date`: Date when the parameters were recorded
- `PlotCode`: Plot code
- `WholePlantWeight`: Sum for the 10 tagged plants (grams)
- `earsNumber`: Ears number in the 10 observed plants (pieces)
- `kernelsWeight`: Sum for the 10 tagged plants (grams)
- `hundredKernelsWeight1,2,3`: Hundred kernels weight determined from the plot's harvest (grams)
- `finalYield`: Yield for the whole 5m x 5m plot (grams)
- `dryGrainYield`: Air dried kernels weight (grams)
- `cropTreatment`: Crop treatment (maize or maize/cowpea)
- `seedbed`: Type of seedbed (Flat)
- `plantPopulation`: Plant population in the 5m x 5m plot

File:  
- `yieldsMaize.txt`

**1.6 Yield Data (Cowpea)**  
This file contains the recorded yield components for cowpea.

Variables:
- `Date`: Date when the parameters were recorded
- `PlotCode`: Plot code
- `WholePlantWeight`: Sum for the 10 tagged plants (grams)
- `podsNumber`: Pods number in the 10 observed plants (pieces)
- `podsWeight`: Sum of the 10 tagged plants (grams)
- `grainsWeight`: Sum of the 10 tagged plants (grams)
- `hundredGrainsWeight1,2,3`: Hundred grains weight (grams)
- `finalYield`: Yield for the whole 5m x 5m plot (grams)
- `dryGrainYield`: Air dried grains weight (grams)
- `cropTreatment`: Crop treatment (maize or maize/cowpea)
- `seedbed`: Type of seedbed (Flat)
- `plantPopulation`: Plant population in the 5m x 5m plot

File:  
- `yieldsCowpea.txt`

Both Maize and Cowpea yield data are included in the MATLAB MAT-file: `yields.mat`.

**1.7 Manual Observations Data**  
This file contains the manual crop observations.

Variables:
- `Date`: Date when the parameters were recorded
- `Time`: Time of day when the parameters were recorded
- `PlotCode`: Plot code
- `Crop`: Crop type (maize or cowpea)
- `PlantNumber`: Running number (1-10) of the tagged plant
- `LeafTemperature`: Leaf temperature measured with a thermogun (°C)
- `PlantHeight`: Height of the plant (cm)
- `SPAD`: Leaf relative chlorophyll content (SPAD-units)
- `Treatment`: Type of seedbed (Flat)
- `CropTreatment`: Crop treatment (maize or maize/cowpea)

File:  
- `manualObservations.txt`

The data is also included in the MATLAB MAT-file: `manualObservations.mat`.

********************************************************************************
2. Scripts:
********************************************************************************

**2.1 Scripts Overview**  
- `sortingManual.m`: Prepares and arranges the manual observation data for statistical analysis, imputes missing values.
- `soildata_preparation.m`: Fills data gaps by interpolation and processes the soil data.
- `weather_seasonal_monthly.m`: Plots weather parameters over the measurement period, calculates seasonal statistics.
- `weather_longterm.m`: Compares long-term weather statistics with the study period.
- `yieldProcessing.m`: Calculates yield statistics, prepares data for ANOVA and WUE calculations.
- `wp.m`: Calculates water productivity (WP) parameters and plots timeseries for precipitation, evapotranspiration (ETc), and soil water content (SWC).
- `statisticsYields.m`: Runs ANOVA on yield data and calculates descriptive statistics.
- `yieldFigures_and_tables.m`: Generates yield bar graphs and yield statistics tables.
- `statistics_SPAD.m`: Calculates descriptive statistics for SPAD values, performs ANOVA, and plots results.
- `statistics_Height.m`: Calculates descriptive statistics for plant height measurements, performs ANOVA, and plots results.

**2.2 Suggested Order to Run Scripts**  
1. `sortingManual.m`  
2. `soildata_preparation.m`  
3. `weatherSeasonalMonthly.m`  
4. `weahterLongterm.m`  
5. `yieldProcessing.m`  
6. `wp.m`  
7. `statisticsYields.m`  
8. `yieldFiguresTables.m.m`  
9. `statisticsSPAD.m`  
10. `statisticsHeight.m`

********************************************************************************
3. Functions:
********************************************************************************

The following functions are used in the scripts for specific calculations and plotting:

- `actVapPre.m`: Calculates the actual vapor pressure in air.
- `bigFigure.m`: Plots larger figures.
- `dailyMax.m`: Finds the daily maximum from time-series data.
- `dailyMean.m`: Calculates the daily mean from time-series data.
- `dailyMin.m`: Finds the daily minimum from time-series data.
- `dailySum.m`: Calculates the daily sum for time-series data.
- `longWave.m`: Calculates the net longwave radiation.
- `my_ph_letters_v2.m`: Script for acquiring post-hoc test letters (Tukey grouping) by Giuseppe Altieri (2025). my_ph_letters_v2 Updated version 2.00b (https://www.mathworks.com/matlabcentral/fileexchange/49725-my_ph_letters_v2-updated-version-2-00b), MATLAB Central File Exchange. Retrieved March 12, 2025. 
- `netRad.m`: Calculates the net solar radiation.
- `penmanMonteith.m`: Calculates potential evapotranspiration (ETₚ) using FAO Penman-Monteith method.
- `periodLength.m`: Calculates the length of periods when soil moisture exceeds a certain threshold.
- `permanentWaterStress.m`: Calculates when permanent water stress occurs during the growing season.
- `satVapPressure.m`: Calculates the saturated vapor pressure of air at a given temperature.
- `totalDaysAbove.m`: Returns the total number of days when soil moisture levels were above permanent water stress threshold.
- `windExtrapolate.m`: Extrapolates wind speed to a desired height.

********************************************************************************
4. Data Usage & Citation:
********************************************************************************
If you use this dataset or scripts, please cite it.
- Citation for the dataset: https://doi.org/10.5281/zenodo.16930024
- Citation for the paper: https://doi.org/10.1016/j.agwat.2025.109779


********************************************************************************
5. Contact Information:
********************************************************************************
For questions or further details, please contact:

- **Corresponding Author**: Juuso Tuure  
- **Email**: juuso.tuure@helsinki.fi

********************************************************************************
