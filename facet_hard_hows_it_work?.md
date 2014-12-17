Facet plan

Grid:
  ylabel is always on the right.
  The last column of facets should be plotDim.x + "facet label y" wide
  The first column of facets should be plotDim.x + plot margin left wide
  The first row should be plotDim.y + "facet label x" tall
  The last row should be plotDim.x + "plot margin bottom" tall


  svg-wrap:
    - holds .plot-svg, .facet-title-x and .facet-title-y
    - if in coordinate 1,1 needs both x and y titleSize added to width and height
    - if on first row, needs only x titleSize added to it
    - if on last column, needs y titleSize added
    - Bottom row needs plot.margin().bottom added
    - first column needs plot.margin().left added 
    - all cells need facet.margin().x and facet.margin().y added

  plot-svg:
    - holds .xgrid, .ygrid, .x.axis, .y.axis and the .plot area
    - if inner, it needs to move left or down only by the facet's margins
    - if first row, needs to move down by titleSize[0]
    - if first column, needs to 


Wrap:
  svg-wrap:
  - facet margins are ignored
  - holds .plot-svg and .facet-title-x no. No .facet-title-y
  - titleSize x is added to height and all margins are added to size

  plot-svg:
    - is not adjusted x or y:

