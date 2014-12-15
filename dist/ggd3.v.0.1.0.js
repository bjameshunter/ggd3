!function() {
  var ggd3 = {version: "0.1.0",
                tools: {},
                geoms: {},
                stats: {},
                };
  function createAccessor(attr){
    function accessor(value){
      if(!arguments.length){ return this.attributes[attr];}
        this.attributes[attr] = value;
      return this;
    }
    return accessor;
  }
ggd3.tools.arrayOfArrays = function(data) {
  // first level are all arrays
  if(_.all(_.map(data, _.isPlainObject))) {
    // we shouldn't be here.
    return data;
  }
  var l1 = _.flatten(data, true),
      l1arrays = _.all(_.map(l1, _.isArray));
  // second level
  var l2 = _.flatten(l1, true),
      l2obs = _.all(_.map(l2, _.isPlainObject));
  if(l1arrays && l2obs) {console.log(l1); return l1; }
  return ggd3.tools.arrayOfArrays(l1);
};
function Clean(data, obj) {
  // coerce each records data to reasonable
  // type and get domains for all scales in aes.
  if(!data) { return {data: null, dtypes:null}; }
  var vars = {},
      dtypeDict = {"number": parseFloat, 
                  "integer": parseInt,
                  "string": String},
      dtypes = _.merge({}, obj.dtypes()),
      keys = _.keys(dtypes),
      // assume all records have same keys
      dkeys = _.keys(data[0]);

  dkeys.forEach(function(v){
    // if a data type has been declared, don't 
    // bother testing what it is.
    // this is necessary for dates and such.
    if(!_.contains(keys, v)) { vars[v] = []; }
  });
  data.forEach(function(d) {
    _.mapValues(vars, function(v,k) {
      return vars[k].push(d[k]);
    });
  });
  _.mapValues(vars, function(v,k) {
    vars[k] = dtype(v);
  });
  dtypes = _.merge(vars, dtypes);

  data = _.map(data, function(d,i) {
    return _.map(dtypes, function(v,k) {
      if(v[0] === "date" || 
         v[0] === "time"){
        var format = v[2];
        d[k] = ggd3.tools.dateFormatter(d[k], format);
      } else {
        d[k] = dtypeDict[dtypes[k][0]](d[k]);
      }
      return d;
    })[0];
  });
  function dtype(arr) {
    var numProp = [],
        dateProp = [],
        n = (arr.length > 1000 ? 1000: arr.length);
    // for now, looking at random 1000 obs.
    _.map(_.sample(arr, n), 
          function(d) {
            numProp.push(!_.isNaN(parseFloat(d)));
          });
    numProp = numProp.reduce(function(p,v) { 
      return p + v; }) / n;
    var lenUnique = _.unique(arr).length;
    // handle floats v. ints and Dates.
    // if a number variable has fewer than 20 unique values
    // I guess this will do...
    if(numProp > 0.8 && lenUnique > 20){
      return ["number", "many"];
    } else if (numProp > 0.95) {
      return ['number', 'few'];
    } else if (lenUnique > 20) {
      return ["string", "many"];
    } else if (lenUnique < 20) {
      return ["string", "few"];
    }
  }
  return {data: data, dtypes: dtypes};
}

ggd3.tools.clean = Clean;
function DataList(data) {
  // needs to work for plots and layers.
  // takes nested data.

  // it's a layer and has it's own data
  var layer = (this instanceof ggd3.layer),
      facet = layer ? this.plot().facet(): this.facet(),
      x = facet.x(),
      y = facet.y(),
      by = facet.by(),
      selector;
  if((x && !y) || (y && !x)){
    selector = x ? x + "-": y + "-";
    return _.map(data, function(d) {
      return {selector: rep(selector + d.key),
        data: d.values};
    });

  } else if(x && y) {
    // loop through both levels
    out = [];
    _.each(data, function(l1) {
      var selectX = x + "-" + l1.key;
      _.each(l1.values, function(l2) {
        var s = rep(y + "-" + l2.key + "_" + selectX);
        out.push({selector:s, data: l2.values});
      });
    });
    return out;
  } else if(x && y && by){
    // nothing yet
  }
  if(!x && !y){
    return [{selector: 'single', data: this.data()}];
  }
}

ggd3.tools.dateFormatter = function(v, format) {
  if(format === "%Y") {
    return new Date(v, 0, 0, 0);
  } else {
    return new Date(v);
  }
};
ggd3.tools.defaultScaleSettings = function(dtype, aesthetic) {
  function xyScale() {
    if(dtype[0] === "number") {
      if(dtype[1] === "many"){
        return {type: 'linear',
                  axis: {},
                  scale: {}};
      } else {
        return {type: 'ordinal',
                  axis: {},
                  scale: {}};
      }
    }
    if(dtype[0] === "date"){
        return {type: 'time',
                  axis: {},
                  scale: {}};
    }
    if(dtype[0] === "string"){
        return {type: 'ordinal',
                  axis: {},
                  scale: {}};
    }
  }
  function legendScale() {
    if(dtype[0] === "number" || dtype[0] === "date") {
      if(dtype[1] === "many") {
        return {type: 'linear',
                axis: {position:'none'},
                scale: {}};
      } else {
        return {type: 'category10',
                axis: {position: 'none'},
                scale: {}};
      }
    }
    if(dtype[0] === "string") {
      if(dtype[1] === "many") {
        return {type:"category20",
                axis: {position: 'none'},
                scale: {}};
      } else {
        return {type:"category10",
                axis: {position: 'none'},
                scale: {}};
      }
    }
  }
  var s;
  switch(aesthetic) {
    case "x":
      s = xyScale();
      s.axis.position = "bottom";
      s.axis.orient = "bottom";
      return s;
    case "y":
      s = xyScale();
      s.axis.position = "left";
      s.axis.orient = "left";
      return s;
    case "color":
      return legendScale();
    case "fill":
      return legendScale();
    case "shape":
      return {type:"shape", 
            axis: {position:'none'},
            scale: {}};
    case "size":
      return {type: 'linear', 
             axis: {position:'none'},
             scale: {}};
    case "alpha":
      return {type: 'linear', 
             axis: {position:'none'},
             scale: {}};
  }
};


ggd3.tools.numericDomain = function(data, variable, rule, zero) {
  var extent = d3.extent(_.pluck(data, variable)),
      range = extent[1] - extent[0];
  if(rule === "left" || rule === "both"){
    extent[0] -= 0.1 * range;
    if(zero) {
      extent[1] = 0;
    }
  }
  if(rule === "right" || rule === "both"){
    extent[1] += 0.1 * range;
    if(zero) {
      extent[0] = 0;
    }
  }
  return extent;
};
ggd3.tools.categoryDomain = function(data, variable) {
  return _.sortBy(_.compact(_.unique(_.pluck(data, variable))));
};

ggd3.tools.removeElements = function(sel, layerNum, clss) {
  var remove = sel
                .select('.plot')
                .selectAll('.geom.g' + layerNum)
                .filter(function() {
                  return d3.select(this)[0][0].classList !== clss;
                });
  remove.transition()
    .style('opacity', 0)
    .remove();
};

ggd3.tools.round = function round(value, decimals) {
    return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
};

// generic nesting function
Nest = function(data) {
  if(_.isNull(data)) { return data; }
  var isLayer = (this instanceof ggd3.layer),
      nest = d3.nest(),
      that = this,
      facet = isLayer ? this.plot().facet(): this.facet();
  if(facet && !_.isNull(facet.x())){
    nest.key(function(d) { return d[facet.x()]; });
  }
  if(facet && !_.isNull(facet.y())){
    nest.key(function(d) { return d[facet.y()]; });
  }
  if(facet && !_.isNull(facet.by())){
    nest.key(function(d) { return d[facet.by()]; });
  }
  data = nest.entries(data);
  return data; 
};

function unNest(data, nestedArray) {
  // recurse and flatten nested dataset
  // this means no dataset can have a 'values' column
  if(!data || _.isEmpty(data)){ 
    return data;
  }
  var branch = _.all(_.map(data, function(d){
    return d.hasOwnProperty('values');
  }));
  if(!branch) {
    if(nestedArray === true){
      return [data];
    }
    return data; 
  }
  var vals = _.flatten(
              _.map(data, function(d) { return d.values; }), true
             );
  return this.unNest(vals);
}


// accepts single nested object
function recurseNest(data) {
  if(!data.values) { return data; }
  return _.map(data.values, 
                 function(d) {
                  return recurseNest(d);
                });
}


function Annotate(spec) {
  if(!(this instanceof Annotate)){
    return new Annotate(spec);
  }
  // annotations are divs or foreignObjects that contain a div to be placed in an svg or g element.
  // used to label plots and axes. They can also be fed a selection
  // of geoms and draw a line to that geom to display more info about
  // the data it contains. They will live in the rightmost or leftmost
  // margin of the plot
  var attributes = {
    content: "",
    class: "annotation",
    orient: "horizontal",
  };
  for(var attr in attributes){
    if(!this[attr]){
      this[attr] = createAccessor(attr);
    }
  }
}

Annotate.prototype.selection = function(sel) {
  

};

ggd3.annotate = Annotate;
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
    // if we're doing grid facets, do y labels go left or right?
    yGridLabel: "right",
    margins: {x: 5, y:5}, 
    titleSize: [20, 20],
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
  that.calculateMargins();
  that.xFacets = ["single"];
  that.yFacets = ["single"];
  // rules of faceting:
  // specify either x and y or an x or y with nrows or ncols
  if( that.x() ) {
    // x is always first nest
    that.xFacets = _.unique(_.map(data, function(d) {
      return d.key;
    }));
  }
  if( that.y() ){
    // if facet.y is specified, it might be the first or
    // second nest
    if(!that.x() ){
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

  this.update = function(sel) {
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
  };
  return this.update;
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
      d3.select(this).append('div')
        .attr('class', 'ggd3tip')
        .style('opacity', 0)
        .append('div').attr('class', 'tooltip-content');
      that.makeSVG(d3.select(this), rowNum, colNum);
    });
  row.exit().remove();
};

Facet.prototype.makeSVG = function(selection, rowNum, colNum) {
  var that = this,
      plot = this.plot(),
      dim = plot.plotDim(),
      x = selection.data()[0],
      addHeight = (rowNum === 0 || this.type() === "wrap") ? that.titleSize()[1]:0,
      addWidth = colNum === 0 ? that.titleSize()[0]:0,
      addWidthSVG = (colNum+1) === this._ncols ? plot.margins().right:0,
      addHeightSVG = (rowNum + 1) === this._nrows ? plot.margins().bottom:0,
      width = plot.width() + addWidth,
      height = plot.height() + addHeight,
      svg = selection
              .attr('id', function(d) {
                return that.id(d, rowNum);
               })
              .selectAll('svg.svg-wrap')
              .data([0]);

    svg
    .attr('width', width + addWidthSVG)
    .attr('height', height + addHeightSVG)
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
    .attr('width', width + addWidthSVG)
    .attr('height', height + addHeightSVG)
    .each(function(d) {
      that.makeTitle(d3.select(this), colNum, rowNum);
      var sel = d3.select(this).selectAll('.plot-svg')
                  .data([0]);
      sel
        .attr('x', addWidth)
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
Facet.prototype.calculateMargins = function(plot) {
  // grids are complicated. If I'm requesting "grid" facets
  // y axis position 'left' means only left column facets
  // x axis position 'bottom' means only bottom row facets.


};

Facet.prototype.makeClip = function(selection, x, y) {
    // if either xAdjust or yAdjust are present
  var clip = selection.selectAll('defs')
              .data([0]),
      that = this,
      id = that.id(x, y) + "-clip",
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
Facet.prototype.makeCell = function(selection, colNum, rowNum, 
                                    ncols) {
  console.log(colNum === (ncols-1));  
  var margins = this.plot().margins(),
      dim = this.plot().plotDim(),
      that = this,
      gridClassX = (this.type()==="grid" && rowNum!==0) ? " grid": "",
      // drawing Axis on rightmost facet.
      gridClassY = (this.type()==="grid" && colNum === (ncols-1)) ? " grid": "";

  this.makeG(selection, "xgrid", "")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");
  this.makeG(selection, "ygrid", "")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  var plot = selection.selectAll('g.plot')
                .data([0]);
  plot.transition()
    .attr('transform', "translate(" + margins.left + 
            "," + margins.top + ")")
    .select('rect.background')
    .attr({x: 0, y:0, width: dim.x, height:dim.y});
  plot.enter().append('g')
    .attr('class', 'plot')
    .attr('transform', "translate(" + margins.left + 
            "," + margins.top + ")")
    .each(function() {
      var sel = d3.select(this);
      sel.append('rect')
        .attr('class', 'background')
        .attr({x: 0, y:0, 
          width: dim.x, height:dim.y});
    });
  plot.exit().remove();

  // complex set of conditions based on facet and scale requests.
  if(this.type() === "grid" && gridClassX){
    this.makeG(selection, "x axis", gridClassX);
  } else if(this.type() !== "grid") {
    this.makeG(selection, "x axis", gridClassX);
  }
  if(this.type() === "grid" && gridClassY){
    this.makeG(selection, "y axis", gridClassY);
  } else if(this.type() !== "grid"){
    this.makeG(selection, "y axis", gridClassY);
  }
};
Facet.prototype.makeG = function (sel, cls, cls2) {
  var both = cls + cls2;
  var g = sel.selectAll('g.' + both.replace(/ /g, "."))
    .data([0]);
  g.enter().append('g')
    .attr('class', cls + cls2);
  g.exit().remove();
  return g;
};

Facet.prototype.makeTitle = function(selection, colNum, rowNum) {
  var that = this,
      plot = this.plot(),
      dim = plot.plotDim(),
      margins = plot.margins(),
      addHeight = that.titleSize()[1],
      addWidth = colNum === 0 ? that.titleSize()[0]:0;
  var xlab = selection
              .selectAll('svg.facet-title-x')
              .data([that.x() + " - " + that.xFacets[colNum]]);
  var ylab = selection
              .selectAll('svg.facet-title-y')
              .data([that.y() + " - " + that.yFacets[rowNum]]);
  xlab.enter().append('svg')
      .attr('class', 'facet-title-x')
      .each(function() {
        d3.select(this).append('rect')
          .attr('class', 'facet-label-x');
        d3.select(this).append('text');
      });
  ylab.enter().append('svg')
      .attr('class', 'facet-title-y')
      .each(function() {
        d3.select(this).append('rect')
          .attr('class', 'facet-label-y');
        d3.select(this).append('text');
      });
  if(that.type() === "grid"){
    addHeight = rowNum === 0 ? addHeight:0;
    if(rowNum===0){
      xlab
        .attr({ width: dim.x + addWidth,
            x: margins.left,
            y: margins.top,
            height: addHeight})
        .select('rect')
        .attr({width: dim.x, x: addWidth,
          height: addHeight,
          y:margins.top});
      xlab.select('text')
          .attr({fill: 'black',
            opacity: 1,
            x: dim.x/2 + addWidth,
            y: addHeight*0.8,
            "text-anchor": 'middle'})
          .text(_.identity);
    } else {
      // set other row labels to 0 height
      // if previous chart was not grid facet.
      selection.select('.facet-title-x')
        .attr("height", 0)
        .select('text').text('');
    }
    if(colNum===0){
      ylab
        .attr({width: addWidth,
            y:margins.top + addHeight,
            x:margins.left})
        .select('rect')
        .attr({width: addWidth, height: dim.y});
      ylab.select('text')
          .attr({fill: 'black',
              opacity: 1,
              x: addWidth * 0.8,
              y: dim.y/2,
              "text-anchor": 'middle',
              transform: "rotate(-90 " + 
                (addWidth * 0.8) + 
                ", " + (dim.y/2) + ")"})
          .text(_.identity);
    } else {
      selection.select('.facet-title-y')
        .attr({width:0}).select('text').text('');
    }
  } else {
    // add labels to wrap-style faceting.
    xlab.attr({y: margins.top,
      x: 0, 
      height: addHeight, 
      width: plot.width() + addWidth})
      .select('rect')
        .attr({height: addHeight,
          width: dim.x, y:0,
          x: margins.left + addWidth});
    xlab.select('text').attr({fill: 'black',
          opacity: 1,
          x: dim.x/2 + addWidth + margins.left,
          y: addHeight*0.8,
          "text-anchor": 'middle'})
        .text(that.wrapLabel(rowNum, colNum));
    selection.select('.facet-title-y')
      .attr({width:0}).select('text').text('');
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


function Layer(aes) {
  if(!(this instanceof Layer)){
    return new Layer(aes);
  }
  var attributes = {
    plot:     null,
    data:     null,
    dtypes:   null,
    geom:     null,
    stat:     null, // identity, sum, mean, percentile, etc.
    position: null, // jitter, dodge, stack, etc.
    aes:      {},
    ownData:  false,
  };
  // grouping will occur on x and y axes if they are ordinal
  // and an optional array, "group"
  // some summary will be computed on legend aesthetics if
  // they are numeric, otherwise that legend aesthetic will
  // not apply to the grouping if it has more than one
  // unique character element, or it's unique character element
  // will have the scale applied to it.
  this.attributes = attributes;
  var getSet = ["plot", "ownData", 'dtypes', "aggFunctions"];
  for(var attr in this.attributes){
    if(!this[attr] && _.contains(getSet, attr) ){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
}
Layer.prototype.plot = function(plot) {
  if(!arguments.length) { return this.attributes.plot; }
  this.attributes.plot = plot;
  return this;
};
Layer.prototype.position = function(position){
  if(!arguments.length) { return this.attributes.position; }
  if(this.geom()){
    this.geom().position(position);
  }
  this.attributes.position = position;
  return this;
};
Layer.prototype.updateGeom = function() {
  if(this.geom()) {
    this.geom().layer(this);
  }
};
Layer.prototype.aes = function(aes) {
  if(!arguments.length) { return this.attributes.aes; }
  this.attributes.aes = _.merge(this.attributes.aes, aes);
  this.updateGeom();
  return this;
};

Layer.prototype.geom = function(geom) {
  if(!arguments.length) { return this.attributes.geom; }
  if(_.isString(geom)){
    geom = ggd3.geoms[geom]();
  }
  geom.layer(this);
  this.attributes.geom = geom;
  if(_.isNull(this.stat())){
    this.stat(geom.stat());
  }
  if(!this.position()){
    this.position(geom.position());
  }
  return this;
};

Layer.prototype.stat = function(obj) {
  if(!arguments.length) { return this.attributes.stat; }
  var stat;
  if(obj instanceof ggd3.stats){
    stat = obj;
  } else {
    stat = ggd3.stats(obj);
  }
  this.attributes.stat = stat.layer(this);
  return this;
};

Layer.prototype.setStat = function() {
  // Set stats not declared when layer initiated
  var aes = this.aes(),
      dtypes = this.dtypes(),
      stat = this.stat(),
      plot = this.plot(),
      scaleType, dtype;

  _.each(_.difference(_.keys(aes), stat.exclude), function(a) {
    dtype = dtypes[aes[a]];
    if(!stat[a]() && _.contains(measureScales, a)){
    scaleType = plot[a + "Scale"]().single.scaleType();
      if(_.contains(linearScales, scaleType) && 
         _.contains(['x', 'y'], a)){
        if(this.geom() instanceof ggd3.geoms.hline){
          stat[a]('range');
        } else {
          stat[a](stat.linearAgg());
        }
      } else {
        if(this.geom() instanceof ggd3.geoms.hline){
          stat[a]('unique');
        } else {
          stat[a](dtype);
        }
      }
    }
    if(a === "group") {
      // group always get's the "first" function
      stat[a]('first');
    }
  }, this);
  // if a stat has not been set, it is x or y
  // and should be set
  _.each(['x', 'y'], function(a) {
    if(!stat[a]() ){
      stat[a](stat.linearAgg());
      if(stat.linearAgg() === "bin"){
        aes[a] = "binHeight";
      } else if(stat.linearAgg() === "count") {
        aes[a] = "n. observations";
      } else if(stat.linearAgg() === "density"){
        aes[a] = "density";
      }
      this.aes(aes);
    }
  }, this);
};

Layer.prototype.data = function(data, fromPlot) {
  if(!arguments.length) { return this.attributes.data; }
  if(fromPlot){
    // what?
    this.attributes.data = data;
  } else {
    data = this.unNest(data);
    data = ggd3.tools.clean(data, this);
    this.attributes.dtypes = _.merge(this.attributes.dtypes, data.dtypes);
    this.attributes.data = data.data;
  }
  return this;
};
Layer.prototype.compute = function(sel, layerNum) {
  this.setStat();
  var plot = this.plot(),
      dlist;
  if(this.ownData()) {
    dlist = this.dataList(this.nest(this.data()));
  } else {
    dlist = plot.dataList(plot.data());
  } 
  var divs = [];
  // reset geom's data array;
  this.geom().data([]);
  sel.selectAll('.plot-div')
    .each(function(d) {
      divs.push(d3.select(this).attr('id'));
    });
  _.each(divs, function(id, i){
    // cycle through all divs, drawing data if it exists.
    var s = sel.select("#" + id),
        d = dlist.filter(function(d) {
          return d.selector === id;
        })[0];
    // don't bother looking at scales if drawing grid.
    if(d && !(this.geom().grid && this.geom().grid())) {
      plot.setScale(d.selector, this.aes());
      // add a jitter if not present
      if(this.position() === "jitter" && 
         !plot.hasJitter) {
        _.each(d.data, function(r) { r._jitter = _.random(-1,1,1); });        
      }
      d = plot.setDomain(d, this);
    }
    if(_.isEmpty(d)) { d = {selector: id, data: []}; }
    this.geom().data().push(d);
  }, this);
  

};
Layer.prototype.draw = function(sel, layerNum) {

  var divs = [];
  sel.selectAll('.plot-div')
    .each(function(d) {
      divs.push(d3.select(this).attr('id'));
    });
  _.each(divs, function(id, i){
    // cycle through all divs, drawing data if it exists.
    var s = sel.select("#" + id),
        d = this.geom().data().filter(function(d) {
          return d.selector === id;
        })[0];
    ggd3.tools.removeElements(s, layerNum, "geom-" + this.geom().name());
    this.geom().draw(s, d, i, layerNum);
  }, this);
};

// same as on plot, for when Layer has it's own data
// accepts output of Nest and returns an array of 
// {selector: [string], data: [array]} objects
Layer.prototype.dataList = DataList;

// same as on plot, for when Layer has it's own data
// Nests according to facets
Layer.prototype.nest = Nest;
Layer.prototype.unNest = unNest;
Layer.prototype.recurseNest = recurseNest;

ggd3.layer = Layer;

// 1. Fix tooltip details with 'identity' and special stats.
   // who cares about inheriting for this. Just write custom per geom
// 2. Label facets better and provide option to label with function.
// 3. Better details on boxplot tooltip
// 4. Make annotation object
// 5. Delete relevant scale when aes changes so they'll be recreated.
// 6. Sorting method for ordinal domains
// 7. Add 5 number option to boxplot
// 8. update numeric scale domains, they get bigger but not smaller.
      // - resetting a scale with null also works
// 9. Add rangeBand, subRangeBand, rangePadding and subRangePadding
//    to all geoms that can be mounted on ordinal axes.

// for much later:
// Zoom behaviors: fixed scales get global zoom on linear axes
    // free scales get their own zoom;
// A single context brush should be mountable as a seperate object
// somewhere close to the plot


function Plot() {
  if(!(this instanceof Plot)){
    return new Plot();
  }
  var attributes = {
    data: null,
    dtypes: {},
    layers: [],
    aes: {},
    legends: null, // strings corresponding to scales
    // that need legends or legend objects
    facet: ggd3.facet().plot(this),
    width: 400,
    height: 400,
    margins: {left:20, right:20, top:20, bottom:20},
    xScale: {single: ggd3.scale()}, 
    yScale: {single: ggd3.scale()},
    xDomain: null,
    yDomain: null,
    fillScale: {single: ggd3.scale()},
    colorScale: {single: ggd3.scale()},
    alphaScale: {single: ggd3.scale()},
    sizeScale: {single: ggd3.scale()},
    shapeScale: {single: ggd3.scale()},
    strokeScale: {single: ggd3.scale()},
    subScale: {single:  ggd3.scale()},
    subRangeBand: 0.1,
    subRangePadding: 0.1,
    rangeBand: 0.1,
    rangePadding: 0.1,
    subDomain: null,
    alpha: d3.functor(0.7),
    fill: d3.functor('steelblue'),
    color: d3.functor('black'),
    size: d3.functor(3), 
    shape: d3.functor('circle'),
    lineType: d3.functor('2,2'),
    lineWidth: 2,
    xAdjust: false,
    yAdjust: false,
    xGrid: true,
    yGrid: true,
    gridLineType: "1,1",
    alphaRange: [0.1, 1],
    sizeRange: [3, 20],
    fillRange: ["blue", "red"],
    colorRange: ["white", "black"],
    shapeRange: d3.superformulaTypes,
    opts: {},
    theme: "ggd3",
  };
  // aesthetics I might like to support:
// ["alpha", "angle", "color", "fill", "group", "height", "label", "linetype", "lower", "order", "radius", "shape", "size", "slope", "width", "x", "xmax", "xmin", "xintercept", "y", "ymax", "ymin", "yintercept"] 
  this.attributes = attributes;
  this.gridsAdded = false;
  // if the data method has been handed a new dataset, 
  // newData will be true, after the plot is drawn the
  // first time, newData is set to false
  this.newData = true;
  // flag to set true when random noise is 
  // added to each data point for jittering
  this.hasJitter = false;
  // when cycling through data, need to know if 
  // data are nested or not.
  // this.nested = false;
  this.hgrid = ggd3.layer()
                .plot(this);
  this.vgrid = ggd3.layer()
                .plot(this); 
  // explicitly declare which attributes get a basic
  // getter/setter
  var getSet = ["opts", "theme", 
    "width", "height", "xAdjust", "yAdjust", 
    "xDomain", "yDomain",
    'colorRange', 'sizeRange',
    'fillRange', "lineType", "subScale",
    'rangeBand', 'rangePadding', 
    'subRangeBand', 'subRangePadding', 'subDomain',
    "alphaRange", "lineWidth",
    "xGrid", "yGrid", "gridLineType"];

  for(var attr in attributes){
    if((!this[attr] && 
       _.contains(getSet, attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

function setGlobalScale(scale) {
  function globalScale(obj) {
    if(!arguments.length) { return this.attributes[scale]; }
    // if function, string, or number is passed,
    // set it as new scale function.
    if(_.isPlainObject(obj)){
      return this.attributes[scale](obj);
    }
    this.attributes[scale] = d3.functor(obj);
    return this;
  }
  return globalScale;
}

function scaleConfig(type) {
  var scale = type + "Scale";
  function scaleGetter(obj){
    if(!arguments.length) {
      return this.attributes[scale];
    }
    // reset to user specified entire scale object
    if(obj instanceof ggd3.scale){
      this.attributes[scale] = {};
      this.attributes[scale].single = obj;
      return this;
    }
    // pass null to reset scales entirely;
    if(_.isNull(obj)){
      this.attributes[scale] = {single: new ggd3.scale() };
      return this;
    }
    // 
    if(!_.isUndefined(obj)) {
      // merge additional options with old options
      if(this.attributes[scale].single instanceof ggd3.scale){
        obj = _.merge(this.attributes[scale].single._userOpts,
                           obj);
      }
      this.attributes[scale].single = new ggd3.scale(obj).plot(this);
      return this;
    }
  }
  return scaleGetter;
}


Plot.prototype.alpha = setGlobalScale('alpha');

Plot.prototype.fill = setGlobalScale('fill');

Plot.prototype.color = setGlobalScale('color');

Plot.prototype.size = setGlobalScale('size');

Plot.prototype.shape = setGlobalScale('shape');

Plot.prototype.xScale = scaleConfig('x');

Plot.prototype.yScale = scaleConfig('y');

Plot.prototype.colorScale = scaleConfig('color');

Plot.prototype.sizeScale = scaleConfig('size');

Plot.prototype.strokeScale = scaleConfig('stroke');

Plot.prototype.shapeScale = scaleConfig('shape');

Plot.prototype.fillScale = scaleConfig('fill');

Plot.prototype.alphaScale = scaleConfig('alpha');

Plot.prototype.margins = function(margins) {
  if(!arguments.length) { return this.attributes.margins; }
  this.attributes.margins = _.merge(this.attributes.margins, margins);
  return this;
};

Plot.prototype.layers = function(layers) {
  if(!arguments.length) { return this.attributes.layers; }
  var aes,
      origAes = _.clone(this.aes());
  if(_.isArray(layers)) {
    // allow reseting of layers by passing empty array
    if(layers.length === 0){
      this.attributes.layers = layers;
      return this;
    }
    var layer;
    _.each(layers, function(l) {
      if(_.isString(l)){
        // passed string to get geom with default settings
        l = ggd3.layer()
              .aes(_.clone(origAes))
              .data(this.data(), true)
              .geom(l);
      } else if ( l instanceof ggd3.layer ){
        // user specified layer
        aes = _.clone(l.aes());
        if(!l.data()) { 
          l.data(this.data(), true); 
        } else {
          l.ownData(true);
        }
        // inherit plot level aesthetics and override 
        // w/ explicitly declared aesthetics.
        l.aes(_.merge(_.clone(origAes), _.clone(aes)));
      } else if (l instanceof ggd3.geom){

        var g = l;
        l = ggd3.layer()
                .aes(_.clone(origAes))
                .data(this.data(), true)
                .geom(g);
      }
      l.plot(this).dtypes(this.dtypes());
      this.attributes.layers.push(l);
      // this.aes(_.merge(_.clone(l.aes()), _.clone(origAes)));
    }, this);
  } else if (layers instanceof ggd3.layer) {
    if(!layers.data()) { 
      layers.data(this.data(), true); 
    } else {
      layers.ownData(true);
    }
    aes = _.clone(layers.aes());
    layers.aes(_.merge(_.clone(origAes), _.clone(aes)))
      .dtypes(this.dtypes())
      .plot(this);
    this.attributes.layers.push(layers);
    // this.aes(_.merge(_.clone(aes), _.clone(origAes)));
  } 
  return this;
};

Plot.prototype.dtypes = function(dtypes) {
  if(!arguments.length) { return this.attributes.dtypes; }
  this.attributes.dtypes = _.merge(this.attributes.dtypes, dtypes);
  return this;
};

Plot.prototype.data = function(data) {
  if(!arguments.length || _.isNull(data)) { return this.attributes.data; }
  // if passing 'dtypes', must be done before
  // let's just always nest and unNest
  this.hasJitter = false;
  data = this.unNest(data);
  data = ggd3.tools.clean(data, this);
  this.timesCleaned += 1;
  // after data is declared, nest it according to facets.
  this.attributes.data = this.nest(data.data);
  this.attributes.dtypes = _.merge(this.attributes.dtypes, data.dtypes);
  this.updateLayers();
  this.nested = data.data ? true:false;
  this.newData = data.data ? false:true;
  return this;
};

Plot.prototype.updateLayers = function() {

  _.each(this.layers(), function(l) {
    l.dtypes(this.dtypes());
    if(!l.ownData()) { 
      l.data(this.data(), true); }
    // plot level aes never override layer level.
    l.aes(_.merge(_.clone(this.aes()), l.aes()));
  }, this);
};

Plot.prototype.facet = function(spec) {
  // everytime a facet is passed
  // data nesting must be done again
  if(!arguments.length) { return this.attributes.facet; }
  if(spec instanceof ggd3.facet){
    this.attributes.facet = spec.plot(this);
  } else {
    this.attributes.facet = new ggd3.facet(spec)
                                    .plot(this);
  }
  this.data(this.data());
  return this;
};

Plot.prototype.aes = function(aes) {
  if(!arguments.length) { return this.attributes.aes; }
  // all layers need aesthetics
  aes = _.merge(this.attributes.aes, _.clone(aes));
  this.attributes.aes = _.clone(aes);
  this.updateLayers();
  return this;
};

Plot.prototype.setFixedScale = function(a) {
  var scale = this[a + "Scale"]().single;
  var domain = [];
  // don't bother if no facets.
  if(_.keys(this[a + "Scale"]()).length === 1) { return scale; }
  if(_.contains(linearScales, scale.scaleType())){
    domain[0] = _.min(this[a + "Scale"](), function(v, k) {
                  if(k === "single") { return undefined; }
                  return v.domain()[0];
                }).domain()[0];
    domain[1] = _.max(this[a + "Scale"](), function(v, k) {
                  if(k === "single") { return undefined; }
                  return v.domain()[1];
                }).domain()[1];
  } else {
    domain = _.sortBy(_.unique(
                  _.flatten(
                    _.map(this[a + "Scale"](), function(v, k){
                  if(k === "single") { return undefined; }
                      return v.domain();
                    }, this) )));
    domain = _.filter(domain, function(d) {
      return !_.isUndefined(d) && !_.isNull(d);
    });
  }
  // scale.scale().domain(domain);
  return scale.domain(domain);
};

Plot.prototype.plotDim = function() {
  var margins = this.margins();
  if(this.facet().type() === "grid"){
    return {x: this.width() - this.facet().margins().x, 
      y: this.height() - this.facet().margins().y};
  }
  return {x: this.width() - margins.left - margins.right,
   y: this.height() - margins.top - margins.bottom};
};

// subScale holds default settings, but
// geoms just copy those settings and make an 
// entirely new scale.
Plot.prototype.setSubScale = function(order) {
  // do nuthin if no ordinal
  var xord = this.xScale().single.scaleType(),
      ord,
      direction, 
      domain;
  if(xord !== "ordinal" &&
     this.yScale().single.scaleType() !== "ordinal"){
    return false;
  }
  if(xord === "ordinal"){
    ord = this.xScale().single.scale();
    direction = 'x';
  } else {
    ord = this.yScale().single.scale();
    direction = 'y';
  }
  // the first layer is special, it should be the layer with all
  // relevent categorical info. Subsequent layers should only, 
  // if necessary, expand numerical scales.
  domain = this.layers()[0].geom().collectGroups() || [];
  this.subDomain(domain);
  if(!domain.length){
    this.subScale({single: ggd3.scale({type:'ordinal'})
                              .scale({domain:[1]})
                              .range([0, ord.rangeBand()], [0,0])});
  }else {
    this.subScale({single: ggd3.scale({type:'ordinal'})
                                .scale({domain: domain})
                                .range([0, ord.rangeBand()],
                                       [this.subRangeBand(), 
                                        this.subRangePadding()])});

  }
};


Plot.prototype.draw = function(sel) {
  var updateFacet = this.facet().updateFacet();
  
  // draw/update facets
  updateFacet(sel);
  // reset nSVGs after they're drawn.
  this.facet().nSVGs = 0;
  // get the layer classes that should
  // be present in the plot to remove 
  // layers that no longer exist.
  var classes = _.map(_.range(this.layers().length),
                  function(n) {
                    return "g" + (n);
                  }, this);

  this.setScale('single', this.aes());
  _.each(this.layers(), function(l, layerNum) {
    l.compute(sel, layerNum);
  });
  // make global scales
  this.setFixedScale('x'); 
  this.setFixedScale('y'); 
  this.setFixedScale('alpha'); 
  this.setFixedScale('size'); 
  this.setFixedScale('stroke'); 
  this.setFixedScale('fill'); 
  this.setFixedScale('color');
  // should set a global sub scale to start
  // at this point, all layers are computed
  // and all groups should be known.
  this.setSubScale();
  _.each(this.layers(), function(l, layerNum) {
    l.draw(sel, layerNum);
  });
  sel.selectAll('.geom')
    .filter(function() {
      var cl = d3.select(this).attr('class').split(' ');
      return !_.contains(classes, cl[1]);
    })
    .transition().style('opacity', 0)
    .remove();
  // if any of the layers had a jitter, it has
  // been added to each facet's dataset
  if(_.any(this.layers(), function(l) {
    return l.position() === "jitter";
  }) ) { 
    this.hasJitter = true; 
  }

  // drawing grids last, after all
  // facet scales are calculated.
  // if you're drawing something with more than
  // 30 layers, you can tweak this yourself.
  if(this.yGrid()) { 
    this.hgrid
      .geom(ggd3.geoms.hline().grid(true)
        .lineType(this.gridLineType()));
    this.hgrid.compute(sel, 30);
    this.hgrid.draw(sel, 30);}
  if(this.xGrid()) { 
    this.vgrid
      .geom(ggd3.geoms.vline().grid(true)
        .lineType(this.gridLineType()));
    this.vgrid.compute(sel, 30);
    this.vgrid.draw(sel, 30);}
};

Plot.prototype.nest = Nest;
// returns array of faceted objects {selector: s, data: data} 
Plot.prototype.dataList = DataList;

Plot.prototype.unNest = unNest;
Plot.prototype.recurseNest = recurseNest;

// update method for actions requiring redrawing plot
Plot.prototype.update = function() {

};

ggd3.plot = Plot;
// opts looks like {scale: {}, 
              // axis: {}, 
              // type: <"linear", "ordinal", "time", etc... >,
              // orient: "",
              // position: ""};
// for scales not x or y, axis will reflect 
// settings for the legend (maybe)
// all scales will get passed through "setScales"
// but opts will override defaults
function Scale(opts) {
  if(!(this instanceof Scale)){
    return new Scale(opts);
  }
  // allow setting of orient, position, scaleType, 
  // scale and axis settings, etc.
  var attributes = {
    aesthetic: null,
    domain: null,
    range: null,
    plot: null,
    scaleType: null, // linear, log, ordinal, time, category, 
    // maybe radial, etc.
    scale: null,
    rangeBands: [0.1, 0.1],
    opts: {},
    label: "",
    labelPosition: [0.5, 0.5],
    offset: 45,
  };
  // store passed object
  this.attributes = attributes;
  var getSet = ["aesthetic", "plot", "opts",
                "rangeBands", "label", 'offset'];
  for(var attr in this.attributes){
    if(!this[attr] && _.contains(getSet, attr) ){
      this[attr] = createAccessor(attr);
    }
  }
  this._userOpts = {};
  if(!_.isUndefined(opts)){
    // opts may be updated by later functions
    // _userOpts stays fixed on initiation.
    this.attributes.opts = opts;
    this._userOpts = opts;
    this.scaleType(opts.type ? opts.type:null);
    this.offset(opts.offset ? opts.offset:attributes.offset);
  }
}

Scale.prototype.scaleType = function(scaleType) {
  if(!arguments.length) { return this.attributes.scaleType; }
  this.attributes.scaleType = scaleType;
  switch(scaleType) {
    case 'linear':
      this.attributes.scale = d3.scale.linear().nice();
      break;
    case 'log':
      this.attributes.scale = d3.scale.log().nice();
      break;
    case 'ordinal':
      this.attributes.scale = d3.scale.ordinal();
      break;
    case 'time':
      this.attributes.scale = d3.time.scale().nice();
      break;
    case 'date':
      this.attributes.scale = d3.time.scale().nice();
      break;
    case "category10":
      this.attributes.scale = d3.scale.category10();
      break;
    case "category20":
      this.attributes.scale = d3.scale.category20();
      break;
    case "category20b":
      this.attributes.scale = d3.scale.category20b();
      break;
    case "category20c":
      this.attributes.scale = d3.scale.category20c();
      break;
  }
  return this;
};

Scale.prototype.scale = function(settings){
  if(!arguments.length) { return this.attributes.scale; }
  for(var s in settings){
    if(this.attributes.scale.hasOwnProperty(s)){
      this.attributes.scale[s](settings[s]);
    }
  }
  return this;
};

Scale.prototype.range = function(range, rb) {
  if(!arguments.length) { return this.attributes.range; }
  if(this.scaleType() === "ordinal"){
    if(_.isUndefined(rb)) { 
      rb = this.rangeBands(); 
    }
    this.attributes.scale
        .rangeRoundBands(range, rb[0], rb[1]);
  } else {
    this.attributes.scale.range(range);
  }
  this.attributes.range = range;
  return this;
};

Scale.prototype.domain = function(domain) {
  if(!arguments.length) { return this.attributes.domain; }
  if(this.scaleType() ==="log"){
    if(!_.all(domain, function(d) { return d > 0;}) ){
      console.warn("domain must be greater than 0 for log scale." +
      " Scale " + this.aesthetic() + " has requested domain " +
      domain[0] + " - " + domain[1] + ". Setting lower " +
      "bound to 1. Try setting them manually." );
      domain[0] = 1;
    }
  }
  if(_.isNull(this.domain())){ 
    this.attributes.domain = domain; 
  } else {
    var d = this.attributes.domain;
    if(_.contains(linearScales, this.scaleType())){
      if(domain[0] < d[0]) { this.attributes.domain[0] = domain[0];}
      if(domain[1] > d[1]) { this.attributes.domain[1] = domain[1];}
    } else {
      this.attributes.domain = _.unique(_.flatten([d, domain]));
    }
  }
  this.scale().domain(this.attributes.domain);
  return this;
};

Scale.prototype.axisLabel = function(o, l) {
  if(!arguments.length) { return this.attributes.label; }
  // o is the label
  if(_.isString(o)){ 
    this.attributes.label = o; 
    return this;
  }
  if(o instanceof d3.selection){
    var pd = this.plot().plotDim(),
        tr, offset,
        r = 90;
    if(this.aesthetic() === "y"){
      offset = this.opts().axis.position === "left" ? -this.offset():this.offset();
      tr = "translate(" + offset + "," + pd.y + ")rotate(" + -r + ")";
    } else {
      offset = this.opts().axis.position === "top" ? -this.offset():this.offset();
      tr = "translate(0," + offset + ")";
    }
    // make the label
    var label = o.selectAll('.label').data([0]);
    label
      .attr('width', pd[this.aesthetic()])
      .attr('height', "20")
      .attr('transform', tr)
      .each(function() {
        d3.select(this).select('p').text(l);
      });
    label.enter().append('foreignObject')
      .attr('width', pd[this.aesthetic()])
      .attr('height', "20")
      .attr('transform', tr)
      .attr('class', 'label')
      .append('xhtml:body')
      .append('div')
      .append('p')
      .text(l);
  }
};

Scale.prototype.positionAxis = function() {
  var margins = this.plot().margins(),
      dim = this.plot().plotDim(),
      aes = this.aesthetic(),
      opts = this.opts().axis;
  if(aes === "x"){
    if(opts.position === "bottom"){
      return [margins.left, margins.top + dim.y];
    }
    if(opts.position === "top"){
      return [margins.left, margins.top];
    }
  }
  if(aes === "y") {
    if(opts.position === "left"){
      return [margins.left, margins.top];
    }
    if(opts.position === "right"){
      return [margins.left + dim.x, margins.top];
    }
  }
};

ggd3.scale = Scale;
// only required by plot, no need to pass plot in.
// geom will already have it's scale available to it,
// regardless of whether it's layer has own data.
// probably no need to pass data in either.
// Plot knows it's facet, data and aes, therefore with 
// dataList, can get a list of facet ids and relevent data
// with which to make scales per facet if needed.
// if an aes mapping or facet mapping does exist in data
// throw error.
var measureScales = ['x', 'y', 'color','size', 'fill' ,'alpha', 'size'],
    linearScales = ['log', 'linear', 'time', 'date'],
    globalScales = ['alpha','fill', 'color', 'size', 'shape'];

// make or update a scale based on new info from layers
function setScale(selector, aes) {
  // gather user defined settings in opts object
  var opts = _.zipObject(measureScales, 
        _.map(measureScales, function(a) {
        // there is a scale "single" that holds the 
        // user defined opts and the fixed scale domain
        return this[a + "Scale"]().single._userOpts;
      }, this)),
      scales = _.intersection(measureScales, _.keys(aes));

  // must reset this if aes changes
  _.each(scales, function(a) {
    if(_.isUndefined(this[a + "Scale"]()[selector]) ||
      _.isNull(this[a + "Scale"]()[selector].scale())){
      this.makeScale(selector, a, opts[a], aes[a]);
    }
  }, this);
  _.each(scales, function(a) {
    // give user-specified scale settings to single facet
    this[a + "Scale"]().single._userOpts = _.cloneDeep(opts[a]);
  }, this);
}

function makeScale(selector, a, opts, vname) {
  var dtype, settings;
  if(_.contains(measureScales, a)){
    // get plot level options set for scale.
    // if a dtype is not found, it's because it's x or y and 
    // has not been declared. It will be some numerical aggregation.
    dtype = this.dtypes()[vname] || ['number', 'many'];
    settings = _.merge(ggd3.tools.defaultScaleSettings(dtype, a),
                       opts);
    var scale = ggd3.scale(settings)
                        .plot(this)
                        .aesthetic(a);
    if(_.contains(['x', 'y'], a)){
      if(a === "x"){
        scale.range([0, this.plotDim().x], 
                    [this.rangeBand(), this.rangePadding()]);
      }
      if(a === "y") {
        scale.range([this.plotDim().y, 0],
                    [this.rangeBand(), this.rangePadding()]);
      }
      scale.axisLabel(vname);
      scale.axis = d3.svg.axis().scale(scale.scale());
      for(var ax in settings.axis){
        if(scale.axis.hasOwnProperty(ax)){
          scale.axis[ax](settings.axis[ax]);
        }
      }
    }
    for(var s in settings.scale){
      if(scale.scale().hasOwnProperty(s)){
        scale.scale()[s](settings.scale[s]);
      }
    }
    this[a + "Scale"]()[selector] = scale;
  }
}

function setDomain(data, layer) {
  if(_.any(_.map(data.data, function(d) {
    // pass holds aesthetics that shouldn't factor into scale training.
    var pass = ['yintercept', 'xintercept', 'slope'];
    return _.intersection(pass, _.keys(d)).length > 0;
  }))){
    console.log("unnecessary data, skipping setDomain");
    return data;
  }
  var geom = layer.geom(),
      s = geom.setup(),
      domain,
      scale;

  this.globalScales = globalScales.filter(function(sc) {
    return _.contains(_.keys(s.aes), sc);
  });

  this.freeScales = [];
  _.each(['x', 'y'], function(a) {
    // do not cycle through scales declared null.
    if(!_.isNull(s.aes[a])){
      if(!_.contains(['free', 'free_' + a], s.facet.scales()) ){
        this.globalScales.push(a);
      } else {
        this.freeScales.push(a);
      }
    }
  }, this);
  // each facet's data rolled up according to stat
  // unnested - an array of observations.
  data.data = this.unNest(geom.compute(data.data, s));

  // free scales
  if(!_.isEmpty(this.freeScales)){
    _.map(this.freeScales, function(k){
      scale = this[k+ "Scale"]()[data.selector];
      scale.domain(geom.domain(data.data, k));
    }, this);
  }
  function first(d) {
    return d[0];
  }
  function second(d) {
    return d[1];
  }
  // calculate global scales
  _.map(this.globalScales, 
        function(g){
    if(!_.isNull(s.aes[g])){
      if(_.contains(globalScales, g)){
        scale = this[g + "Scale"]().single;
        // scale is fill, color, alpha, etc.
        // with no padding on either side of domain.
        if(_.contains(linearScales, scale.scaleType())){
          domain = ggd3.tools.numericDomain(data.data, s.aes[g]);
          scale.range(this[g + 'Range']());
        } else {
          domain = _.sortBy(
                    _.unique(
                      ggd3.tools.categoryDomain(data.data,s.aes[g])));
        }
      } else {
        scale = this[g + "Scale"]()[data.selector];
        domain = geom.domain(data.data, g);
        if(!_.contains(linearScales, scale.scaleType())){
          domain = _.sortBy(_.unique(domain));
        }
      }
      scale.domain(domain);
      this[g + "Scale"]()[data.selector] = scale;
      for(var sc in scale._userOpts.scale){
        if(scale.scale().hasOwnProperty(sc)){
          scale.scale()[sc](scale._userOpts.scale[sc]);
        }
      }
      // weird wrapper for legend aesthetic functions
      if(_.contains(globalScales, g)) {
        var aesScale = _.bind(function(d) {
          // if a plot doesn't use a particular
          // aesthetic, it will trip up here, 
          // choosing to pass null instead.
          return this.scale()(d[s.aes[g]] || null);
        }, scale);
        this[g](aesScale);
      }
    }
  }, this);
  return data;
}

Plot.prototype.setScale = setScale;

Plot.prototype.makeScale = makeScale;

Plot.prototype.setDomain = setDomain;
// tooltip
function Tooltip (spec) {
  if(!(this instanceof Tooltip)){
    return new Tooltip(spec);
  }
  var attributes = {
    offset: {x: 15, y:15},
    styleClass: null,
    opacity: 1,
    content: null,
    geom: null,
  };

  this.attributes = attributes;
  for(var attr in attributes) {
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
    this[attr] = createAccessor(attr);
    }
  }
}

Tooltip.prototype.find = function(el) {
  var parent = d3.select(el.parentNode);
  if(!parent.select('.ggd3tip').empty()) { return parent.select('.ggd3tip'); }
  return this.find(el.parentNode);
};

Tooltip.prototype.tooltip = function(selection, s) {
  var that = this;
  if(_.isUndefined(s)){
    s = this.geom().setup();
  }
  selection.each(function(data) {
    var tooltipdiv = that.find(this);
    d3.select(this)
      .on('mouseover.tooltip', function(d) {that.show(d, tooltipdiv, s); })
      .on('mousemove.tooltip', function(d) {that.move(d, tooltipdiv); })
      .on('mouseout.tooltip', function(d) {that.hide(d, tooltipdiv); });
  });
};

Tooltip.prototype.show = function(data, sel, s) {
  var tt = sel.select('.tooltip-content');
  tt.selectAll('*')
    .remove();
  this.content()(tt.data([data]), s);
  sel.transition().duration(200)
    .style('opacity', 1);
};

Tooltip.prototype.move = function(data, sel) {
  sel
    .style('left', d3.event.layerX + this.offset().x + "px")
    .style('top', d3.event.layerY + this.offset().y + "px");
};

Tooltip.prototype.hide = function(data, sel) {
  sel.attr('class', 'ggd3tip')
    .transition().duration(200)
    .style('opacity', 0)
    .transition().delay(200).duration(0)
    .style("top", 0 + "px")
    .style("left", 0 + "px")
    .select('.tooltip-content').selectAll('*')
    .remove();
};

ggd3.tooltip = Tooltip;
// Base geom from which all geoms inherit
function Geom(aes) {
  if(!(this instanceof Geom)){
    return new Geom(aes);
  }
  var attributes = {
    layer: null,
    stat: null,
    fill: null,
    alpha: null,
    color: null,
    size: null,
    position: null,
    drawX: true,
    drawY: true,
    data: [],
    style: "", // optional class attributes for css 
    tooltip: null,
    groups: null, 
    subRangeBand: 0,
    subRangePadding: 0,
  };
  var r = function(d) { return ggd3.tools.round(d, 2);};
  // default tooltip
  // done here because setting a big long
  // default function on attributes is messy.
  function tooltip(sel, s, opts) {
    var that = this;
    sel.each(function(d) {
        var el = d3.select(this);
        that._otherAesthetics(el, d, s, []);
    });
  }
  this.attributes = attributes;

  this.attributes.tooltip = _.bind(tooltip, this);
}
Geom.prototype.defaultPosition = function() {
  var n = this.name();
  return {
    "point": "identity",
    "text": "identity",
    "bar": "stack",
    "box": "dodge",
    "hline": "identity",
    "vline": "identity",
    "abline": "identity",
    "smooth": "loess", 
    "area" : "identity",
    "error": "identity",
    "density": "kernel",
    "path" : "identity",
    "ribbon" : "identity",
    }[n];
};

Geom.prototype._otherAesthetics = function(sel, d, s, omit){
  omit = _.flatten([omit, s.stat.exclude]);
  _.each(_.difference(_.keys(s.aes), omit), function(k) {
    if(_.isNull(s.stat[k]) || _.isNull(s.stat[k]())){ return null; }
    var stat = s.stat[k]()._name || "identity";
    stat = _.contains(["identity", "first"], stat) ? "": " (" + stat + ")";
    sel.append('h4')
      .text(s.aes[k] + stat + ": ")
      .append('span').text('(' + k + ') ' + d[s.aes[k]]);
  });
};

Geom.prototype.tooltip = function(obj, data) {
  if(!arguments.length) { return this.attributes.tooltip; }
  if(_.isFunction(obj)){
    this.attributes.tooltip = _.bind(obj, this);
    return this;
  } else {
    console.warn("tooltips should be a function accepting a selection with data attached and an optional object of options.");
  }
  return this;
};

Geom.prototype.setup = function() {
  // when calling a geom from within
  // another geom, many of these properties will not exist.
  var s = {
      layer     : this.layer(),
    };
  // sometimes a geom doesn't have a layer as in 
  // compound geoms - boxplot is box and point.
  if(s.layer){
    s.plot      = s.layer.plot();
    s.stat      = s.layer.stat();
    s.nest      = this.nest();
    s.dtypes    = s.plot.dtypes();
    s.position  = s.layer.position();
    s.dim       = s.plot.plotDim();
    s.facet     = s.plot.facet();
    s.aes       = s.layer.aes();
    s.fill      = d3.functor(this.fill() || s.plot.fill());
    s.size      = d3.functor(this.size() || s.plot.size());
    s.alpha     = d3.functor(this.alpha() || s.plot.alpha());
    s.color     = d3.functor(this.color() || s.plot.color());
    s.nest.rollup(function(d) {
      return s.stat.compute(d);
    });

    if(s.aes.fill) {
      s.grouped = true;
      s.group = s.aes.fill;
    } else if(s.aes.color){
      s.grouped = true;
      s.group = s.aes.color;
    } else if(s.aes.group){
      s.grouped = true;
      s.group = s.aes.group;
    }
    // not convinced this is a good idea.
    // if(_.contains([s.facet.x(), s.facet.y()], 
    //               s.group)) {
    //   // uninteresting grouping, get rid of it.
    //   s.grouped = false;
    //   s.group = null;
    //   s.groups = null;
    //   // must get all groups from layer to do this
    //   // meaningfully. Facets without a group 
    //   // are throwing it off.
    // }
  }
  return s;
};

Geom.prototype.collectGroups = function() {
  var groups, grouped,
      aes = this.layer().aes();
  if(aes.fill) {
    grouped = true;
    group = aes.fill;
  } else if(aes.color){
    grouped = true;
    group = aes.color;
  } else if(aes.group){
    grouped = true;
    group = aes.group;
  }
  if(grouped) {
    groups = _.unique(
                _.pluck(
                  _.flatten(
                    _.map(this.data(), 'data')), group));
    this.groups(groups);
  }
  return groups;
};

Geom.prototype.compute = function(data, s) {
  return s.nest.entries(data);
};

Geom.prototype.domain = function(data, a) {
  var layer   = this.layer(),
      plot    = layer.plot(),
      aes     = layer.aes(),
      extent,
      range;

  if(_.contains(linearScales, plot[a + "Scale"]().single.scaleType())) {
    extent  = d3.extent(_.pluck(data, aes[a]));
    range   = extent[1] - extent[0];
  } else {
    var domain = _.sortBy(_.unique(_.pluck(data, aes[a])));
    return domain;
  }
  // done if date
  // and not a calculated aesthetic
  var skip = ['binHeight', 'density', 'n. observations', undefined],
      skip2 = ['yintercept', 'xintercept', 'slope'];

  if(!_.contains(skip, aes[a]) && !_.contains(skip2, a)){
    if(_.contains(["date", "time"], plot.dtypes()[aes[a]][0]) ){
      return extent;
    }
  }
  // extent both ways
  if(range === 0){
    extent[0] -= 1;
    extent[1] += 1;
  }
  extent[0] -= 0.1 * range;
  extent[1] += 0.1 * range;
  return extent;
};


Geom.prototype.scalesAxes = function(sel, setup, selector, 
                                     layerNum, drawX, drawY){

  var x, y,
      plot = this.layer().plot();
  // choosing scales based on facet rule
  if(!_.contains(["free", "free_x"], setup.facet.scales()) || 
     _.isUndefined(setup.plot.xScale()[selector])){
    x = setup.plot.xScale().single;
    xfree = false;
  } else {
    x = setup.plot.xScale()[selector];
    xfree = true;
  }
  if(!_.contains(["free", "free_y"], setup.facet.scales()) || 
     _.isUndefined(setup.plot.xScale()[selector])){
    y = setup.plot.yScale().single;
    yfree = false;
  } else {
    y = setup.plot.yScale()[selector];
    yfree = true;
  }
  // think this need not be here.
  // x.axis.scale(x.scale());
  // y.axis.scale(y.scale());

  if(layerNum === 0 && drawX){
    sel.select('.x.axis')
      .attr("transform", "translate(" + x.positionAxis() + ")")
      .transition().call(x.axis);
    if(x.label()){
      sel.select('.x.axis')
        .call(_.bind(x.axisLabel, x), x.axisLabel());
    }
  }
  if(layerNum === 0 && drawY){
    sel.select('.y.axis')
      .attr("transform", "translate(" + y.positionAxis() + ")")
      .transition().call(y.axis);
    if(y.label()){
      sel.select('.y.axis')
        .call(_.bind(y.axisLabel, y), y.axisLabel());
    }
  }
  return {
    x: x,
    y: y,
    xfree: xfree,
    yfree: yfree,
  };
};

Geom.prototype.nest = function() {

  // to be performed before calculating layer level geoms or scales
  var aes = this.layer().aes(),
      plot = this.layer().plot(),
      nest = d3.nest(),
      dtypes = plot.dtypes(),
      nestVars = _.unique(_.compact([aes.group, aes.fill, aes.color]));

  _.each(nestVars, function(n) {
    if(dtypes[n][1] !== "many") {
      nest.key(function(d) { return d[n]; });
    }
  });
  _.map(['x', 'y'], function(a) {
    if(plot[a + "Scale"]().single.scaleType() === "ordinal"){
      nest.key(function(d) { return d[aes[a]]; });
    }
  });
  return nest;
};

ggd3.geom = Geom;


Geom.prototype.unNest = unNest;
Geom.prototype.recurseNest = recurseNest;

// 
function Bar(spec) {
  if(!(this instanceof Geom)){
    return new Bar(spec);
  }
  
  Geom.apply(this);
  var attributes = {
    name: "bar",
    stat: "count",
    geom: "rect",
    position: "dodge",
    lineWidth: 1,
    offset: 'zero',
    groupRange: 0,
    stackRange: 0,
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Bar.prototype = new Geom();

Bar.prototype.constructor = Bar;

Bar.prototype.fillEmptyStackGroups = function(data, v) {
  // every object in data must have same length
  // array in its 'value' slot
  // this should be usable for histograms as well
  // but currently is not.
  if(!data.length) { return data; }
  var keys = _.unique(_.flatten(_.map(data, function(d) {
    return _.map(d.values, function(e) {
      return e[v];
    });
  })));
  // get an example object and set it's values to null;
  var filler = _.clone(data[0].values[0]);
  _.mapValues(filler, function(v,k) {
    filler[k] = null;
  });
  _.each(data, function(d) {
    var dkey, missing;
    dkeys = _.map(d.values, function(e) { return e[v]; });
    missing = _.compact(_.filter(keys, function(k) {
      return !_.contains(dkeys, k);
    }));
    if(!_.isEmpty(missing)) {
      _.each(missing, function(m) {
        // must fill other values, too.
        var e = _.clone(filler);
        e[v] = m;
        d.values.push(e);
      });
    }
    d.values = _.sortBy(d.values, function(e) {
      return e[v];
    });
  });

  return data;
};

Bar.prototype.domain = function(data, a) {
  var s = this.setup(),
      valueVar = s.aes[a] ? s.aes[a]: "n. observations",
      group, stackby,
      groupRange, stackRange,
      grouped;
  if(!_.contains(linearScales, s.plot[a + "Scale"]().single.scaleType())) {
    var domain = _.sortBy(_.unique(_.pluck(data, s.aes[a])));
    return domain;
  }
  group = s.aes.fill || s.aes.color || s.aes.group;
  stackby = a === "x" ? s.aes.y: s.aes.x;

  grouped = _.groupBy(data, function(d) {
    return d[stackby];
  });

  stackRange = _.mapValues(grouped, function(v, k) {
    return _.reduce(_.pluck(v, valueVar), function(a,b) {
      return a + b;
    });
  });
  stackRange = d3.extent(_.map(stackRange, 
                         function(v, k) { return v; }));
  groupRange = d3.extent(data, function(d) {
    return d[valueVar];
  });

  stackRange[0] = 0 - 0.1 * (stackRange[1] - stackRange[0]);
  groupRange[0] = 0 - 0.1 * (groupRange[1] - groupRange[0]);
  stackRange[1] *= 1.1;
  groupRange[1] *= 1.1;
  this.stackRange(stackRange);
  this.groupRange(groupRange);
  return s.position === "stack" ? stackRange: groupRange;
};

Bar.prototype.vertical = function(s){
  return (s.plot.xScale().single.scaleType() === "ordinal" ||
                      s.aes.y === "binHeight");
};

Bar.prototype.draw = function(sel, data, i, layerNum) {

  var s     = this.setup(),
      that  = this;

  var o, // original value or ordinal scale
      n, // numeric agg scale
      rb, // final range band
      o2, // used to calculate rangeband if histogram
      valueVar, // holds aggregated name
      categoryVar, // name of bar positions
      // original subscale
      pSub = s.plot.subScale().single.scale(),
      // secondary ordinal scale to calc dodged rangebands
      sub,
      drawX     = this.drawX(),
      drawY     = this.drawY(),
      vertical = this.vertical(s);

  if(_.contains(['wiggle', 'silhouette'], that.offset()) ){
    if(vertical){
      // x is bars, don't draw Y axis
      drawY = false;
      sel.select('.y.axis')
        .selectAll('*')
        .transition()
        .style('opacity', 0)
        .remove();
    } else {
      // y is ordinal, don't draw X.
      drawX = false;
      sel.select('.x.axis')
        .selectAll('*')
        .transition()
        .style('opacity', 0)
        .remove();
    }
  }
  // gotta do something to reset domains if offset is expand
  if(that.offset() === "expand"){
    if(vertical){
      _.mapValues(s.plot.yScale(), function(v, k) {
        v.domain([-0.02,1.02]);
      });
    } else {
      _.mapValues(s.plot.xScale(), function(v, k) {
        v.domain([-0.02,1.02]);
      });  
    }
  }

  var scales = that.scalesAxes(sel, s, data.selector, 
                               layerNum,
                               drawX, drawY);
  // scales are drawn by now. return if no data.
  if(!data.data.length){ return false; }

  data = data.data;


  // prep scales for vertical or horizontal use.
  // "o" is ordinal, "n" is numeric
  // width refers to scale defining rangeband of bars
  // size refers to scale defining its length along numeric axis
  // s and p on those objects are for size and position, respectively.
  // need to use this for histograms too, but it's going to be
  // tricky
  if(vertical){
    // vertical bars
    o = scales.x.scale();
    n = scales.y.scale();
    size = {s: "height", p: 'y'};
    width = {s: "width", p: 'x'};
  } else {
    // horizontal bars
    
    o = scales.y.scale();
    n = scales.x.scale();
    size = {s: "width", p:'x'};
    width = {s:"height", p: 'y'};
  }
  s.groups = _.unique(_.pluck(data, s.group));

  data = this.unNest(data);
  // data must be nested to go into stack algorithm
  if(s.group){
    data = d3.nest().key(function(d) { return d[s.group];})
              .entries(data);
  } else {
    data = [{key: 'single',values:data}];
  }

  // with histograms, if a bin is empty, it's key comes
  // back 'undefined'. This causes bars to be drawn
  // from the top (or right). They should be removed
  data = _.filter(data, function(d) { 
    return d.key !== "undefined" ;});
  if(this.name() === "bar"){
    rb = o.rangeBand();
    valueVar = s.aes[size.p] || "n. observations";
    categoryVar = s.aes[width.p];
  } else if(that.name() === "histogram"){
    valueVar = "binHeight";
    categoryVar = s.group;
    if(vertical){
      rb = o(o.domain()[0] + data[0].values[0].dx );
    } else {
      rb = o(o.domain()[1] - data[0].values[0].dx );
    }
  }
  if(s.grouped && 
     _.contains([s.aes.x, s.aes.y], s.group)){
    console.log('grouping is already shown by facets' +
                ' unnecessary color scales probably generated');
  }
  data = that.fillEmptyStackGroups(data, categoryVar);
  var stack = d3.layout.stack()
                .x(function(d) { return d[categoryVar]; })
                .y(function(d) {
                  return d[valueVar]; })
                .offset(that.offset())
                .values(function(d) { 
                  return d.values; });
  data = _.map(stack(data),
                          function(d) {
                            return d.values ? d.values: [];
                          });
  data = _.flatten(data, 
                   that.name() === "histogram" ? true:false);
  if(s.position === 'dodge') {
    // make ordinal scale for group
    sub = d3.scale.ordinal()
            .domain(pSub.domain());
    var rrb = pSub.rangeExtent();
    rb = [];
    rb[0] = _.isNumber(this.subRangeBand()) ? this.subRangeBand(): s.plot.subRangeBand();
    rb[1] = _.isNumber(this.subRangePadding()) ? this.subRangePadding(): s.plot.subRangePadding();
    sub.rangeRoundBands(rrb, rb[0], rb[1]);
    rb = sub.rangeBand();
  } else {
    sub = function(d) {
      return 0;
    };
  }
  
  var placeBar = (function() {
    if(that.name() === "bar" || vertical){
      return function(d) {
        var p = o(d[s.aes[width.p]]);
        p += sub(d[s.group]) || 0;
        return p || 0;};
    } else {
      return function(d) {
        var p = o(d[s.aes[width.p]]) - rb;
        p += sub(d[s.group]) || 0;
        return p || 0;
        };
    }
  })();

  // I think this is unnecessary.
  var calcSizeS = (function() {
    if(s.position === 'stack' && size.p === "y"){
      return function(d) {
        return n(0) - n(d.y);
      };
    }
    if(s.position === "stack"){
      return function(d) {
        return n(d.y) - n(0);
      };
    }
    if(s.position === "dodge" && size.p === "y"){
      return function(d) {
        return n(0) - n(d.y); 
      };
    }
    return function(d) {
      return n(d[valueVar]) - n(0); 
    };
  })();
  var calcSizeP = (function () {
    if(s.position === "stack" && size.p === "y"){
      return function(d) { 
        return n(d.y0 + d.y); 
        };
    }
    if(s.position === "stack"){
      return function(d) {
        return n(d.y0);
      };
    }
    if(s.position === "dodge" && size.p === "y") {
      return function(d) {
        return n(d.y);
      };
    }
    return function(d) {
      return n(0);
    };
  } )();


  var bars = sel.select('.plot')
                .selectAll('rect.geom.g' + layerNum)
                .data(data),
      tt = ggd3.tooltip()
            .content(this.tooltip())
            .geom(this);
  // add canvas and svg functions.
  function draw(rect) {
    rect.attr('class', 'geom g' + layerNum + ' geom-bar')
      .attr(size.s, calcSizeS)
      .attr(width.s, rb)
      .attr(size.p, calcSizeP)
      .attr(width.p , placeBar || 0)
      .attr('value', function(d) { 
        return d[s.group] + "~" + d[s.aes[width.p]];
      })
      .style({
        fill: s.fill,
        stroke: s.color,
        'fill-opacity': s.alpha,
        'stroke-width': that.lineWidth()
      });
  }

  bars.transition().call(draw)
    .each(function(d) {
      tt.tooltip(d3.select(this));
    });
  
  bars.enter()
    .append(this.geom())
    .attr(width.s, rb)
    .attr(width.p, placeBar)
    .attr(size.s, 0)
    .attr(size.p, function(d) {
      return n(0);
    })
    .style({
      fill: s.fill,
      stroke: s.color,
      'fill-opacity': s.alpha,
      'stroke-width': that.lineWidth()
    })
    .transition()
    .call(draw)
    .each(function(d) {
      tt.tooltip(d3.select(this));
    });

  bars.exit()
    .transition()
    .style('opacity', 0)
    .remove();
};

ggd3.geoms.bar = Bar;

function Line(spec) {
  if(!(this instanceof ggd3.geom)){
    return new Line(spec);
  }
  Geom.apply(this, spec);
  var attributes = {
    name: "line",
    stat: "identity",
    geom: "path",
    grid: false,
    interpolate: 'basis',
    lineType: null,
    lineWidth: null,
    tension: 0.7,
    freeColor: false, 
  };
  // freeColor is confusing. Most global aesthetics should be 
  // that way. 
  // My example is faceted by decade, meaning the color variable
  // "date", doesn't change much within a facet. With "freeColor" it does.
  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}


Line.prototype = new Geom();

Line.prototype.constructor = Line;

Line.prototype.lineType = function(l) {
  if(!arguments.length) { return this.attributes.lineType; }
  this.attributes.lineType = d3.functor(l);
  return this;
};

Line.prototype.generator = function(aes, x, y, o2, group) {
  var line = d3.svg.line()
              .interpolate(this.interpolate())
              .defined(function(d) { 
                return (!isNaN(y(d[aes.y]))); 
              })
              .tension(this.tension());
  if(x.hasOwnProperty('rangeBand')) {
    return line
            .x(function(d, i) { 
              return (x(d[aes.x]) + o2(d[group]) + 
                            o2.rangeBand() * i); 
            })
            .y(function(d) { return y(d[aes.y]); });
  }
  if(y.hasOwnProperty('rangeBand')) {
    return line
            .x(function(d) { return x(d[aes.x]); })
            .y(function(d, i) { 
              return (y(d[aes.y]) + o2(d[group]) +
                            o2.rangeBand()*i); 
            });
  }
  return line
          .x(function(d, i) { return x(d[aes.x]); })
          .y(function(d, i) { return y(d[aes.y]); });
};

Line.prototype.selector = function(layerNum) {
  if(this.grid()){
    var direction = this.name() === "hline" ? "x": "y";
    return "grid-" + direction;
  }
  return "geom g" + layerNum + " geom-" + this.name();
};

Line.prototype.drawLines = function (path, line, s, layerNum) {
  var that = this;
  if(!this.lineType()){
    this.lineType(s.plot.lineType());
  }
  path.attr("class", this.selector(layerNum))
    .attr('d', line)
    .attr('stroke-dasharray', this.lineType());
  if(!this.grid()){
    // grid style defined in css.
    path
      .attr('opacity', function(d) { return s.alpha(d[1]) ;})
      .attr('stroke', function(d) { return s.lcolor(d[1]);})
      .attr('stroke-width', this.lineWidth())
      .attr('fill',  function(d) { 
        return s.gradient ? s.lcolor(d[1]): 'none';});
  }
};

Line.prototype.prepareData = function(data, s) {
  data = s.nest
          .entries(data.data) ;
  data = _.map(data, function(d) { return this.recurseNest(d);}, this);
  return _.isArray(data[0]) ? data: [data];
};

Line.prototype.draw = function(sel, data, i, layerNum){
  // console.log('first line of line.draw');
  // console.log(data);
  var s     = this.setup(),
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                 this.drawX(), this.drawY()),
      x = scales.x.scale(),
      y = scales.y.scale(),
      o2 = function() { return 0; };
      o2.rangeBand = function() { return 0; };
      s.gradient = false;

  if(x.hasOwnProperty('rangeBand') ||
     y.hasOwnProperty('rangeBand')){
    if(s.grouped) {
      o2 = s.plot.subScale().single.scale();
    }
  }

  var l1 = this.generator(s.aes, x, y, o2, s.group),
      selector = data.selector;
  data = this.prepareData(data, s, scales);
  // overwriting the color function messes up tooltip labeling,
  // if needed.
  s.lcolor = s.color;

  // if color gradient
  if(s.aes.color && _.contains(['number', 'date', 'time'], s.dtypes[s.aes.color][0]) && s.dtypes[s.aes.color][1] === "many"){
    s.gradient = true;
    if(this.freeColor()){
      var color = d3.scale.linear()
                .range(s.plot.colorRange())
                .domain(d3.extent(_.pluck(_.flatten(data), s.aes.color)));
      s.lcolor = function(d) { return color(d[s.aes.color]); };
    }
    data = _.map(data, function(d) { 
      return this.quad(this.sample(d, l1, x, y, s.color, s.aes ), 
                       s.aes); }, this);
    data = _.flatten(data, true);
    // alpha must be constant
    var lw = this.lineWidth();
    s.alpha = s.plot.alpha();
    line = _.bind(function(d) {
      return this.lineJoin(d[0], d[1], d[2], d[3], lw);
    }, this);
  } else {
    line = l1;
  }
  sel = this.grid() ? sel.select("." + this.direction() + 'grid'): sel.select('.plot');
  var lines = sel
              .selectAll("." + this.selector(layerNum).replace(/ /g, '.'))
              .data(data);
  lines.transition().call(_.bind(this.drawLines, this), line, s, layerNum);
  lines.enter().append(this.geom())
    .call(_.bind(this.drawLines, this), line, s, layerNum);
  lines.exit()
    .transition()
    .style('opacity', 0)
    .remove();
};
// next four functions copied verbatim from http://bl.ocks.org/mbostock/4163057
// used to add linear gradient to line.
// Sample the SVG path string "d" uniformly with the specified precision.
// gonna use this for discrete change of colors for a few points and
// continuous change of color for many
Line.prototype.sample = function(d, l, x, y, color, aes) {
  var n = d.length;
  d = _.map(d, function(r, i) {
        var o = [];
        o[aes.color] = r[aes.color];
        o[0] = x(r[aes.x]);
        o[1] = y(r[aes.y]);
        return o;
      });
  return d;
  // uncomment this code for continuous gradient legends, for example.
  // var path = document.createElementNS(d3.ns.prefix.svg, "path");
  // path.setAttribute("d", l(d);
  // var n = path.getTotalLength(), t = [0], i = 0, 
  //     dt = Math.floor(n/precision);
  //     console.log(n);
  // while ((i += dt) < n) { t.push(i); }
  // t.push(n);

  // return t.map(function(t) {
  //   var p = path.getPointAtLength(t), a = [p.x, p.y];
  //   a.t = t / n;
  //   return a;
  // });
};

// Compute quads of adjacent points [p0, p1, p2, p3].
Line.prototype.quad = function(points, aes) {
  return d3.range(points.length - 1).map(function(i) {
    var a = [points[i - 1], points[i], points[i + 1], points[i + 2]];
    a[aes.color] = (points[i][aes.color] + points[i + 1][aes.color]) / 2;
    return a;
  });
};

// Compute stroke outline for segment p12.
Line.prototype.lineJoin = function(p0, p1, p2, p3, width) {
  var u12 = this.perp(p1, p2),
      r = width / 2,
      a = [p1[0] + u12[0] * r, p1[1] + u12[1] * r],
      b = [p2[0] + u12[0] * r, p2[1] + u12[1] * r],
      c = [p2[0] - u12[0] * r, p2[1] - u12[1] * r],
      d = [p1[0] - u12[0] * r, p1[1] - u12[1] * r],
      e, u23, u01;

  // this section is causing very large numbers in y vector.
  // if (p0) { // clip ad and dc using average of u01 and u12
  //   u01 = this.perp(p0, p1);
  //   e = [p1[0] + u01[0] + u12[0], p1[1] + u01[1] + u12[1]];
  //   a = this.lineIntersect(p1, e, a, b);
  //   d = this.lineIntersect(p1, e, d, c);
  // }

  // if (p3) { // clip ab and dc using average of u12 and u23
  //   u23 = this.perp(p2, p3);
  //   e = [p2[0] + u23[0] + u12[0], p2[1] + u23[1] + u12[1]];
  //   b = this.lineIntersect(p2, e, a, b);
  //   c = this.lineIntersect(p2, e, d, c);
  // }
  return "M" + a + "L" + b + " " + c + " " + d + "Z";
};

// Compute intersection of two infinite lines ab and cd.
Line.prototype.lineIntersect = function(a, b, c, d) {
  var x1 = c[0], x3 = a[0], x21 = d[0] - x1, x43 = b[0] - x3,
      y1 = c[1], y3 = a[1], y21 = d[1] - y1, y43 = b[1] - y3,
      ua = (x43 * (y1 - y3) - y43 * (x1 - x3)) / (y43 * x21 - x43 * y21);
  return [x1 + ua * x21, y1 + ua * y21];
};

// Compute unit vector perpendicular to p01.
Line.prototype.perp = function(p0, p1) {
  var u01x = p0[1] - p1[1], u01y = p1[0] - p0[0],
      u01d = Math.sqrt(u01x * u01x + u01y * u01y);
  return [u01x / u01d, u01y / u01d];
};

ggd3.geoms.line = Line;
// 
function Histogram(spec) {
  if(!(this instanceof Geom)){
    return new Histogram(spec);
  }
  Bar.apply(this);
  var attributes = {
    name: "histogram",
    stat: "bin",
    position: "stack",
    bins: 30,
    breaks: null,
    frequency: true,
  };
  var r = function(d) { return ggd3.tools.round(d, 2);};
  this.attributes = _.merge(this.attributes, attributes);

  function tooltip(sel, opts) {
    var s = this.setup(),
        that = this,
        v = s.aes.y === "binHeight" ? s.aes.x: s.aes.y,
        c = s.aes.fill || s.aes.color;
    sel.each(function(d) {
        var el = d3.select(this);
        el.append('h4')
          .text(v + ": " )
          .append("span").text(r(d[v]) + " - " + r(d[v]+d.dx));
        el.append('h4')
          .text("bin size: " )
          .append("span").text(r(d.binHeight));
        that._otherAesthetics(el, d, s, ['x', 'y']);
        el.append('h4')
          .text("n: " )
          .append("span").text(d.length);
    });
  }
  this.attributes.tooltip = _.bind(tooltip, this);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Histogram.prototype = new Bar();
  
Histogram.prototype.constructor = Histogram;

Histogram.prototype.domain = function(data, v) {
  var s = this.setup(),
      group, stackby,
      groupSum, stackSum,
      grouped;

  if(s.aes[v] === "binHeight") {
    grouped = _.groupBy(data, function(d) {
      return d.x;
    });
    stackSum = _.mapValues(grouped, function(v, k) {
      return _.reduce(_.pluck(v, "y"), function(a,b) {
        return a + b;
      });
    });
    stackSum = d3.extent(_.map(stackSum, function(v, k) { return v; }));
    groupSum = d3.extent(data, function(d) {
      return d.y;
    });
    extent = s.position === "stack" ? stackSum: groupSum;
    range = extent[1] - extent[0];
    extent[0] -= 0.05*range;
  } else {
    extent = d3.extent(_.pluck(data, 'x'));
    range = extent[1] - extent[0];
    extent[0] -= 0.1*range;
  }
  // extent both ways to draw an empty chart, I guess
  if(range === 0){
    extent[0] -= 1;
    extent[1] += 1;
  }
  extent[1] += 0.1*range;
  return extent;
};

Histogram.prototype.compute = function(data, s) {
  // first get bins according to ungrouped data;
  if(!s.grouped) { 
    return s.nest.entries(data); 
  }
  this.breaks(this.bins());
  var unNested = s.stat.compute(data),
      breaks = _.map(unNested, "x");
  // this is the problem
  // there should be a 'fixed bins' flag
  this.breaks(breaks);
  return s.nest.entries(data);
};

Histogram.prototype.fillEmptyStackGroups = function(data, v) {

  var keys = _.unique(_.map(data, function(d) { return d.key; })),
      vals = _.unique(_.flatten(_.map(data, function(d) {
        return _.map(d.values, 'x');
      }))),
      empty = {},
      n = d3.nest()
            .key(function(d) { return d[v]; });
  empty.y = 0;
  empty.binHeight = 0;
  empty.dx = data[0].dx;
  _.each(data, function(d) {
    var dkey, missing;
    dkeys = _.map(d.values, 'x');
    missing = _.compact(_.filter(vals, function(k) {
      return !_.contains(dkeys, k);
    }));
    if(!_.isEmpty(missing)) {
      _.each(missing, function(m) {
        // must fill other values, too.
        var e = _.clone(empty);
        e.x = m;
        d.values.push(e);
      });
    }
    d.values = _.sortBy(d.values, function(e) {
      return e.x;
    });
  });
  return data;
};
// geoms may want to be nested differently.
Histogram.prototype.nest = function() {
  // if stacking histograms, bins must be calculated
  // first on entire facet, then individually on
  // each layer. If facet.scales() === "fixed"
  // bins should be the same across facets. If not
  // the pre calculated bins need to be stored and 
  // referenced when calculating layers.
  var aes = this.layer().aes(),
      plot = this.layer().plot(),
      nest = d3.nest(),
      dtypes = plot.dtypes(),
      nestVars = _.unique(_.compact([aes.group, aes.fill, aes.color]));

  _.each(nestVars, function(n) {
    if(dtypes[n][1] !== "many") {
      nest.key(function(d) { return d[n]; });
    }
  });
  _.map(['x', 'y'], function(a) {
    if(plot[a + "Scale"]().single.scaleType() === "ordinal"){
      nest.key(function(d) { return d[aes[a]]; });
    }
  });
  return nest;
};

ggd3.geoms.histogram = Histogram;

function Abline(spec) {
  if(!(this instanceof Geom)){
    return new Abline(spec);
  }
  Line.apply(this);
  var attributes = {
    name: "abline",
    // color: d3.functor("black")
  };

  this.attributes = _.merge(_.clone(this.attributes), attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Abline.prototype = new Line();

Abline.prototype.constructor = Abline;

Abline.prototype.domain = function(data, a) {
  // it is not getting called because slope and intercept
  // have no need to set a scales domain.
  // maybe...
  return data;
};

Abline.prototype.prepareData = function(d, s, scales) {

  if(!_.contains(_.keys(s.aes), "yintercept")){
    throw "geom abline requires aesthetic 'yintercept' and an optional slope.";
  }
  if(!_.contains(linearScales, scales.x.scaleType() )){
    throw "use geom hline or vline to draw lines on an ordinal x axis y yaxis";
  }
  if(!s.aes.slope){
    s.aes.slope = 0;
  }
  var xdomain = scales.x.scale().domain(),
      data;
  if(_.isNumber(s.aes.yintercept)){
    s.aes.yintercept = [s.aes.yintercept];
  }
  if(_.isArray(s.aes.yintercept)){
    // yints and slopes are drawn on every facet.
    data = _.map(s.aes.yintercept, function(y) {
      return _.map(xdomain, function(x, i) {
        var o = {};
        o[s.aes.x] = x;
        o[s.aes.y] = y + s.aes.slope * x;
        return o;
      });
    });
  }
  if(_.isString(s.aes.yintercept)){
    data = [];
    _.each(d.data, function(row) {
      data.push(_.map(xdomain, function(x) {
        var o = {};
        o[s.aes.x] = x;
        o[s.aes.y] = row[s.aes.yintercept] + row[s.aes.slope] * x;
        o = _.merge(_.clone(row), o);
        return o;
      }));
    }); 
  }
  return data;
};


ggd3.geoms.abline = Abline;
// 
function Area(spec) {
  if(!(this instanceof Area)){
    return new Area(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "area",
    stat: "identity",
    geom: "path",
    position: null,
    interpolate: 'linear',
    alpha: 0.2,
    strokeOpacity: 0.1
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Area.prototype = new Geom();

Area.prototype.constructor = Area;

Area.prototype.prepareData = function(data, s) {
  data = s.nest
          .entries(data.data) ;
  data = _.map(data, function(d) { return this.recurseNest(d);}, this);
  return _.isArray(data[0]) ? data: [data];
};

Area.prototype.generator = function(aes, x, y, o2, group, n) {
  var dir = !_.isUndefined(aes.ymin) ? 'x': 'y',
      other = dir === "x" ? "y": 'x',
      dirScale = dir === "x" ? x: y,
      otherScale = dir === "x" ? y: x;
  var area = d3.svg.area()
                .interpolate(this.interpolate());

  if(x.hasOwnProperty('rangeBand')) {
    return area
            .x0(function(d, i) { 
              return (x()(d[aes.x]) + o2(d[group])); 
            })
            .x1(function(d, i) { 
              return (x()(d[aes.x]) + o2(d[group]) + 
                            o2.rangeBand()); 
            })
            .y(function(d) { return y()(d[aes.y]); });
  }
  if(y.hasOwnProperty('rangeBand')) {
    return area
            .x(function(d) { return x()(d[aes.x]); })
            .y0(function(d, i) { 
              return (y()(d[aes.y]) + o2(d[group]) +
                            o2.rangeBand()); 
            })
            .y1(function(d, i) { 
              return (y()(d[aes.y]) + o2(d[group])); 
            });
  }
  area[dir](function(d, i) { 
    console.log(dirScale()(d[aes[dir]]));
    return dirScale()(d[aes[dir]]); 
    });
  area[other + "0"](function(d, i) { 
    return otherScale(other + 'min', n)(d); });
  area[other + '1'](function(d, i) { 
    return otherScale(other + 'max', n)(d); });
  return area;
};


Area.prototype.decorateScale = function(dir, s, sc, data) {
  // if it's area, don't use data and just use values
  var a = this.name() === 'area';
  if(_.isNumber(s.aes[dir + 'min'])){
    // both ymin and ymax should be set to be a number above
    // and below the given y variable
    this.check(s.aes, dir);
    if(a) {
      return function(m) {
        return function(d) { console.log(sc(s.aes[m]));return sc(s.aes[m]); };
      };
    }else {
      return function(m) {
        return function(d) { return sc(d[s.aes[dir]] + s.aes[m]);};
      };
    }
  } else if(_.isFunction(s.aes.ymin)) {
    this.check(s.aes, dir);
    // is trusting the order a reliable thing to do?
    var minAgg = _.map(data, function(d) { 
      return -s.aes[dir + 'min'](_.pluck(d, s.aes[dir]));
    });
    var maxAgg = _.map(data, function(d) { 
      return s.aes[dir + 'max'](_.pluck(d, s.aes[dir]));
    });
    return function(m, i) {
      return function(d) {
        var v = m === (dir + 'max') ? maxAgg[i]:minAgg[i];
        return sc(d[s.aes.y] + v) ;};
    };
  } else if (_.isString(s.aes[dir + "min"])){
    this.check(s.aes, dir);
    // not tested, should work fine;
    return function(m) {
      return function(d) { 
        return sc(d[s.aes[dir]] + d[s.aes[m]]);
      };
    };
  } else {
    // we're not going in that direction
    return function() {
      return function(d) {
        return sc(d);
      };
    };
  }
};

Area.prototype.check = function(aes, d) {
  if(!aes[d + 'min'] || !aes[d + 'max']){
    throw "You must specify, as a function, variable, or constant" +
      " a " + d + "min and " + d + "max";
  }
};

Area.prototype.drawArea = function(area, gen, s, layerNum) {
  var that = this;
  area.attr('class', "geom g" + layerNum + " geom-" + this.name())
    .attr('d', gen)
    .attr('fill-opacity', function(d) { return s.alpha(d[0]); })
    .attr('stroke', function(d) { 
      return s.color(d[0]); 
    })
    .attr('stroke-opacity', function(d) { return that.strokeOpacity(); })
    .attr('fill', function(d) { return s.fill(d[0]); });
};

// area recieves an array of objects, each of which
// have variables corresponding to ymin, ymax, xmin, xmax
// or those aesthetics are numbers or functions 
Area.prototype.draw = function(sel, data, i, layerNum){
  var s = this.setup(),
      that = this,
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                this.drawX(), this.drawY()),
      x = scales.x.scale(),
      y = scales.y.scale(),
      y2,
      x2,
      selector = data.selector,
      o,
      o2 = function() { return 0; };
      o2.rangeBand = function() { return 0;};
  // flatten till we have an array of arrays.
  data = ggd3.tools.arrayOfArrays(this.prepareData(data, s));
  // area should work on ordinal axes as well.
  // so we can do, like, bullet charts'n shit.
  y2 = this.decorateScale('y', s, y);
  x2 = this.decorateScale('x', s, x);

  // silly way to give scale wrappers an ownProperty
  // of 'rangeBand' to satisfy generator conditions for ordinal
  if(x.hasOwnProperty('rangeBand')){
    if(s.grouped) {
      o = s.plot.subScale().single.scale();
      o2 = d3.scale.ordinal()
              .domain(o.domain())
              .rangeRoundBands(o.rangeExtent(), 
                               s.plot.subRangeBand()/2,
                               s.plot.subRangePadding()/2);
      x2.rangeBand = function() { return "yep"; };
    }
  }
  if(y.hasOwnProperty('rangeBand')){
    if(s.grouped) {
      o = s.plot.subScale().single.scale();
      o2 = d3.scale.ordinal()
              .domain(o.domain())
              .rangeRoundBands(o.rangeExtent(), 
                               s.plot.subRangeBand()/2,
                               s.plot.subRangePadding()/2);
      y2.rangeBand = function() { return "yep"; };
    }
  }
  var areaGen = that.generator(s.aes, x2, y2, o2, s.group);

  var area = sel.select('.plot')
              .selectAll(".g" + layerNum + "geom-" + this.name())
              .data(data); // one area per geom
  area.transition()
    .each(function(d, i) {
      that.drawArea(d3.select(this), areaGen, s, layerNum);
    });
  // makes sense that all area/ribbons go first.
  area.enter().insert(this.geom(), "*")
    .each(function(d, i) {
      that.drawArea(d3.select(this), areaGen, s, layerNum);
    });
  area.exit()
    .transition()
    .style('opacity', 0)
    .remove();


};

ggd3.geoms.area = Area;
// 
function Box(spec) {
  if(!(this instanceof Geom)){
    return new Box(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "box",
    stat: "box",
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Box.prototype = new Geom();

Box.prototype.constructor = Box;

Box.prototype.determineOrdinal = function(s) {
  // this is dumb, this logic needs to happen when scales are created;
  if(s.plot.xScale().single.scaleType() === "ordinal"){
    return 'x';
  } else {
    return 'y';
  }
};

Box.prototype.domain = function(data, a) {

  var s = this.setup(),
      factor = this.determineOrdinal(s),
      number = factor === 'x' ? 'y': 'x',
      domain,
      extent;
  if(a === factor) {
    domain = _.sortBy(_.map(data, function(d) {
      return _.unique(_.pluck(d.data, s.aes[a]));
    }));
  } else {
    domain = d3.extent(_.flatten(_.map(data, function(d) {
      return _.pluck(d.data, s.aes[a]);
    })));
    extent = domain[1] - domain[0];
    domain[0] -= extent*0.1;
    domain[1] += extent*0.1;
  }
  return domain;
};
// box takes an array of numbers and draws a box around the 
// two extremes and lines at the inner points.
Box.prototype.drawGeom = function(box, x, y, w, h, s, layerNum) {
  box.attr({
    x: x,
    y: y,
    width: w,
    height: h,
    fill: s.fill,
    "fill-opacity": s.alpha,
    stroke: s.color,
    "stroke-opacity": s.alpha
  });

};
Box.prototype.draw = function(sel, data, i, layerNum) {
  // not really necessary, but can look a lot like point and text.
  // might be the same. 
};

ggd3.geoms.box = Box;
// 
function Boxplot(spec) {
  if(!(this instanceof Geom)){
    return new Boxplot(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "boxplot",
    stat: "boxplot",
    position: "jitter",
    upper: 0.95,
    lower: 0.05,
    tail: null,
    outliers: true,
    mean: false,
  };

  var r = function(d) { return ggd3.tools.round(d, 2);};
  function tooltip(sel, s, opts) {
    var that = this;
    sel.each(function(d) {
        var el = d3.select(this);
        _.mapValues(d.quantiles, function(v, k) {
          el.append('h5')
            .text(k + ": " + r(v));
        });
    });
  }
  attributes.tooltip = _.bind(tooltip, this);

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Boxplot.prototype = new Geom();

Boxplot.prototype.constructor = Boxplot;

Boxplot.prototype.determineOrdinal = function(s) {
  // this is dumb, this logic needs to happen when scales are created;
  if(s.plot.xScale().single.scaleType() === "ordinal"){
    return 'x';
  } else {
    return 'y';
  }
};

Boxplot.prototype.domain = function(data, a) {

  var s = this.setup(),
      factor = this.determineOrdinal(s),
      number = factor === 'x' ? 'y': 'x',
      domain,
      extent;
  if(a === factor) {
    domain = _.sortBy(_.map(data, function(d) {
      return _.unique(_.pluck(d.data, s.aes[a]));
    }));
  } else {
    domain = d3.extent(_.flatten(_.map(data, function(d) {
      return _.pluck(d.data, s.aes[a]);
    })));
    extent = domain[1] - domain[0];
    domain[0] -= extent*0.1;
    domain[1] += extent*0.1;
  }
  return domain;
};

Boxplot.prototype.draw = function(sel, data, i, layerNum) {

  var s = this.setup(),
      that = this,
      o, n, o2, rb,
      size, width,
      line,
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                               this.drawX(), this.drawY()),
      vertical = scales.x.scaleType() === "ordinal",
      factor = vertical ? "x": "y",
      number = vertical ? "y": "x";

  data = this.unNest(data.data);
  o = scales[factor].scale();
  rb = o.rangeBand();
  n = scales[number].scale();
  line = d3.svg.line();

  if(vertical){
    // vertical boxes
    size = {s: "height", p: 'y', c: "cy"};
    width = {s: "width", p: 'x', c: "cx"};
    // point scales;
    px = function(d) { return (d._jitter * rb/2) + rb/2; };
    py = function(d) { return n(d[s.aes[number]]); };
    // box scales
    rx = function(d) { return 0; };
    ry = function(d) { 
      return n(d.quantiles["75th percentile"] ); };
    rw = function() { return rb; };
    rh = function(d) { 
      return (n(d.quantiles["25th percentile"]) - 
              n(d.quantiles["75th percentile"])); };
  } else {
    // horizontal boxes
    size = {s: "width", p:'x', c: "cx"};
    width = {s:"height", p: 'y', c: "cy"};
    py = function(d) { return (d._jitter * rb/2) + rb/2; };
    px = function(d) { return n(d[s.aes[number]]); };
    ry = function(d) { return 0; };
    rx = function(d) { 
      return n(d.quantiles["25th percentile"] ); };
    rh = function() { return rb; };
    rw = function(d) { 
      return (n(d.quantiles["75th percentile"]) - 
              n(d.quantiles["25th percentile"])); };
  }
  if(s.grouped && !_.contains([s.aes.x, s.aes.y], s.group)) {
    s.groups = _.sortBy(_.unique(_.flatten(_.map(data, function(d) {
      return _.compact(_.pluck(d.data, s.group));
    }))));
    o2 = s.plot.subScale().single.scale();
    rb = o2.rangeBand();
  } else {
    o2 = function() {
      return 0;
    };
    o2.rangeBand = function() { return 0; };
  }

  function whisker(d, dir) {
    var out;
    switch(dir){
      case "upper":
        out = [[rb/2, n(d.upper)],
          [rb/2, n(d.quantiles["75th percentile"])]];
        break;
      case "lower":
        out = [[rb/2, n(d.lower)],
        [rb/2, n(d.quantiles["25th percentile"])]];
        break;
      case "median":
        out = [[0, n(d.quantiles["50th percentile"])], 
        [rb, n(d.quantiles["50th percentile"])]];
        break;
    }
    if(!vertical) { 
      out = _.map(out, function(d){
                  return d.reverse();
              }); 
    }
    return out;
  }

  function draw(box) {
    var d = box.datum(),
    rect = box.selectAll('rect')
              .data([d]);
    box.select(".upper")
      .datum(whisker(d, 'upper'))
      .attr('d', line)
      .attr('stroke', 'black');
    box.select(".lower")
      .datum(whisker(d, 'lower'))
      .attr('d', line)
      .attr('stroke', 'black');
    box.select(".median")
      .datum(whisker(d, 'median'))
      .attr('d', line)
      .attr('stroke', 'black');
    box
      .attr("transform", function(d) {
        var v = o(d[s.aes[factor]]) + o2(d[s.group]);
        if(!vertical) { 
          return "translate(0," + v + ")";
        } 
        return "translate(" + v + ",0)" ;
      });
    var r = ggd3.geoms.box(),
        tt = ggd3.tooltip()
                .content(that.tooltip())
                .geom(that);
    rect.call(r.drawGeom, rx, ry, rw, rh, s, layerNum);
    rect.enter().append('rect')
      .attr('class', 'quantile-box')
      .call(r.drawGeom, rx, ry, rw, rh, s, layerNum)
      .each(function(d) {
        tt.tooltip(d3.select(this));
      });
    if(that.outliers()) {
      var p = ggd3.geoms.point();
      s.x = px;
      s.y = py;
      p.draw(box, d.data, i, layerNum, s);
    }
  }
  var boxes = sel.select('.plot')
                .selectAll('.geom g' + layerNum)
                .data(data);

  boxes.each(function(d) {
    d3.select(this).call(_.bind(draw, this));
  });

  boxes.enter().append('g').each(function(d) {
    var b = d3.select(this);
    b.attr('class', 'geom g' + layerNum + ' geom-' + that.name());
    b.append('path').attr('class', 'upper');
    b.append('path').attr('class', 'lower');
    b.append('path').attr('class', 'median');
    b.call(draw);
  });
  boxes.exit().transition()
    .style("opacity", 0)
    .remove();
};

ggd3.geoms.boxplot = Boxplot;
// 
function Density(spec) {
  if(!(this instanceof Geom)){
    return new Density(spec);
  }
  Geom.apply(this, spec);
  var attributes = {
    name: "density",
    stat: "density",
    kernel: "epanechnikovKernel",
    geom: "path",
    smooth: 6,
    nPoints: 100,
    fill: false, // fill with same color?
    alpha: 0.8,
    lineType: null,
    lineWidth: null
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Density.prototype = new Geom();
  
Density.prototype.constructor = Density;

Density.prototype.kde = function(kernel, x) {
  return function(sample) {
    return x.map(function(x) {
      return [x, d3.mean(sample, function(v) { return kernel(x-v); })];
    });
  };
};

Density.prototype.gaussianKernel = function(scale) {
  var pi = 3.14159265359,
      sqrt2 = Math.sqrt(2);
  return function(u){
    return 1/(sqrt2*pi) * Math.exp(-1/2 * Math.pow(u*scale, 2));
  };
};
Density.prototype.epanechnikovKernel = function(scale) {
  return function(u) {
    return Math.abs(u /= scale) <= 1 ? 0.75 * (1 - u * u) / scale : 0;
  };
};

Density.prototype.draw = function(sel, data, i, layerNum){

  var s     = this.setup(),
      that  = this;

  function drawDensity(path){

    path.attr('class', 'geom g' + layerNum + " geom-density")
        .attr('d', function(d) {
            return line(d.values);
        })
        .attr('stroke-width', that.lineWidth())
        .attr('stroke-dasharray', that.lineType())
        .attr('stroke', function(d) {
          return s.color(d.values[1]); 
        })
        .attr('stroke-opacity', that.alpha());
    if(that.fill()){
      path
        .style('fill', function(d) {
          return s.color(d.key);
        })
        .style('fill-opacity', that.alpha());
    }
  }
  var scales = that.scalesAxes(sel, s, data.selector, layerNum,
                               true, true);

  var n, d;
  if(s.aes.y === "density") {
    n = 'x';
    d = 'y';
  } else {
    n = 'y';
    d = 'x';
  }
  // nest, but don't compute
  data = s.nest.rollup(function(d) { return d; })
          .entries(data.data);

  // if data are not grouped, it will not be nested
  // so we have to manually nest to pass to drawDensity
  if(!data[0].key && !data[0].values){
    data = [{key:'key', values: data}];
  }
  var line = d3.svg.line();
  line[n](function(v) { return scales[n].scale()(v[s.aes[n]]); } );
  line[d](function(v) { return scales[d].scale()(v[s.aes[d]]); } );
  // need to calculate the densities to draw proper domains.
  ggd3.tools.removeElements(sel, layerNum, this.geom());
  var path = sel.select('.plot')
                .selectAll('.geom.g' + layerNum)
                .data(data);
  path.transition().call(drawDensity);
  path.enter().append(this.geom()).call(drawDensity);
  path.exit()
    .transition()
    .style('opacity', 0)
    .remove();
};

ggd3.geoms.density = Density;

function Hline(spec) {
  if(!(this instanceof Geom)){
    return new Hline(spec);
  }
  Line.apply(this);
  var attributes = {
    name: "hline",
    direction: "x",
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Hline.prototype = new Line();

Hline.prototype.constructor = Hline;

Hline.prototype.generator = function(aes, x, y, sub, group) {
  // get list of intercepts and translate them
  // in the data to the actual coordinates
  var s = this.setup();
  if(this.grid()){
    x = d3.scale.linear()
          .range([0, s.dim.x])
          .domain([0, s.dim.x]);
    y = d3.scale.linear()
            .range([0, s.dim.y])
            .domain([0, s.dim.y]);
    return d3.svg.line()
            .x(function(d) { return x(d.x); })
            .y(function(d) { return y(d.y); })
            .interpolate(this.interpolate());
  } else {
    return Line.prototype.generator.call(this, aes, x, y, sub, group);
  }
};

Hline.prototype.prepareData = function(data, s, scales) {
  // hline and vline accept two forms of data
  // an array of intercepts to be drawn on every facet
  // or an array of objects.
  // objects will be nested according to the grouping 
  // variables and a summary function will be 
  // executed
  var direction = this.direction(),
      other = direction === "x" ? 'y': 'x',
      scale = scales[direction],
      otherScale = scales[other],
      range = scale.domain(),
      p;
  if(this.grid()) {
    if(!_.contains(linearScales, scale.scaleType())){
      p =  _.map(scale.scale().domain(),
                function(i) {
                  return scale.scale()(i) + scale.scale().rangeBand()/2;
                });
    } else {
      p = _.map(scales[direction].scale().ticks(4),
                function(i) {
                  return scale.scale()(i);
                });
    } 
    // disregard data grab intercepts from axis and
    // create new dataset.
    data = [];
    _.each(p, function(intercept) {
      var o1 = {}, o2 = {};
      o1[direction] = intercept;
      o2[direction] = intercept;
      o1[other] = 0;
      o2[other] = s.dim[other];
      data.push([o1, o2]);
    });
    return data;
  }
  if(_.isUndefined(s.aes[other + "intercept"])){
    // data must be array of objects with required aesthetics.
    data = Line.prototype.prepareData.call(this, data, s);
    // data are nested
    if(_.contains(linearScales, scale.scaleType())) {
      data = _.map(data, function(d) {
        return _.map(d, function(r) {
          return _.map(range, function(e){
            var o = _.clone(r);
            o[s.aes[direction]] = e;
            return o;
          });
        });
      });
      data = _.flatten(data, true);
    } else {
      data = _.map(_.flatten(data), function(d) {
        return [d, d];
      });
    }
  } else {
    // there should be an array of intercepts on 
    // s.aes.yintercept or s.aes.xintercept
    data = _.map(s.aes[other + "intercept"], function(i) {
      var o1 = {},
          o2 = {};
      o1[s.aes[other]] = i;
      o1[s.aes[direction]] = range[0];
      o2[s.aes[other]] = i;
      o2[s.aes[direction]] = range[1];
      return [o1, o2];
    });
  }
  return data;

};



ggd3.geoms.hline = Hline;
// 
function Path(spec) {
  if(!(this instanceof Geom)){
    return new Path(spec);
  }
  Line.apply(this);
  var attributes = {
    name: "path",
    stat: "identity",
    position: null,
    interpolate: "linear",
    lineWidth: 1,
    tension: 1,
  };
  // path is just line drawn in order, so probably doesn't need anything.

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Path.prototype = new Line();

Path.prototype.constructor = Path;

ggd3.geoms.path = Path;

// allow layer level specifying of size, fill,
// color, alpha and shape variables/scales
// but inherit from layer/plot if 
function Point(spec) {
  if(!(this instanceof Geom)){
    return new Point(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "point",
    geom: "circle",
    stat: "identity",
    position: "identity",
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}
Point.prototype = new Geom();

Point.prototype.constructor = Point;

Point.prototype.positionPoint = function(s, group) {

  var o2,
      rb = 0,
      a = s.aesthetic(),
      shift = 0,
      aes = this.layer().aes();
  if(s.scaleType() === "ordinal" && group){
    o2 = this.layer().plot().subScale().single.scale();
    rb = o2.rangeBand()/2;
    shift = d3.sum(s.rangeBands(), function(r) {
      return r*s.scale().rangeBand();});
  } else if(s.scaleType() === "ordinal") {
    o2 = function() { 
      return s.scale().rangeBand() / 2; 
    };
    rb = s.scale().rangeBand() / 2;
  } else {
    o2 = function() { return 0;};
  }
  return function(d) {
    return (s.scale()(d[aes[a]]) +
          o2(d[group]) + shift + 
          (d._jitter || 0) * rb);
  };
};

Point.prototype.draw = function(sel, data, i, layerNum, s) {

  // should be able to pass a setup object from a different geom
  // if a different geom wants to create a point object.
  var x, y, scales, points;
  // other functions that call geom point will supply an "s" object
  if(_.isUndefined(s)) {
    s     = this.setup();
    scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                 true, true);
    // point should have both canvas and svg functions.
    x = this.positionPoint(scales.x, s.group);
    y = this.positionPoint(scales.y, s.group);
    data = this.unNest(data.data);
    // get rid of wrong elements if they exist.
    points = sel.select('.plot')
                .selectAll('.geom.g' + layerNum + ".geom-" + this.name())
                .data(data);
  } else {
    points = sel.selectAll('.geom.g' + layerNum + ".geom-" + this.name())
                .data(data);
    x = s.x;
    y = s.y;
  }

  var tt = ggd3.tooltip()
            .content(this.tooltip())
            .geom(this);


  points.transition().call(this.drawGeom, x, y, s, layerNum);
  points.enter().append(this.geom())
    .call(this.drawGeom, x, y, s, layerNum);
  points.exit()
    .transition()
    .style('opacity', 0)
    .remove();
  points.each(function() {
      tt.tooltip(d3.select(this), s);
    });
};

Point.prototype.drawGeom = function (point, x, y, s, layerNum) {
  point
    .attr('class', 'geom g' + layerNum + " geom-point")
    .attr({
      cx: x,
      cy: y,
      r: s.size,
      fill: s.fill
    })
    .style({
      stroke: s.color,
      "stroke-width": 1,
      "fill-opacity": s.alpha
    });
};

ggd3.geoms.point = Point;

// 
function Ribbon(spec) {
  if(!(this instanceof Ribbon)){
    return new Ribbon(spec);
  }
  Area.apply(this);
  var attributes = {
    name: "ribbon",
    stat: "identity",
    position: null,
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Ribbon.prototype = new Area();

Ribbon.prototype.constructor = Ribbon;

Ribbon.prototype.generator = function(aes, x, y, o2, group, n) {

  var area = d3.svg.area()
                .interpolate(this.interpolate());

  if(x.hasOwnProperty('rangeBand')) {
    return area
            .x0(function(d, i) { 
              return (x(d[aes.x]) + o2(d[group]) + 
                            o2.rangeBand() * i); 
            })
            .x1(function(d, i) { 
              return (x(d[aes.x]) + o2(d[group]) + 
                            o2.rangeBand() * (i + 1)); 
            })
            .y0(function(d) { return y(d[aes.ymin]); })
            .y1(function(d) { return y(d[aes.ymax]); });
  }
  if(y.hasOwnProperty('rangeBand')) {
    return area
            .x0(function(d) { return x(d[aes.xmax]); })
            .x1(function(d) { return x(d[aes.xmin]); })
            .y0(function(d, i) { 
              return (y(d[aes.y]) + o2(d[group]) +
                            o2.rangeBand()*i); 
            })
            .y1(function(d, i) { 
              return (y(d[aes.y]) + o2(d[group]) +
                            o2.rangeBand()*(i + 1)); 
            });
  }
  return area
          .x(function(d, i) { return x(d[aes.x]); })
          .y0(function(d, i) { return y('ymin', n)(d); })
          .y1(function(d, i) { return y('ymax', n)(d); });
};

// ribbon is always an operation on ymin, ymax, and x
Ribbon.prototype.draw = function(sel, data, i, layerNum) {
  var s = this.setup(),
      that = this,
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                this.drawX(), this.drawY()),
      x = scales.x.scale(),
      y = scales.y.scale(),
      y2,
      selector = data.selector,
      o2 = function() { return 0; };
      o2.rangeBand = function() { return 0;};
  data = this.prepareData(data, s);
  y2 = this.decorateScale('y', s, y, data);

  var areaGen = function(n) {
    return that.generator(s.aes, x, y2, o2, s.group, n);
  };
  var ribbon = sel.select('.plot')
              .selectAll(".g" + layerNum + "geom-" + this.name())
              .data(data);
  ribbon.transition()
    .each(function(d, i) {
      that.drawArea(d3.select(this), areaGen(i), s, layerNum, i);
    });
  // makes sense that all area/ribbons go first.
  ribbon.enter().insert(this.geom(), ".geom.g0")
    .each(function(d, i) {
      that.drawArea(d3.select(this), areaGen(i), s, layerNum);
    });
  ribbon.exit()
    .transition()
    .style('opacity', 0)
    .remove();
};

ggd3.geoms.ribbon = Ribbon;
// 
function Smooth(spec) {
  Geom.apply(this);
  var attributes = {
    name: "smooth",
    stat: "identity",
    position: null,
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Smooth.prototype.constructor = Smooth;

ggd3.geoms.smooth = Smooth;
(function() {
  var _symbol = d3.svg.symbol(),
      _line = d3.svg.line();

  d3.superformula = function() {
    var type = _symbol.type(),
        size = _symbol.size(),
        segments = size,
        params = {};

    function superformula(d, i) {
      var n, p = _superformulaTypes[type.call(this, d, i)];
      for (n in params) {p[n] = params[n].call(this, d, i);}
      return _superformulaPath(p, segments.call(this, d, i), Math.sqrt(size.call(this, d, i)));
    }

    superformula.type = function(x) {
      if (!arguments.length) {return type;}
      type = d3.functor(x);
      return superformula;
    };

    superformula.param = function(name, value) {
      if (arguments.length < 2) {return params[name];}
      params[name] = d3.functor(value);
      return superformula;
    };

    // size of superformula in square pixels
    superformula.size = function(x) {
      if (!arguments.length) {return size;}
      size = d3.functor(x);
      return superformula;
    };

    // number of discrete line segments
    superformula.segments = function(x) {
      if (!arguments.length) {return segments;}
      segments = d3.functor(x);
      return superformula;
    };

    return superformula;
  };

  function _superformulaPath(params, n, diameter) {
    var i = -1,
        dt = 2 * Math.PI / n,
        t,
        r = 0,
        x,
        y,
        points = [];

    while (++i < n) {
      t = params.m * (i * dt - Math.PI) / 4;
      t = Math.pow(Math.abs(Math.pow(Math.abs(Math.cos(t) / params.a), params.n2) + 
        Math.pow(Math.abs(Math.sin(t) / params.b), params.n3)), -1 / params.n1);
      if (t > r) {r = t;}
      points.push(t);
    }

    r = diameter * Math.SQRT1_2 / r;
    i = -1; while (++i < n) {
      x = (t = points[i] * r) * Math.cos(i * dt);
      y = t * Math.sin(i * dt);
      points[i] = [Math.abs(x) < 1e-6 ? 0 : x, Math.abs(y) < 1e-6 ? 0 : y];
    }

    return _line(points) + "Z";
  }

  var _superformulaTypes = {
    asterisk: {m: 12, n1: 0.3, n2: 0, n3: 10, a: 1, b: 1},
    bean: {m: 2, n1: 1, n2: 4, n3: 8, a: 1, b: 1},
    butterfly: {m: 3, n1: 1, n2: 6, n3: 2, a: 0.6, b: 1},
    circle: {m: 4, n1: 2, n2: 2, n3: 2, a: 1, b: 1},
    clover: {m: 6, n1: 0.3, n2: 0, n3: 10, a: 1, b: 1},
    cloverFour: {m: 8, n1: 10, n2: -1, n3: -8, a: 1, b: 1},
    cross: {m: 8, n1: 1.3, n2: 0.01, n3: 8, a: 1, b: 1},
    diamond: {m: 4, n1: 1, n2: 1, n3: 1, a: 1, b: 1},
    drop: {m: 1, n1: 0.5, n2: 0.5, n3: 0.5, a: 1, b: 1},
    ellipse: {m: 4, n1: 2, n2: 2, n3: 2, a: 9, b: 6},
    gear: {m: 19, n1: 100, n2: 50, n3: 50, a: 1, b: 1},
    heart: {m: 1, n1: 0.8, n2: 1, n3: -8, a: 1, b: 0.18},
    heptagon: {m: 7, n1: 1000, n2: 400, n3: 400, a: 1, b: 1},
    hexagon: {m: 6, n1: 1000, n2: 400, n3: 400, a: 1, b: 1},
    malteseCross: {m: 8, n1: 0.9, n2: 0.1, n3: 100, a: 1, b: 1},
    pentagon: {m: 5, n1: 1000, n2: 600, n3: 600, a: 1, b: 1},
    rectangle: {m: 4, n1: 100, n2: 100, n3: 100, a: 2, b: 1},
    roundedStar: {m: 5, n1: 2, n2: 7, n3: 7, a: 1, b: 1},
    square: {m: 4, n1: 100, n2: 100, n3: 100, a: 1, b: 1},
    star: {m: 5, n1: 30, n2: 100, n3: 100, a: 1, b: 1},
    triangle: {m: 3, n1: 100, n2: 200, n3: 200, a: 1, b: 1}
  };

  d3.superformulaTypes = d3.keys(_superformulaTypes);
})();

function Text(spec) {
  if(!(this instanceof Geom)){
    return new Text(spec);
  }
  Point.apply(this);
  var attributes = {
    name: "text",
    geom: 'text', 
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    // if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    // }
  }
}
Text.prototype = new Point();

Text.prototype.constructor = Text;

Text.prototype.draw = function (sel, data, i, layerNum) {

  var s     = this.setup(),
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                               this.drawX(), this.drawY());


  var positionX = this.positionPoint(scales.x, s.group),
      positionY = this.positionPoint(scales.y, s.group);

  ggd3.tools.removeElements(sel, layerNum, "geom-text");

  function drawText(text) {
    text
      .attr('class', 'geom g' + layerNum + " geom-text")
      .text(function(d) { return d[s.aes.label]; })
      .attr('x', positionX)
      .attr('y', positionY)
      .style('font-size', s.size)
      .attr('fill-opacity', s.alpha)
      .style('stroke', s.color)
      .style('stroke-width', 1)
      .attr('text-anchor', 'middle')
      .attr('fill', s.fill);
  }

  var tt = ggd3.tooltip()
            .content(this.tooltip())
            .geom(this);

  var text = sel.select('.plot')
                .selectAll('text.geom.g' + layerNum)
                .data(data.data);
  text.transition().call(drawText);
  text.enter().append('text').call(drawText);
  text.exit()
    .transition()
    .style('opacity', 0)
    .remove();
  text.each(function() {
      tt.tooltip(d3.select(this), s);
    });
};

ggd3.geoms.text = Text;

// 
function Vline(spec) {
  if(!(this instanceof Geom)){
    return new Vline(spec);
  }
  Hline.apply(this);
  var attributes = {
    name: "vline",
    direction: "y",
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Vline.prototype = new Hline();

Vline.prototype.constructor = Vline;



ggd3.geoms.vline = Vline;
// this is more than I need, I think.
// All a stat is is a mapping from aesthetics to 
// statistics. So points can map aesthetics to 
// statistics, but usually don't.
// Bars map one of x or y to identity and
// the other to some aggregate, default count.
// Box is like bars, but maps one to the five figure summary
// In this sense, jitter goes here as well. But it probably won't.

function Stat(setting) {
  if(!(this instanceof Stat)){
    return new Stat(setting);
  }
  var attributes = {
    layer: null,
    linearAgg: null,
    x: null,
    y: null,
    fill: null,
    color: null,
    alpha: null,
    size: null,
    shape: null,
    label: null,
    yint: null, 
  }; 
  if(_.isPlainObject(setting)) {
    for(var a in setting){
      if(_.isFunction(setting[a])){
        attributes[a] = setting[a];
      } else {
        attributes[a] = this[setting[a]];
      }
    }
  } else if(_.isString(setting)){
    attributes.linearAgg = setting;
  }
  this.exclude = ["xintercept", "yintercept", "slope",
  // maybe we do want to calculate mins and maxs
    "ymax", "ymin", "xmax", "xmin"
    ];

  this.attributes = attributes;
  var getSet = ["layer", "linearAgg"];
  for(var attr in attributes){
    if(_.contains(getSet, attr)){
      this[attr] = createAccessor(attr);
    }
  }
}
var specialStats = [
  "density",
  "bin",
  "boxplot"
];

Stat.prototype.agg = function(data, aes) {
  var out = [{}];
  _.each(_.keys(aes), function (a) {
    if(!_.contains(this.exclude, a)) {
      if(_.contains(["range", "unique"], this[a]()._name) ){
        var r = this[a]()(_.pluck(_.flatten([data]), aes[a]));
        out = _.map(r, function(d) {
            var o = _.clone(out[0]);
            o[aes[a]] = d;
            return o;
          });
      } else {
        out = _.map(out, function(o) {
          o[aes[a]] = this[a]()(_.pluck(_.flatten([data]), aes[a]));
          return o;
        }, this);
      }
    }
  }, this);
  return out;
};

Stat.prototype.compute = function(data) {
  var aes = this.layer().aes(),
      id = _.any(_.map(_.difference(_.keys(aes), this.exclude), 
            function(k){
              if(!this[k]()){ return null; }
              return this[k]()([]) === "identity";
            }, this));
  if(_.contains(specialStats, this.linearAgg()) ){
    return this["compute_" + this.linearAgg()](data);
  }
  // most situations will need these two
  if(id){
    return data;
  }
  out = _.flatten(this.agg(data, aes));
  return out;
};

function aggSetter(a) {
  return function(f) {
    if(!arguments.length) { return this.attributes[a]; }
    if(_.isString(f)){
      this.attributes[a] = this[f];
    } else if(_.isFunction(f)){
      this.attributes[a] = f;
    } else if(_.isArray(f)){
      // f is dtype
      if(f[0] === "string" || f[1] === "few"){
        // likely just need first
        this.attributes[a] = this.first;
      } else if(f[0] === "number" && f[1] === "many"){
        this.attributes[a] = this.median;
      }
    }
    return this;
  };
}
Stat.prototype.x = aggSetter('x');
Stat.prototype.y = aggSetter('y');
Stat.prototype.ymax = aggSetter('ymax');
Stat.prototype.ymin = aggSetter('ymin');
Stat.prototype.fill = aggSetter('fill');
Stat.prototype.color = aggSetter('color');
Stat.prototype.group = aggSetter('group');
Stat.prototype.alpha = aggSetter('alpha');
Stat.prototype.size = aggSetter('size');
Stat.prototype.size = aggSetter('size');
Stat.prototype.label = function() {
  return function(arr) {
    return arr[0];
  };
};
Stat.prototype.label._name = "label";
Stat.prototype.unique = function(arr) {
  return _.unique(arr);
};  
Stat.prototype.unique._name = "unique";

Stat.prototype.range = function(arr) {
  return d3.extent(arr);
};
Stat.prototype.range._name = "range";

Stat.prototype.median = function(arr) {
  if(arr.length > 100000) { 
    console.warn("Default behavior of returning median overridden " + 
           "because array length > 1,000,000." + 
           " Mean is probably good enough.");
    return d3.mean(arr); 
  }
  return d3.median(arr);
};
Stat.prototype.median._name = "median";
Stat.prototype.count = function(arr) {
  return arr.length;
};
Stat.prototype.count._name = "count";

Stat.prototype.min = function(arr) {
  return d3.min(arr);
};
Stat.prototype.min._name = "min";

Stat.prototype.max = function(arr) {
  return d3.max(arr);
};
Stat.prototype.max._name = "max";

Stat.prototype.mean = function(arr) {
  return d3.mean(arr);
};
Stat.prototype.mean._name = "mean";

Stat.prototype.iqr = function(arr) {
  // arr = _.sortBy(arr);
  return {"75th percentile": d3.quantile(arr, 0.75),
          "50th percentile": d3.quantile(arr, 0.5),
          "25th percentile": d3.quantile(arr, 0.25),
        };
};
Stat.prototype.iqr._name = "iqr";

// don't do anything with character columns
Stat.prototype.first = function(arr) {
  return arr[0];
};
Stat.prototype.first._name = "first";

Stat.prototype.mode = function(arr) {
  return "nuthing yet for mode.";
};
Stat.prototype.mode._name = "mode";

// how to deal with less convential computations?
// ugly hack? Most of this is ugly.
Stat.prototype.identity = function(arr) {
  return "identity";
};
Stat.prototype.identity._name = "identity";

Stat.prototype.density = function(arr) {
  return 'density';
};
Stat.prototype.density._name = "density";

Stat.prototype.boxplot = function(arr) {
  return 'boxplot';
};
Stat.prototype.boxplot._name = "boxplot";

Stat.prototype.bin = function() {
  return 'bin';
};
Stat.prototype.bin._name = "bin";

Stat.prototype.compute_boxplot = function(data) {
  var aes = this.layer().aes(),
      g = this.layer().geom(),
      // come up with better test to 
      // choose which is factor. Number unique, or a 
      // special marker on dtypes
      factor = this.layer().dtypes()[aes.x][1] === "few" ? 'x': 'y',
      number = factor === 'x' ? 'y': 'x',
      arr = _.sortBy(_.pluck(data, aes[number])),
      iqr = this.iqr(arr),
      upper = d3.quantile(arr, g.tail() ? (1 - g.tail()): g.upper()),
      lower = d3.quantile(arr, g.tail() || g.lower()),
      out = _.merge({
        "quantiles": iqr,
        "upper": upper,
        "lower": lower,
      }, this.agg(data, aes)[0]);
      out["n. observations"] = data.length;
      out.data = data.filter(function(d) {
        return ((d[aes[number]] < lower) || 
                (d[aes[number]] > upper));
      });
  return out;
};

Stat.prototype.compute_bin = function(data) {

  var aes = this.layer().aes(),
      g = this.layer().geom(),
      h, n;
  
  if(aes.y && aes.x) {
    // we've been through before and density exists on aes
    h = aes.y === "binHeight" ? 'y': 'x';
  } else {
    h = aes.y ? 'x': 'y';
    aes[h] = "binHeight";
  }
  n = h === "y" ? "x": "y";

  var hist = d3.layout.histogram()
                .bins(g.breaks() || g.bins())
                .frequency(g.frequency())
                .value(function(d) {
                  return d[aes[n]];
                });
  data = hist(data);
  data.map(function(d) {
    if(_.isEmpty(d)) { return d; }
    d[aes[n]] = d.x;
    d.binHeight = d.y;
    // all other aesthetics in histograms will only map to
    // categories, so we don't need to know all about other 
    // variables in the bin.
    for(var a in aes) {
      if(_.contains(['x', 'y'], a)) { continue; }
      d[aes[a]] = d[0][aes[a]];
    }
    return d;
  });
  return data;
};

Stat.prototype.compute_density = function(data) {
  console.log(data.length);
  var out = {},
      start = {},
      end = {},
      aes = this.layer().aes();
  var g, k, r, p;
  if(aes.y && aes.x) {
    // we've been through before and density exists on aes
    d = aes.y === "density" ? 'y': 'x';
  } else {
    d = aes.y ? 'x': 'y';
    aes[d] = "density";
  }
  n = d === "y" ? "x": "y";
  _.map(['color', 'group', "fill"], function(a) {
    if(aes[a]){
      out[aes[a]] = data[0][aes[a]];
      start[aes[a]] = data[0][aes[a]];
      end[aes[a]] = data[0][aes[a]];
    }
  });
  data = _.pluck(data, aes[n]);
  g = this.layer().geom();
  k = g[g.kernel()](g.smooth());
  r = d3.extent(data);
  p = _.range(r[0], r[1], (r[1] - r[0])/g.nPoints());
  kde = g.kde(k, p);
  data = kde(data);
  out = _.map(data, function(d) {
    var o = _.clone(out);
    o[aes[n]] = d[0];
    o.density = d[1];
    return o;
  });
  start.density = 0;
  end.density = 0;
  start[aes[n]] = r[0];
  end[aes[n]] = r[1];
  out.splice(0, 0, start);
  out.push(end);
  return out;
};

ggd3.stats = Stat;
  if(typeof module === "object" && module.exports){
    // package loaded as node module
    this.ggd3 = ggd3;
    module.exports = ggd3;
    // I should probably learn what all this stuff does
    // added the following two lines so this would work in
    // vows
    this._ = require('lodash');
    this.d3 = require('d3');
  } else {
    // file is loaded in browser.
    console.log('loaded in browser')
    this.ggd3 = ggd3;
  }
}();