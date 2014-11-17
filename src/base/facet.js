function Facet(spec) {
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
    titleProps: null,
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


Facet.prototype.updateFacet = function() {
  var that = this,
      data = this.plot().data(),
      nrows, ncols;
  this.calculateMargins();
  that.xFacets = ["single"];
  that.yFacets = ["single"];
  // rules of faceting:
  // specify either x and y or an x or y with nrows or ncols
  if(!_.isNull(that.x())) {
    // x is always first nest
    that.xFacets = _.unique(_.map(data, function(d) {
      return d.key;
    }));
  }
  if(!_.isNull(that.y()) ){
    // if facet.y is specified, it might be the first or
    // second nest
    if(_.isNull(that.x()) ){
      that.yFacets = _.unique(_.map(data, function(d) {
        return d.key;
      }));
    } else {
      that.yFacets = _.unique(
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
  that.nFacets = that.xFacets.length * that.yFacets.length;

  if( that.scales() !== "fixed" && that.type()==="grid"){
    throw ("facet type of 'grid' requires fixed scales." + 
            " You have facet scales set to: " + that.scales());
  }
  // if only x or y is set, user should input # rows or columns
  if( ( that.x() && that.y() ) && 
     ( that.ncols() || that.nrows() ) ){
    throw ('specifying x and y facets with ncols or nrows' +
                  " is not supported");
  }
  if( that.ncols() && that.nrows() ){
    throw ("specify only one of ncols or nrows");
  }
  if( (that.x() && !that.y()) || (that.y() && !that.x()) ){
    if(!that.ncols() && !that.nrows()){
      throw("specify one of ncols or nrows if setting only" +
            " one of facet.x() or facet.y()");
    }
    if(that.nrows() && !that.ncols()) {
      that._ncols = Math.ceil(that.nFacets/that.nrows()); 
      that._nrows = that.nrows();
    }
    if(that.ncols() && !that.nrows()) {
      that._nrows = Math.ceil(that.nFacets/that.ncols());
      that._ncols = that.ncols();
    }
  }
  if(!that.ncols() && !that.nrows() ) {
    that._nrows = that.yFacets.length;
    that._ncols = that.xFacets.length;
  }

  function update(sel) {
    var rows = sel.selectAll('div.row')
                .data(_.range(that._nrows));
    rows
      .attr('id', function(d) { return "row-" + d; })
      .each(function(d, i) {
        that.makeDIV(d3.select(this), d, that._ncols);
      });

    rows.enter()
      .append('div')
      .attr('class', 'row')
      .attr('id', function(d) { return "row-" + d; })
      .each(function(d, i) {
        that.makeDIV(d3.select(this), d, that._ncols);
      });
    rows.exit().remove();
  }
  return update;
};

Facet.prototype.makeDIV = function(selection, rowNum, ncols) {
  var remainder = this.nFacets % ncols,
      that = this;
  row = selection.selectAll('div.plot-div')
           .data(_.range((this.nFacets - this.nSVGs) > remainder ? 
                 ncols: remainder));
  row
    .each(function(colNum) {
      that.makeSVG(d3.select(this), rowNum, colNum);
    });
  row.enter().append('div')
    .attr('class', 'plot-div')
    .each(function(colNum) {
      that.makeSVG(d3.select(this), rowNum, colNum);
    });
  row.exit().remove();
};

Facet.prototype.makeSVG = function(selection, rowNum, colNum) {
  var that = this,
      dim = this.plot().plotDim(),
      plot = this.plot(),
      x = selection.data()[0],
      addHeight = (rowNum === 0 || this.type() === "wrap") ? dim.y*that.titleProps()[1]:0,
      addWidth = colNum === 0 ? dim.x*that.titleProps()[0]:0,
      width = function() {
          return plot.width() + addWidth;
      },
      height = function() {
          return plot.height() + addHeight;
      },
      svg = selection
              .attr('id', function(d) {
                return that.id(d, rowNum);
               })
              .selectAll('svg.svg-wrap')
              .data([0]);

  svg
    .attr('width', width())
    .attr('height', height())
    .each(function(d) {
      that.makeTitle(d3.select(this), colNum, rowNum);
      var sel = d3.select(this).select('.plot-svg');
      sel.attr('x', addWidth)
        .attr('y', addHeight);
      that.makeCell(sel, x, rowNum, that._ncols);
      that.makeClip(sel, x, rowNum);
    });
  svg.enter().append('svg')
    .attr('class', 'svg-wrap')
    .attr('width', width())
    .attr('height', height())
    .each(function(d) {
      that.makeTitle(d3.select(this), colNum, rowNum);
      var sel = d3.select(this).selectAll('.plot-svg')
                  .data([0]);
      sel.attr('x', addWidth)
        .attr('y', addHeight);
      sel.enter().append('svg')
        .attr('x', addWidth)
        .attr('y', addHeight)
        .attr('class', 'plot-svg');
      that.makeCell(sel, x, rowNum, that._ncols);
      that.makeClip(sel, x, rowNum);
    });
  svg.exit().remove();
  that.nSVGs += 1;
};
// overrides default margins if facet type == "grid"
// or scales are free
Facet.prototype.calculateMargins = function(plot) {

};

Facet.prototype.makeClip = function(selection, x, y) {
    // if either xAdjust or yAdjust are present
  if(this.plot().xAdjust() || this.plot().yAdjust()){
    var clip = selection.selectAll('defs')
                .data([0]),
        that = this,
        id = that.id(x, y) + "-clip",
        dim = this.plot().plotDim();
    clip.select('.clip')
        .attr('id', id)
        .select('rect')
        .attr('width', dim.x)
        .attr('height', dim.y);
    clip.enter().insert('defs', "*")
        .append('svg:clipPath')
        .attr('class', 'clip')
        .attr('id', id)
        .append('rect')
        .attr('x', 0)
        .attr('y',0)
        .attr('width', dim.x)
        .attr('height', dim.y);
    selection.select('g.plot')
      .attr('clip-path', "url(#" + id + ")");
  }
};
// if x and y [and "by"] are specified, return id like:
// x-y[-by], otherwise return xFacet or yFacet
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
Facet.prototype.makeCell = function(selection, x, y, ncols) {
  var margins = this.plot().margins(),
      dim = this.plot().plotDim(),
      that = this,
      gridClassX = (this.type()==="grid" && y!==0) ? " grid": "",
      gridClassY = (this.type()==="grid" && x!==(ncols-1)) ? " grid": "";

  var plot = selection.selectAll('g.plot')
                .data([0]);
  plot
    .attr('transform', "translate(" + margins.left + 
            "," + margins.top + ")")
    .select('rect.background')
    .attr({x: 0, y:0, width: dim.x, height:dim.y});
  plot.enter().append('g')
    .attr('class', 'plot')
    .attr('transform', "translate(" + margins.left + 
            "," + margins.top + ")")
    .append('rect')
    .attr('class', 'background')
    .attr({x: 0, y:0, width: dim.x, height:dim.y});
  plot.exit().remove();

  var xaxis = selection.selectAll('g.x.axis')
                .data([0]);
  xaxis
    .attr('class', 'x axis' + gridClassX);
  xaxis.enter().append('g')
    .attr('class', 'x axis' + gridClassX);
  xaxis.exit().remove();
  var yaxis = selection.selectAll('g.y.axis')
                .data([0]);
  yaxis
    .attr('class', 'y axis' + gridClassY);
  yaxis.enter().append('g')
    .attr('class', 'y axis' + gridClassY);
  yaxis.exit().remove();
};

Facet.prototype.makeTitle = function(selection, colNum, rowNum) {
  var that = this,
      plot = this.plot(),
      dim = plot.plotDim(),
      margins = plot.margins(),
      addHeight = dim.y*that.titleProps()[1],
      addWidth = colNum === 0 ? dim.x*that.titleProps()[0]:0;
  var xlab = selection
              .selectAll('svg.grid-title-x')
              .data([that.x() + " - " + that.xFacets[colNum]]);
  var ylab = selection
              .selectAll('svg.grid-title-y')
              .data([that.y() + " - " + that.yFacets[rowNum]]);
  xlab.enter().append('svg')
      .attr('class', 'grid-title-x')
      .each(function() {
        d3.select(this).append('rect')
          .attr('class', 'facet-label-x');
        d3.select(this).append('text');
      });
  ylab.enter().append('svg')
      .attr('class', 'grid-title-y')
      .each(function() {
        d3.select(this).append('rect')
          .attr('class', 'facet-label-y');
        d3.select(this).append('text');
      });
  if(that.type() === "grid"){
    addHeight = rowNum === 0 ? addHeight:0;
    if(rowNum===0){
      xlab.attr({ width: dim.x + addWidth,
            x: margins.left,
            y: margins.top,
            height: addHeight})
          .select('rect')
          .attr({width: dim.x, x: addWidth,
            height: addHeight});
      xlab.select('text')
          .attr({fill: 'black',
            opacity: 1,
            "font-size": 12,
            x: dim.x/2 + addWidth,
            y: addHeight*0.8,
            "text-anchor": 'middle'})
          .text(_.identity);
    } else {
      selection.select('.grid-title-x')
        .attr("height", 0)
        .select('text').text('');
    }
    if(colNum===0){
      ylab.attr({width: addWidth,
            y:margins.top + addHeight,
            x:margins.left})
          .select('rect')
          .attr({width: addWidth, height: dim.y});
      ylab.select('text')
          .attr({'fill': 'black',
              'opacity': 1,
              'font-size': 14,
              'x': addWidth,
              'y': dim.y/2 + addHeight,
              "text-anchor": 'middle',
              "transform": "rotate(-90 " + addWidth + ", " + (dim.y/2 + addHeight) + ")"})
          .text(_.identity);
    } else {
      selection.select('.grid-title-y')
        .attr({width:0}).select('text').text('');
    }
  } else {
    // add labels to wrap-style faceting.
    xlab.attr('y', margins.top)
        .attr('x', 0)
        .attr('height', addHeight)
        .select('rect').attr({height: addHeight,
        width: dim.x, y:0,
        x: margins.left + addWidth});
    xlab.select('text').attr({fill: 'black',
          opacity: 1,
          "font-size": 12,
          width: plot.width(),
          height: addHeight,
          x: plot.width()/2,
          y: addHeight*0.8,
          "text-anchor": 'middle'})
        .text(that.wrapLabel(rowNum, colNum));
    selection.select('.grid-title-y')
      .attr({width:0}).select('text').text('');
  }
  return selection.select('.plot-svg');
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
