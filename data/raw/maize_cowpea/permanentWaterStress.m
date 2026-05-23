%The function returns the DAS (days after sowing) when permanent water
%stress (s<s*) occured. Meaning that s < s* until the end of the growing season. 
%Input parameters: 
%-matrix = relative soil moisture (s) matrix
%sStar = s*, water stress limit of crop
%time array
%Start date of growing season. 
function permanentWaterStress = permanentWaterStress(matrix, sStar, timeArray, startGs)

[h,w] = size(matrix);
matrix2 = zeros(h,w);

%Calcuate the length of periods with consecutive days when s<s*
for i = 1:h
    for j= 1:w
        if i == 1
            if matrix(i,j) < sStar
                matrix2(i,j) = 1;
            elseif matrix(i,j) >= sStar
                matrix2(i,j) = 0;
            end
        else
            if matrix(i,j) < sStar
                matrix2(i,j) = matrix2(i-1,j)+1 ;
            elseif matrix(i,j) >= sStar
                matrix2(i,j) = 0;
            end
        end
    end
end

%permanentWaterStress = matrix2;
indexOfFirstDayPermanentWaterStress = find(matrix2==1);
indexOfFirstDayPermanentWaterStress = indexOfFirstDayPermanentWaterStress(end); 

permanentWaterStressDay = timeArray(indexOfFirstDayPermanentWaterStress);
permanentWaterStress =  daysact(startGs,  permanentWaterStressDay);

end