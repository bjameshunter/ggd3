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
    margins: null, 
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
      data = this.plot().data();
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
      that.ncols(Math.ceil(that.nFacets/that.nrows()));
    }
    if(that.ncols() && !that.nrows()) {
      that.nrows(Math.ceil(that.nFacets/that.ncols()));
    }
  }
  if(!that.ncols() && !that.nrows() ) {
    that.nrows(that.yFacets.length);
    that.ncols(that.xFacets.length);
  }

  function update(sel) {
    var rows = sel.selectAll('div.row')
                .data(_.range(that.nrows()));
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
  }
  return update;
};

Facet.prototype.makeDIV = function(selection, rowNum) {
  var remainder = this.nFacets % this.ncols(),
      that = this;
  row = selection.selectAll('div')
           .data(_.range((this.nFacets - this.nSVGs) > remainder ? 
                 this.ncols(): remainder));
  row
    .each(function() {
      that.makeSVG(d3.select(this), rowNum);
    });
  row.enter().append('div')
    .attr('class', 'plot-div')
    .each(function() {
      that.makeSVG(d3.select(this), rowNum);
    });
  row.exit().remove();
};

Facet.prototype.makeSVG = function(selection, rowNum) {
  var that = this,
      dim = this.plot().plotDim(),
      x = selection.data(),
      svg = selection
              .attr('id', function(d) {
                return that.id(d, rowNum);
               })
              .selectAll('svg')
              .data([0]);
  // will need to do something clever here
  // to allow for space free, free_x and free_y
  svg
    .attr('class', 'plot-svg')
    .attr('width', dim.x)
    .attr('height', dim.y)
    .each(function(d) {
      that.makeCell(d3.select(this));
      that.makeClip(d3.select(this), x, rowNum);
    });
  svg.enter().append('svg')
    .attr('class', 'plot-svg')
    .attr('width', dim.x)
    .attr('height', dim.y)
    .each(function(d) {
      that.makeCell(d3.select(this));
      that.makeClip(d3.select(this), x, rowNum);
    });
  svg.exit().remove();
  that.nSVGs += 1;
};

Facet.prototype.makeClip = function(selection, x, y) {
    // if either xAdjust or yAdjust are present
  if(this.plot().xAdjust() || this.plot().yAdjust()){
    var clip = selection.selectAll('defs')
                .data([0]),
        that = this,
        id = that.id(x, y) + "-clip",
        plotDim = this.plot().plotDim();
    clip.select('.clip')
        .attr('id', id)
        .select('rect')
        .attr('width', plotDim.x)
        .attr('height', plotDim.y);
    clip.enter().insert('defs', "*")
        .append('svg:clipPath')
        .attr('class', 'clip')
        .attr('id', id)
        .append('rect')
        .attr('x', 0)
        .attr('y',0)
        .attr('width', plotDim.x)
        .attr('height', plotDim.y);
    selection.select('g.plot')
      .attr('clip-path', "url(#" + id + ")");
  }
};
// if x and y [and "by"] are specified, return id like:
// x-y[-by], otherwise return xFacet or yFacet
Facet.prototype.id = function(x, y) {
  if(this.x() && this.y()) {
    return this.y() + "-" + this.yFacets[y]  + '_' + 
    this.x() + "-" + this.xFacets[x];
  } else if(this.x()){
    return this.x() + "-" + this.xFacets[this.nSVGs];
  } else if(this.y()){
    return this.y() + "-" + this.yFacets[this.nSVGs];
  } else {
    return 'single';
  }
};
Facet.prototype.makeCell = function(selection) {
  var margins = this.plot().margins();

  var plot = selection.selectAll('g.plot')
                .data([0]);
  plot.enter().append('g')
    .attr('class', 'plot')
    .attr('transform', "translate(" + margins.left + 
            "," + margins.top + ")");
  var xaxis = selection.selectAll('g.x.axis')
                .data([0]);
  xaxis.enter().append('g')
    .attr('class', 'x axis');
  var yaxis = selection.selectAll('g.y.axis')
                .data([0]);
  yaxis.enter().append('g')
    .attr('class', 'y axis');

};
ggd3.facet = Facet;
