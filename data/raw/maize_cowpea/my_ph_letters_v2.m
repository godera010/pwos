function [ o ] = my_ph_letters_v2( cmat, hmat )
%.
%  VERSION: 2.00b
% SOLUTION: of the Tukey grouping of means.
%    USING: the clique edge cover problem solution.
%       BY: Classic Bron–Kerbosch algorithm or Tomita
%           variation of Bron–Kerbosch algorithm.
%
%   [ o ] = my_ph_letters_v2( cmat )
%   [ o ] = my_ph_letters_v2( [], hmat )
%
% HMAT is the dependencies array
% CMAT is the array arising from MULTCOMPARE
%
% EXAMPLE
% -------
% For 3 treatments and 4 replications.
% ANOVA, post-hoc with MULTCOMPARE using HSD Tukey
% at 5% significance level, and grouping.
%
%   x = meshgrid(1:3,1:4);
%   rng default; % For reproducibility
%   x = x + normrnd(0,1,4,3)
% 	[p,t,s] = anova1(x);
% 	[c,m,h,gnames] = multcompare(s,'alpha',0.05,'ctype','hsd');
%   n=max(max(c(:,1:2)));
%   h=zeros(n);
%   for k=1:size(c,1)
%     i=c(k,1); j=c(k,2);
%     if c(k,3)*c(k,5)<=0, h(i,j)=1; end
%   end
% 	grp1 = my_ph_letters_v2(c)
% 	grp2 = my_ph_letters_v2([],h)
%
% x =
% 
%     1.5377    2.3188    6.5784
%     2.8339    0.6923    5.7694
%    -1.2588    1.5664    1.6501
%     1.8622    2.3426    6.0349
% 
% 
% grp1 = 
% 
%     'a'    'ab'    'b'
% 
% 
% grp2 = 
% 
%     'a'    'ab'    'b'
%
% --------------------------------------
% >>> If considered useful,
% >>> It will be appreciated a postcard. 
% --------------------------------------
%
% Author: Giuseppe Altieri
% University of Basilicata
% Department SAFE
% Viale dell'Ateneo Lucano, 10
% I-85100 Potenza, Italy
%
% Build Date: 16-02-2015
%
% version 2.00b
% 04-05-2016: corrected a bug into example script
%

if isempty(cmat)
    hhmat=hmat;
    n=size(hmat,1);
else
    n=max(max(cmat(:,1:2)));
    hhmat=zeros(n);
    for k=1:size(cmat,1)
        i=cmat(k,1); j=cmat(k,2);
        if cmat(k,3)*cmat(k,5)<=0, hhmat(i,j)=1; end
    end
end
%-------------------------------------------
% Solve the clique edge cover problem by the
% Bron–Kerbosch algorithm.
% The Bron–Kerbosch algorithm is an algorithm
% for finding maximal cliques in an undirected graph.
%
%
%
R=BronKerboschClassic( {}, [], 1:n, [], hhmat);
% R=Tomita( {}, [], 1:n, [], hhmat);

%
%-------------------------------------------
% Check for redundancy and delete it
% Only unique maximal cliques are accepted
%
for i=1:length(R)
    vi=R{i};
    for j=[1:i-1 i+1:length(R)]
        vj=R{j};
        for k=1:length(vj)
            f=any(vi==vj(k));
            if ~f, break, end
        end
        % delete the clique J if included in I
        if f, R{j}=[]; end
    end
end

%-------------------------------------------
% assign ascending letters to maximal cliques
%
t=zeros(length(R),n);
for i=1:length(R)
    if ~isempty(R{i}), t(i,R{i})=i; end
end
%-------------------------------------------
% remake ascending lettering
%
nt=zeros(1,max(max(t)));
gr=1;
for i=find(t)'
    v=t(i);
    if nt(v)
       t(i)=nt(v); 
    else
       nt(v)=gr; t(i)=gr; gr=gr+1;
    end
end
%
%-------------------------------------------
% build letters
%
o=cell(1,n);
for i=1:n
    o{i}=sort(char('a'-1+t(logical(t(:,i)),i)'));
end
%
%-------------------------------------------
% verify the assigned letters using HMAT
%
for i=1:n-1
    for j=i+1:n
        si=double(o{i});
        sj=double(o{j});
        %-----------------------
        % test dependency
        for k=1:length(si)
           dip=any(sj==si(k));
           if dip, break, end
        end
        %-----------------------
        if ~hhmat(i,j)
            if dip, error('*** VERIFY ERROR (IS DEPENDENT).'), end
        else
            if ~dip, error('*** VERIFY ERROR (IS INDEPENDENT).'), end
        end
    end
end

end
%
%-------------------------------------------
% Classic Bron–Kerbosch algorithm
% function BronKerboschClassic( A, R, P, X )
%        if P and X are both empty:
%            report R as a maximal clique
%            adding to A
%        for each vertex v in P:
%            BronKerbosch1(R ? {v}, P ? N(v), X ? N(v))
%            P := P \ {v}
%            X := X ? {v}
%
% Tomita et al.
% Variation of the Bron–Kerbosch algorithm
% function Tomita( A, R, P, X )
%        if P and X are both empty:
%            report R as a maximal clique
%            adding to A
% choose pivot vertex u in (P ? X) as the vertex with
% highest number of neighbors in P
%        for each vertex v in P\N(u):
%            Tomita(R ? {v}, P ? N(v), X ? N(v))
%            P := P \ {v}
%            X := X ? {v}
%
function [a]=Tomita( A, R, P, X, h)
    if isempty(P) && isempty(X)
        a=[A;R]; % add the clique
        return
    end
    % choose the PIVOT u
    LNu=h([P X],:);
    LNu(:,X)=0;
    [~,Nu]=sort(sum(LNu,2)','descend'); % in Nu are the sorted neighbors
    for i=1:length(Nu)
       u=Nu(i);
       f=any(P==u);
       if f, break, end % the pivot was found
    end
    if ~f
        %  ____ TOMITA algorithm ____
        % We have problems with PIVOTING.
        % More investigations are needed.
        %
        u=P(1);
        disp('*** UNABLE to find PIVOT.') 
    end
    % find N(u)
    Nu=find(h(u,:));
    qap=P;
    qax=X;
    qar=R;
    a=A;
    for v=P % for each vertex v in P\N(u)
        if ~any(Nu==v)
            Nv=find(h(v,:)); % find connected nodes
            a=Tomita( a,...
                      [qar v],...
                      fn_intersect(qap,Nv),...
                      fn_intersect(qax,Nv),...
                      h);
            qax=[qax v];
            qap=qap(qap~=v);
        end
    end
end
function [a]=BronKerboschClassic( A, R, P, X, h)
    if isempty(P) && isempty(X)
        a=[A;R]; % add the clique
        return
    end
    qap=P;
    qax=X;
    qar=R;
    a=A;
    for v=P
        Nv=find(h(v,:)); % find connected nodes
        a=BronKerboschClassic( a,...
                         [qar v],...
                         fn_intersect(qap,Nv),...
                         fn_intersect(qax,Nv),...
                         h);
        qax=[qax v];
        qap=qap(qap~=v);
    end
end
function [c]=fn_intersect(a,b)
    c=[];
    if isempty(a) || isempty(b), return, end
    for i=1:length(a)
        v=a(i);
        if v>0
        if any(b==v)
            c=[c v];
        end
        else
            c=[c v];
        end
    end
end
