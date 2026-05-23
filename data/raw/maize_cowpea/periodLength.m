function periodLength = periodLength(matrix,sStar)

[h,w] = size(matrix);
matrix2 = zeros(h,w);


%Calcuate the length of periods with consecutive days when s>s*
for i = 1:h
    for j= 1:w
        if i == 1
            if matrix(i,j) > sStar
                matrix2(i,j) = 1;
            elseif matrix(i,j) <= sStar
                matrix2(i,j) = 0;
            end
        else
            if matrix(i,j) > sStar
                matrix2(i,j) = matrix2(i-1,j)+1 ;
            elseif matrix(i,j) <= sStar
                matrix2(i,j) = 0;
            end
        end
    end
end

periodLength = matrix2;


end