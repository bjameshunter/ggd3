function Facet(spec) {
  if(!(this instanceof Facet)){
    return new ggd3.facet(spec);
  }
  var attributes = {
    x: null,
    y: null,
    by: null, // add another 
    type: "wrap", // grid or wrap?
    scales: "fixed", // "free_x", "free_y"
    space: "fixed", // eventually "free_x" and "free_y"
    plot: null, 
    nrows: null,
    ncols: null,
    margins: {x: 5, y:5}, 
    titleSize: [20, 20],
    textAnchorX: "middle",
    textAnchorY: "middle",
    // function to label facets.
    labels: null,
    // manual vertical shift downward of every facet
    // in case you want top-oriented top-position x-axis
    // maybe should be on plot object.
    vShift: 0, 
    // inherit from plot, but allow override
    // if scales are fixed, much smaller margins
    // because scales won't be drawn for inner plots.
  };
  // store number of facet svgs made to 
  // limit number to nFacets later
 this.nSVGs = 0;
  if(typeof spec === "object"){
    for(var s in spec) {
      attributes[s] = spec[s];
    }
  }
  this.attributes = attributes;
  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}


Facet.prototype.updateFacet = function(sel) {
  var that = this,
      data = this.plot().data(),
      nrows, ncols;
  this.xFacets = ["single"];
  this.yFacets = ["single"];
  // rules of faceting:
  // specify either x and y or an x or y with nrows or ncols
  if( this.x() ) {
    // x is always first nest
    this.xFacets = _.unique(_.map(data, function(d) {
      return d.key;
    }));
  }
  if( this.y() ){
    // if facet.y is specified, it might be the first or
    // second nest
    if(!this.x() ){
      this.yFacets = _.unique(_.map(data, function(d) {
        return d.key;
      }));
    } else {
      this.yFacets = _.unique(
                      _.flatten(
                        _.map(
                          data, function(d) {
                            return _.map(d.values, 
                              function(v) {
                                return v.key;
                              });
                        })
                      )
                    );
    }
  }

  this.nFacets = this.xFacets.length * this.yFacets.length;

  if( this.scales() !== "fixed" && this.type()==="grid"){
    throw ("facet type of 'grid' requires fixed scales." + 
            " You have facet scales set to: " + this.scales());
  }
  // if only x or y is set, user should input # rows or columns
  if( ( this.x() && this.y() ) && 
     ( this.ncols() || this.nrows() ) ){
    throw ('specifying x and y facets with ncols or nrows' +
                  " is not supported");
  }
  if( this.ncols() && this.nrows() ){
    throw ("specify only one of ncols or nrows");
  }
  if( (this.x() && !this.y()) || (this.y() && !this.x()) ){
    if(!this.ncols() && !this.nrows()){
      throw("specify one of ncols or nrows if setting only" +
            " one of facet.x() or facet.y()");
    }
    if(this.nrows() && !this.ncols()) {
      this._ncols = Math.ceil(this.nFacets/this.nrows()); 
      this._nrows = this.nrows();
    }
    if(this.ncols() && !this.nrows()) {
      this._nrows = Math.ceil(this.nFacets/this.ncols());
      this._ncols = this.ncols();
    }
  }
  if(!this.ncols() && !this.nrows() ) {
    this._nrows = this.yFacets.length;
    this._ncols = this.xFacets.length;
  }

  var rows = sel.selectAll('div.row')
              .data(_.range(this._nrows));
  rows
    .attr('id', function(d) { return "row-" + d; })
    .each(function(d, i) {
      that.makeDIV(d3.select(this), d);
    });
  rows.enter()
    .append('div')
    .attr('class', 'row')
    .attr('id', function(d) { return "row-" + d; })
    .each(function(d, i) {
      that.makeDIV(d3.select(this), d);
    });
  rows.exit().remove();
};

// makes appropriate number of divs required by the row.
Facet.prototype.makeDIV = function(sel, rowNum) {
  var ncols = this._ncols,
      remainder = this.nFacets % ncols,
      that = this,
      row = sel.selectAll('div.plot-div')
               .data(_.range((this.nFacets - this.nSVGs) > remainder ? 
                     ncols: remainder));
  row
    .each(function(colNum) {
      that.makeSVG(d3.select(this), rowNum, colNum);
    });
  row.enter().append('div')
    .attr('class', 'plot-div')
    .each(function(colNum) {
      d3.select(this).append('div')
        .attr('class', 'ggd3tip')
        .style('opacity', 0)
        .append('div').attr('class', 'tooltip-content');
      that.makeSVG(d3.select(this), rowNum, colNum);
    });
  row.exit().remove();
};

// makes SVG and calls makeTitle, makeCell and makeClip
Facet.prototype.makeSVG = function(sel, rowNum, colNum) {
  var that = this,
      plot = this.plot(),
      x = sel.data()[0], 
      dim = this.svgDims(rowNum, colNum),
      svg = sel.attr('id', function(d) {
                return that.id(d, rowNum);
               })
              .selectAll('svg.svg-wrap')
              .data([0]);

  svg
    .attr('width', dim.x)
    .attr('height', dim.y)
    .each(function(d) {
      that.makeTitle(d3.select(this), colNum, rowNum);
      var sel = d3.select(this).select('.plot-svg');
      sel.attr({col: colNum, row: rowNum});
      that.makeCell(sel, x, rowNum, that._ncols);
      that.makeClip(sel, x, rowNum);
    });
  svg.enter().append('svg')
    .attr('class', 'svg-wrap')
    .attr('width', dim.x)
    .attr('height', dim.y)
    .each(function(d) {
      that.makeTitle(d3.select(this), colNum, rowNum);
      var sel = d3.select(this).selectAll('.plot-svg')
                  .data([0]);
      sel
        .attr({col: colNum, row: rowNum});
      sel.enter().append('svg')
        .attr({col: colNum, row: rowNum})
        .attr('class', 'plot-svg');
      that.makeCell(sel, x, rowNum, that._ncols);
      that.makeClip(sel, x, rowNum);
    });
  svg.exit().remove();
  that.nSVGs += 1;
};

/* 
  decides how big the svg-wrap needs to be based on 
  rowNum and colNum. Grid style facet only needs additional 
  room on the left most column and bottom most row.
  Wrap style facets need each to be the same size.
*/
Facet.prototype.svgDims = function(rowNum, colNum) {
  var pd = this.plot().plotDim(),
      m = this.plot().margins(),
      fm = this.margins(),
      vShift = this.vShift(),
      dim = {
        // outer svg width and height
        x: pd.x,
        y: pd.y,
        // facet title shift left and down
        ftx: 0,
        fty: 0,
        // plot g elements shifts left and down
        px: 0,
        py: 0,
        // plot dimensions - straight from ggd3.plot()[width|height]()
        plotX: pd.x,
        plotY: pd.y,
      }, 
      ts = this.titleSize();
  if(this.type() === "grid"){
    if(colNum === 0){
      dim.x += m.left + fm.x; 
      dim.px += m.left;
      dim.ftx += m.left;
    } else {
      dim.x += fm.x;
    }
    if(colNum === (this._ncols - 1)){
      dim.x += ts[1] + m.right + fm.x;
    }
    if(rowNum === 0){
      // if titleSize[0] is zero, give a little room
      // for the y-axis to be visible.
      dim.y += (ts[0] + vShift) || 10;
      dim.py += (ts[0] + vShift) || 10;
      dim.fty += (ts[0] + vShift) || 10;
    } else {
      dim.y += fm.y + vShift;
      dim.py += fm.y + vShift;
      dim.fty += fm.y + vShift;
    }
    if(rowNum === (this._nrows - 1)){
      dim.y += m.bottom + fm.y + vShift; 
    }
  } else {
    dim.x += m.left + m.right;
    dim.y += ts[0] + m.top + m.bottom  + vShift;
    dim.ftx += m.left;
    dim.px += m.left;
    dim.py += (ts[0] + vShift) || 10;
  }
  return dim;
};

Facet.prototype.makeClip = function(selection, x, y) {
    // if either xAdjust or yAdjust are present
  var clip = selection.selectAll('defs')
              .data([0]),
      id = this.id(x, y) + this.plot().id() + "-clip",
      dim = this.plot().plotDim();
  clip.select('.clip')
      .attr('id', id)
      .select('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', dim.x)
      .attr('height', dim.y);
  clip.enter().insert('defs', "*")
      .append('svg:clipPath')
      .attr('class', 'clip')
      .attr('id', id)
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', dim.x)
      .attr('height', dim.y);
  selection.select('g.plot')
    .attr('clip-path', "url(#" + id + ")");
};

function rep(s) {
  return s.replace(' ', '-');
}

Facet.prototype.id = function(x, y) {

  if(this.x() && this.y()) {
    return rep(this.y() + "-" + this.yFacets[y]  + '_' + 
    this.x() + "-" + this.xFacets[x]);
  } else if(this.x()){
    return rep(this.x() + "-" + this.xFacets[this.nSVGs]);
  } else if(this.y()){
    return rep(this.y() + "-" + this.yFacets[this.nSVGs]);
  } else {
    return 'single';
  }
};

Facet.prototype.makeCell = function(selection, colNum, rowNum, 
                                    ncols) {
  var margins = this.plot().margins(),
      dim = this.svgDims(rowNum, colNum),
      that = this,
      // are we on the last row?
      gridX = this.type() === "grid" && rowNum === (this._nrows -1),
      // are we on the first column?
      gridY = this.type() === "grid" && colNum === 0;

  this.makeG(selection, "xgrid", "")
    .attr("transform", "translate(" + [dim.px,dim.py] + ")");
  this.makeG(selection, "ygrid", "")
    .attr("transform", "translate(" + [dim.px,dim.py] + ")");

  var plot = selection.selectAll('g.plot')
                .data([0]);
  plot.transition()
    .attr("transform", "translate(" + [dim.px,dim.py] + ")")
    .select('rect.background')
    .attr({x: 0, y:0, 
      width: dim.plotX, height:dim.plotY});
  plot.enter().append('g')
    .attr('class', 'plot')
    .attr("transform", "translate(" + [dim.px,dim.py] + ")")
    .append('rect')
    .attr('class', 'background')
    .attr({x: 0, y:0, 
      width: dim.plotX, height:dim.plotY});
  plot.exit().remove();

  if(gridX){
    this.makeG(selection, "x axis", " grid")
    .attr("transform", "translate(" + [dim.px,dim.py] + ")");
  } else if(this.type() !== "grid") {
    this.makeG(selection, "x axis", "")
    .attr("transform", "translate(" + [dim.px,dim.py] + ")");
  }
  if(gridY){
    this.makeG(selection, "y axis", " grid")
    .attr("transform", "translate(" + [dim.px,dim.py] + ")");
  } else if(this.type() !== "grid"){
    this.makeG(selection, "y axis", "")
    .attr("transform", "translate(" + [dim.px,dim.py] + ")");
  }
};
// make a g element with the given classes
Facet.prototype.makeG = function (sel, cls, cls2) {
  var both = cls + cls2;
  var g = sel.selectAll('g.' + both.replace(/ /g, "."))
    .data([0]);
  g.enter().append('g')
    .attr('class', cls + cls2);
  g.exit().remove();
  return g;
};

Facet.prototype.makeTitle = function(sel, colNum, rowNum) {
  var that = this,
      ts = this.titleSize(),
      dim = this.svgDims(rowNum, colNum);
  var xlab = sel.selectAll('svg.facet-title-x')
              .data([that.x() + " - " + that.xFacets[colNum]]);
  var ylab = sel.selectAll('svg.facet-title-y')
              .data([that.y() + " - " + that.yFacets[rowNum]]);
  if(this.type() !== "grid" || rowNum === 0 && this.x()){
    xlab.enter().append('svg')
        .attr('class', 'facet-title-x')
        .attr({width: dim.x - dim.ftx, x:dim.ftx,
          height: ts[0]})
        .each(function() {
          d3.select(this).append('rect')
            .attr('class', 'facet-label-x')
            .attr({width: dim.plotX, //x: dim.ftx,
              height: ts[0]});
          d3.select(this).append('text');
        });
    xlab.select('text')
        .attr({fill: 'black',
          opacity: 1,
          x: (dim.x - dim.ftx)/2,
          y: ts[0] * 0.8,
          "text-anchor": that.textAnchorX()})
        .text(_.identity);
  }
  if(that.type() === "grid" && colNum === (this._ncols - 1) && this.y()){
    ylab.enter().append('svg')
        .attr('class', 'facet-title-y')
        .each(function() {
          d3.select(this).append('rect')
            .attr('class', 'facet-label-y');
          d3.select(this).append('text');
        });
    ylab
      .attr({width: ts[1],
          height: dim.plotY,
          x: (that._ncols === 1) ? dim.plotX + dim.ftx:dim.plotX,
          y: dim.fty})
      .select('rect')
      .attr({width: ts[1], 
        height: dim.plotY});
    ylab.select('text')
        .attr({fill: 'black',
            opacity: 1,
            x: dim.plotY/2,
            y: -ts[1]*0.25,
            "text-anchor": that.textAnchorY(),
            transform: "rotate(90)"})
        .text(_.identity);
  }
  // add labels to wrap-style faceting.
  if(this.type() === "wrap"){
    xlab.select('text')
        .text(that.wrapLabel(rowNum, colNum));
    sel.select('.facet-title-y')
      .remove();
  }
};

Facet.prototype.wrapLabel = function(row, col) {
  var that = this;
  if(this.x() && !this.y()){
    return this.x() + " - " + this.xFacets[this.nSVGs];
  }
  if(this.y() && !this.x()){
    return this.y() + " - " + this.yFacets[this.nSVGs];
  }
  if(this.x() && this.y()){
    return this.yFacets[row] + "~" + this.xFacets[col];
  }
};

ggd3.facet = Facet;
