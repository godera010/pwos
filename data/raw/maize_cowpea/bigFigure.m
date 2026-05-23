function f = bigFigure(shape)
% Create a figure 2x larger in one direction (or square)
% Examples: 
%   bigFigure("square") % default
%   bigFigure("tall") 
%   bigFigure("wide") 
% Convert inputs
if nargin < 1 
    shape = "square";
end
shape = convertCharsToStrings(shape);
% Create figure with desired ratio
f = figure;
if shape == "square"
    f.Position = f.Position.*[1 1 2 2];
elseif shape == "tall" || shape == "long"
    f.Position = f.Position.*[1 1 1 2];
elseif shape == "wide"
    f.Position = f.Position.*[1 1 2 1];
end