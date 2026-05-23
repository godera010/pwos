%This function returns the daily mean of each arrays in a matrix.
%Inputs: Array, scan interval in minutes
function dailyMean = dailyMean(matrix,interval)

scansPerDay = 24/(interval/60); %Scans per day with the chosen measurement interval

[h,w] = size(matrix); %height and width of the matrix
matrix2 = zeros(floor(h/scansPerDay),w); %Pre-allocate the matrix

for i=1:floor(h/scansPerDay)
    for j = 1:w
        matrix2(i,j) = nanmean(matrix((i-1)*scansPerDay+1:i*scansPerDay,j));
    end
end

dailyMean = matrix2;
end