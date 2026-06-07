%The function returns the total number of days  when soil moisture levels (s) were above permanent water stress treshold (s*). 
%Input parameters: 
%-matrix = relative soil moisture (s) matrix
%sStar = s*, water stress limit of crop


function totalDaysAbove = totalDaysAbove(matrix,sStar)

[h,w] = size(matrix);
matrix2 = zeros(h,w);


for i = 1:h
    for j= 1:w
        if matrix(i,j) > sStar
            matrix2(i,j) = 1;
        elseif matrix(i,j) <= sStar
            matrix2(i,j) = 0;
        end
    end
end
totalDaysAbove = sum(matrix2);
end