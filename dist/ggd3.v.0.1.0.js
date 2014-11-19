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
function Clean(data, obj) {
  // coerce each records data to reasonable
  // type and get domains for all scales in aes.
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
function DataList() {
  // needs to work for plots and layers.
  // I think this should be cheap enought to not 
  // worry about executing a few times per draw.

  // it's a layer and has it's own data
  var layer = (this instanceof ggd3.layer),
      facet = layer ? this.plot().facet(): this.facet(),
      x = facet.x(),
      y = facet.y(),
      by = facet.by(),
      selector;
  if((x && !y) || (y && !x)){
    selector = x ? x + "-": y + "-";
    return _.map(this.data(), function(d) {
      return {selector: rep(selector + d.key),
        data: d.values};
    });

  } else if(x && y) {
    // loop through both levels
    data = [];
    _.each(this.data(), function(l1) {
      var selectX = x + "-" + l1.key;
      _.each(l1.values, function(l2) {
        var s = rep(y + "-" + l2.key + "_" + selectX);
        data.push({selector:s, data: l2.values});
      });
    });
    return data;
  } else if(x && y && by){
    // nothing yet
  }
  if(!x && !y){
    console.log("neither x nor y");
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
ggd3.tools.removeElements = function(sel, layerNum, element) {
  var remove = sel.select('.plot')
                    .selectAll('.geom.g' + layerNum)
                    .filter(function() {
                      return d3.select(this)[0][0].nodeName !== element;
                    });
  remove.transition().duration(1000)
    .style('opacity', 0)
    .remove();
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

function unNest (data) {
  // recurse and flatten nested dataset
  // this means no dataset can have a 'values' column
  if(_.isNull(data)){ return data; }
  var branch = _.all(_.map(data, function(d){
    return d.hasOwnProperty('values');
  }));
  if(branch === false) { 
    return data; 
  }
  var vals = _.flatten(
              _.map(data, function(d) { return d.values; })
             );
  return ggd3.tools.unNest(vals);
}

ggd3.tools.unNest = unNest;

// accepts single nested object
function RecurseNest(data) {
  if(!data.values) { return data; }
  return _.map(data.values, 
               function(d) {
                return recurseNest(d);
              });
}
ggd3.tools.recurseNest = RecurseNest;
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
    titleProps: [0.15, 0.15],
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
      plot = this.plot(),
      dim = plot.plotDim(),
      x = selection.data()[0],
      addHeight = (rowNum === 0 || this.type() === "wrap") ? dim.y*that.titleProps()[1]:0,
      addWidth = colNum === 0 ? dim.x*that.titleProps()[0]:0,
      width = plot.width() + addWidth,
      height = plot.height() + addHeight,
      svg = selection
              .attr('id', function(d) {
                return that.id(d, rowNum);
               })
              .selectAll('svg.svg-wrap')
              .data([0]);

  svg
    .attr('width', width)
    .attr('height', height)
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
    .attr('width', width)
    .attr('height', height)
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
// or scales are free
Facet.prototype.calculateMargins = function(plot) {

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
  var margins = this.plot().margins(),
      dim = this.plot().plotDim(),
      that = this,
      gridClassX = (this.type()==="grid" && rowNum!==0) ? " grid": "",
      gridClassY = (this.type()==="grid" && colNum!==(ncols-1)) ? " grid": "";

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
          .attr({'fill': 'black',
              'opacity': 1,
              'x': addWidth * 0.8,
              'y': dim.y/2,
              "text-anchor": 'middle',
              "transform": "rotate(-90 " + 
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
  var attributes = {
    plot:     null,
    data:     null,
    geom:     null,
    stat:     null, // identity, sum, mean, percentile, etc.
    position: null, // jitter, dodge, stack, etc.
    aes:      null,
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
  var getSet = ["plot", "position", "aes", "ownData"];
  for(var attr in this.attributes){
    if(!this[attr] && _.contains(getSet, attr) ){
      this[attr] = createAccessor(attr);
    }
  }
}

Layer.prototype.geom = function(geom) {
  if(!arguments.length) { return this.attributes.geom; }
  if(_.isString(geom)){
    geom = new ggd3.geoms[geom]()
                  .layer(this);
    if(!this.stat() ) {
      this.stat(new geom.defaultStat());
    }
  } else {
    geom.layer(this);
    if(!geom.stat() && !this.stat() ) {
      this.stat(new geom.defaultStat());
    } 
  }
  this.attributes.geom = geom;
  return this;
};

Layer.prototype.stat = function(stat) {
  if(!arguments.length) { return this.attributes.stat; }
  this.attributes.stat = stat;
  // usually, default stat is accepted from geom
  // but you can choose a stat and get a default geom
  if(_.isString(stat)){
    stat = new ggd3.stats[stat]();
  }
  if(!this.geom()) {
    this.geom(new stat.defaultGeom());
  }
  this.attributes.stat = stat;
  return this;
};

Layer.prototype.data = function(data) {
  if(!arguments.length) { return this.attributes.data; }
  this.attributes.data = data;
  return this;
};

Layer.prototype.draw = function(layerNum) {
  var that = this,
      facet = this.plot().facet(),
      stat = this.stat()
                .aes(this.aes());
  // 
  function draw(sel) {

    var dataList = that.ownData() ? that.dataList():that.plot().dataList(),
        divs = [];
    sel.selectAll('.plot-div')
      .each(function(d) {
        divs.push(d3.select(this).attr('id'));
      });
    _.each(divs, function(id, i){
      // cycle through all divs, drawing data if it exists.
      var s = sel.select("#" + id),
          d = dataList.filter(function(d) {
            return d.selector === id;
          })[0];
          if(_.isEmpty(d)) { d = {selector: id, data: []}; }
      s.call(that.geom().draw(), d, i, layerNum);
    });
  }
  return draw;
};
Layer.prototype.dataList = DataList;

Layer.prototype.nest = Nest;

Layer.prototype.geomNest = function() {
  // to be performed before calculating layer level geoms or scales
  var aes = this.aes(),
      plot = this.plot(),
      nest = d3.nest();
  if(aes.group) {
    nest.key(function(d) { return d[aes.group]; });
  }
  if(plot.xScale().single.scaleType() === "ordinal" && 
     plot.yScale().single.scaleType() === "ordinal"){
    throw "both x and y scales can't be ordinal for geom bar.";
  }
  _.map(['x', 'y'], function(a) {
    if(plot[a + "Scale"]().single.scaleType() === "ordinal"){
      nest.key(function(d) { return d[aes[a]]; });
    }
  });
  return nest;
};


ggd3.layer = Layer;

// aes is an object literal with 
// x, y, yintercept, xintercept, shape, size, 
// color, etc.
function Plot(aes) {
  var attributes = {
    data: null,
    layers: [],
    facet: null,
    xScale: {single: new ggd3.scale()}, 
    yScale: {single: new ggd3.scale()},
    colorScale: {single: new ggd3.scale()},
    sizeScale: {single: new ggd3.scale()},
    fillScale: {single: new ggd3.scale()},
    shapeScale: {single: new ggd3.scale()},
    alphaScale: {single: new ggd3.scale()},
    strokeScale: {single: new ggd3.scale()},
    opts: {},
    theme: "ggd3",
    margins: {left:20, right:20, top:20, bottom:20},
    width: 400,
    height: 400,
    aes: null,
    legends: null, // strings corresponding to scales
    // that need legends or legend objects
    xAdjust: false,
    yAdjust: false,
    dtypes: {},
    alpha: 0.5,
    alphaRange: [0.1, 1],
    size: 30,
    sizeRange: [10, 100],
    fill: 'lightsteelblue',
    fillRange: ["blue", "red"],
    color: 'none', // default stroke for geoms
    colorRange: ["white", "black"],
    shape: 'circle',
    shapeRange: d3.superformulaTypes,
  };
  // aesthetics I might like to support:
// ["alpha", "angle", "color", "fill", "group", "height", "label", "linetype", "lower", "order", "radius", "shape", "size", "slope", "width", "x", "xmax", "xmin", "xintercept", "y", "ymax", "ymin", "yintercept"] 
  this.attributes = attributes;
  // if the data method has been handed a new dataset, 
  // newData will be true, after the plot is drawn the
  // first time, newData is set to false
  this.newData = true;
  // when cycling through data, need to know if 
  // data are nested or not.
  this.nested = false;
  // explicitly declare which attributes get a basic
  // getter/setter
  var getSet = ["opts", "theme", "margins", 
    "width", "height", "xAdjust", "yAdjust", 
    "color", 'colorRange', 'size', 'sizeRange',
    'fill', 'fillRange',
    "alpha", "alphaRange"];

  for(var attr in attributes){
    if((!this[attr] && 
       _.contains(getSet, attr))){
      this[attr] = createAccessor(attr);
    }
  }
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

Plot.prototype.xScale = scaleConfig('x');

Plot.prototype.yScale = scaleConfig('y');

Plot.prototype.colorScale = scaleConfig('color');

Plot.prototype.sizeScale = scaleConfig('size');

Plot.prototype.shapeScale = scaleConfig('shape');

Plot.prototype.fillScale = scaleConfig('fill');

Plot.prototype.alphaScale = scaleConfig('alpha');

Plot.prototype.layers = function(layers) {
  if(!arguments.length) { return this.attributes.layers; }
  if(_.isArray(layers)) {
    // allow reseting of layers by passing empty array
    if(layers.length === 0){
      this.attributes = layers;
      return this;
    }
    var layer;
    _.each(layers, function(l) {
      if(_.isString(l)){
        // passed string to get geom with default settings
        layer = new ggd3.layer()
                      .aes(this.aes())
                      .data(this.data())
                      .plot(this)
                      .geom(l);

        this.attributes.layers.push(layer);
      } else if ( l instanceof ggd3.layer ){
        // user specified layer
        if(!l.data()) { 
          l.data(this.data()); 
        } else {
          l.ownData(true);
        }
        if(!l.aes()) { l.aes(this.aes()); }
        l.plot(this);
        this.attributes.layers.push(l);
      }
    }, this);
  } else if (layers instanceof ggd3.layer) {
    if(!layers.data()) { 
      layers.data(this.data()); 
    } else {
      layers.ownData(true);
    }
    if(!layers.aes()) { layers.aes(this.aes()); }
    this.attributes.layers.push(layers.plot(this));
  }
  return this;
};

Plot.prototype.dtypes = function(dtypes) {
  if(!arguments.length) { return this.attributes.dtypes; }
  this.attributes.dtypes = _.merge(this.attributes.dtypes, dtypes);
  return this;
};

Plot.prototype.data = function(data) {
  if(!arguments.length) { return this.attributes.data; }
  // clean data according to data types
  // and set top level ranges of scales.
  // dataset is passed through once here.
  // if passing 'dtypes', must be done before
  if(!this.nested){
    data = ggd3.tools.clean(data, this);
    // after data is declared, nest it according to facets.
    this.attributes.data = this.nest(data.data);
    this.dtypes(data.dtypes);
    this.nested = true;
    this.newData = false;
  } else {
    this.attributes.data = data;
  }

  _.each(this.layers(), function(layer){
    if(_.isNull(layer.data()) ){
      layer.data(this.data());
    }
  }, this);
  return this;
};


Plot.prototype.facet = function(spec) {
  // everytime a facet is passed
  // data nesting must be done again
  if(!arguments.length) { return this.attributes.facet; }
  var data;
  if(spec instanceof ggd3.facet){
    this.attributes.facet = spec.plot(this);
  } else {
    this.attributes.facet = new ggd3.facet(spec)
                                    .plot(this);
  }
  data = ggd3.tools.unNest(this.data());
  this.nested = false;
  this.data(data);
  return this;
};

Plot.prototype.aes = function(aes) {
  if(!arguments.length) { return this.attributes.aes; }
  _.each(this.layers(), function(l) {
    if(_.isNull(l.aes())){
      l.aes(aes);
    }
  }, this);
  this.attributes.aes = aes;
  return this;
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

Plot.prototype.draw = function() {
  var that = this;
  // get basic info about scales/aes;
  this.setScales();
  
  // set fixed/free domains
  this.setDomains();
  function draw(sel) {
    sel.call(that.facet().updateFacet());

    // get the number of geom classes that should
    // be present in the plot
    var classes = _.map(_.range(that.layers().length),
                    function(n) {
                      return "g" + (n);
                    });

    _.each(that.layers(), function(l, i) {
      sel.call(l.draw(i));
      sel.selectAll('.geom')
        .filter(function() {
          var cl = d3.select(this).node().classList;
          return !_.contains(classes, cl[1]);

        })
        .transition().style('opacity', 0).remove();
    });

  }
  return draw;
};

Plot.prototype.nest = Nest;
// returns array of faceted objects {selector: s, data: data} 
Plot.prototype.dataList = DataList;

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

  // allow setting of orient, position, scaleType, 
  // scale and axis settings, etc.
  var attributes = {
    aesthetic: null,
    domain: null,
    range: null,
    position: null, // left right top bottom none
    orient: null, // left right top bottom
    plot: null,
    scaleType: null, // linear, log, ordinal, time, category, 
    // maybe radial, etc.
    scale: null,
    opts: {},
  };
  // store passed object
  this.attributes = attributes;
  var getSet = ["aesthetic", "plot", "orient", "position", "opts"];
  for(var attr in this.attributes){
    if(!this[attr] && _.contains(getSet, attr) ){
      this[attr] = createAccessor(attr);
    }
  }
  this._userOpts = {};
  if(!_.isUndefined(opts)){
    // opts may be updated by later functions
    // _userOpts stays fixed on initiation.
    this.opts(opts);
    this._userOpts = opts;
    this.scaleType(opts.type ? opts.type:null);
  }

}
Scale.prototype.scaleType = function(scaleType) {
  if(!arguments.length) { return this.attributes.scaleType; }
  var that = this;
  this.attributes.scaleType = scaleType;
  switch(scaleType) {
    case 'linear':
      that.attributes.scale = d3.scale.linear();
      break;
    case 'log':
      that.attributes.scale = d3.scale.log();
      break;
    case 'ordinal':
      that.attributes.scale = d3.scale.ordinal();
      break;
    case 'time':
      that.attributes.scale = d3.time.scale();
      break;
    case 'date':
      that.attributes.scale = d3.time.scale();
      break;
    case "category10":
      that.attributes.scale = d3.scale.category10();
      break;
    case "category20":
      that.attributes.scale = d3.scale.category20();
      break;
    case "category20b":
      that.attributes.scale = d3.scale.category20b();
      break;
    case "category20c":
      that.attributes.scale = d3.scale.category20c();
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

Scale.prototype.range = function(range) {
  if(!arguments.length) { return this.attributes.range; }
  if(this.scaleType() === "ordinal"){
    this.attributes.scale.rangeRoundBands(range);
  } else {
    this.attributes.scale.range(range);
  }
  this.attributes.range = range;
  return this;
};

Scale.prototype.domain = function(domain) {
  if(!arguments.length) { return this.attributes.domain; }
  this.attributes.domain = domain;
  this.attributes.scale.domain(domain);

  return this;
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
var aesMap = {
        x: 'xScale',
        y: 'yScale',
        color: 'colorScale',
        size: 'sizeScale',
        fill: 'fillScale',
        shape: 'shapeScale',
        alpha: 'alphaScale',
      },
    measureScales = ['x', 'y', 'color','size', 'fill' ,'alpha'],
    linearScales = ['log', 'linear', 'time', 'date'],
    globalScales = ['shape', 'fill', 'color', 'size', 'alpha'];

function SetScales() {
  // do nothing if the object doesn't have aes, data and facet
  // if any of them get reset, the scales must be reset
  if(!this.data() || !this.aes() || !this.facet() ||
     _.isEmpty(this.layers()) ){
    return false;
  }
  // obj is a layer or main plot
  var aes = this.aes(),
      that = this,
      facet = this.facet(),
      data = this.dataList(),
      dtype,
      settings,
      // gather user defined settings in opts object
      opts = _.mapValues(aesMap, function(v, k) {
        // there is a scale "single" that holds the 
        // user defined opts and the fixed scale domain
        return that[v]().single._userOpts;
      });

  function makeScale(d, i, a) {
    if(_.contains(measureScales, a)){
      // user is not specifying a scale.
      if(!(that[aesMap[a]]() instanceof ggd3.scale)){
        // get plot level options set for scale.
        // if a dtype is not found, it's because it's x or y and 
        // has not been declared. It will be some numerical aggregation.
        dtype = that.dtypes()[aes[a]] || ['number', 'many'];
        settings = _.merge(ggd3.tools.defaultScaleSettings(dtype, a),
                           opts[a]);
        var scale = new ggd3.scale(settings)
                            .plot(that)
                            .aesthetic(a);
        if(_.contains(['x', 'y'], a)){
          if(a === "x"){
            scale.range([0, that.plotDim().x]);
          }
          if(a === "y") {
            scale.range([that.plotDim().y, 0]);
          }
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
        that[aesMap[a]]()[d.selector] = scale;
        if(i === 0) {
          that[aesMap[a]]().single = scale;
        }
      } else {
        // copy scale settings, merge with default info that wasn't
        // declared and create for each facet if needed.
      } 
    }
  }
  _.each(_.union(['x', 'y'], _.keys(aes)), function(a) {
    return _.map(data, function(d,i) {return makeScale(d, i, a);});
  });
  for(var a in aes) {
    if(_.contains(measureScales, a)){
    // give user-specified scale settings to single facet
      that[aesMap[a]]().single._userOpts = _.cloneDeep(opts[a]);
    }
  }

}

ggd3.tools.defaultScaleSettings = function(dtype, aesthetic) {
  function xyScale() {
    if(dtype[0] === "number") {
      if(dtype[1] === "many"){
        return {type: 'linear',
                  axis: {tickFormat: d3.format(",.2f")},
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
ggd3.tools.domain = function(data, rule, zero,
                             variable) {
  var extent, range;
  if(_.isUndefined(variable)){
    extent = d3.extent(data);
  } else {
    extent = d3.extent(_.pluck(data, variable));
  }
  if(!_.isUndefined(rule) && !_.isDate(extent[0]) ){
    range = Math.abs(extent[1] - extent[0]);
    if(rule === "left" || rule === "both"){
      extent[0] -=  0.1 * range;
    }
    if(rule === "right" || rule === "both"){
      extent[1] += 0.1 * range;
    }
  }
  return extent;
};

Plot.prototype.setDomains = function() {
  // when setting domain, this function must
  // consider the stat calculated on the data
  // nested, or not.
  // Perhaps here, calculate the fixed scale
  // domains, then within layer/geom
  // adjust it to the free scale if necessary.
  // I guess initial layer should have all relevant scale info
  var aes = this.aes(),
      that = this,
      facet = this.facet(),
      layer = this.layers()[0], 
      stat = layer.stat().aes(layer.aes()),
      domain,
      data;
  _.each(_.union(['x', 'y'], _.keys(aes)), function(a) {

    if(_.contains(measureScales, a)) {
      var scales = that[aesMap[a]](),
          scale,
          nest = layer.geomNest();
      if(facet.scales() !== "free_" + a &&
         facet.scales() !== "free" || (_.contains(globalScales, a)) ){
        // fixed calcs
        data = ggd3.tools.unNest(that.data());
        if(_.contains(linearScales, scales.single.opts().type)){
          data = _.map(nest.entries(data), stat.compute, stat);
          if(a !== "alpha"){
              domain = ggd3.tools.domain(data, 'both', false, aes[a] || "count");
          } else {
            domain = ggd3.tools.domain(data, undefined, false, aes[a] || "count");
          }
        } else {
          // nest according ordinal axes, group, and color
          // include warning about large numbers of colors for
          // color scales.
          domain = _.unique(_.pluck(data, aes[a]));
        }
        for(scale in scales) {
          if(scales[scale].scaleType() === "log" && domain[0] <= 0){
            domain[0] = 1;
          }
          scales[scale].domain(domain);
        }
        if(_.contains(globalScales, a)) {
          that[a](that[aesMap[a]]().single.scale());
          if(_.contains(linearScales, that[aesMap[a]]().single.scaleType()) ){
            that[a]().range(that[a + "Range"]());
          }
        }
      } else {
        // free calcs
        data = that.dataList();
        for(var d in data) {
          nested = _.flatten(_.map(nest.entries(data[d].data), stat.compute, stat));
          domain = ggd3.tools.domain(nested, undefined, false, aes[a] || "count");
          scale = scales[data[d].selector];
          if(_.contains(linearScales, scales.single.opts().type)){
            scale.domain(domain);
          } else {
            scale.domain(_.unique(_.pluck(data[d].data, aes[a])));
          }
        }
      }
    }
  });
};
Plot.prototype.setScales = SetScales;


// 
function Bar(spec) {
  var attributes = {
    name: "bar",
  };

  this.attributes = _.merge(attributes, this.attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
}

Bar.prototype = new Geom();

Bar.prototype.draw = function() {
  // bar takes an array of data, 
  // nests by a required ordinal axis, optional color and group
  // variables then calculates the stat and draws
  // horizontal or vertical bars.
  // stacked, grouped, expanded or not.
  // scales first need to be calculated according to output
  // of the stat. 
  var layer     = this.layer(),
      position  = layer.position(),
      plot      = layer.plot(),
      stat      = layer.stat(),
      facet     = plot.facet(),
      margins   = plot.margins(),
      aes       = layer.aes(),
      fill      = d3.functor(this.fill() || plot.fill()),
      size      = d3.functor(this.size() || plot.size()),
      alpha     = d3.functor(this.alpha() || plot.alpha()),
      color     = d3.functor(this.color() || plot.color()),
      that      = this,
      nest      = layer.geomNest(),
      geom      = d3.superformula()
               .segments(20)
               .type(function(d) { return shape(d[aes.shape]); })
               .size(function(d) { return size(d[aes.size]); });
  function draw(sel, data, i, layerNum) {
    // geom bar allows only one scale out of group, fill, and color.
    // that is, one can be an ordinal scale, but the others must be
    // constants

    var id = (facet.type() === "grid" || 
              facet.scales()==="fixed") ? "single":sel.attr('id'),
        x = plot.xScale()[id],
        y = plot.yScale()[id];


    // drawing axes goes here because they may be dependent on facet id
    if(layerNum === 0){
      sel.select('.x.axis')
        .attr("transform", "translate(" + x.positionAxis() + ")")
        .transition().call(x.axis);
      sel.select('.y.axis')
        .attr("transform", "translate(" + y.positionAxis() + ")")
        .transition().call(y.axis);
    }

    ggd3.tools.removeElements(sel, layerNum, "rect");
    data.data = _.flatten(_.map(nest.entries(data.data), function(d) {
      return stat.compute(d);
    }));
    console.log(data);

    var bars = sel.select('.plot')
                  .selectAll('.geom-' + layerNum)
                  .data(data.data);
    // add canvas and svg functions.
    // update
    bars
      .attr('class', 'geom g' + layerNum + ' geom-bar');
    
    // enter
    bars.enter().append('rect')
        .attr('class', 'geom g' + layerNum + ' geom-bar');
    // sel is svg, data is array of objects
    // exit
    bars.exit()
      .transition()
      .style('opacity', 0)
      .remove();


  }
  return draw;
};

Bar.prototype.defaultStat = function() {
  return new ggd3.stats.count();
};

ggd3.geoms.bar = Bar;

// Base geom from which all geoms inherit
function Geom(aes) {
  var attributes = {
    layer: null,
    stat: null,
    fill: null,
    alpha: null,
    color: null,
    size: null,
  };
  this.attributes = attributes;
  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}
Geom.prototype.defaultStat = function() {
  return null;
};

ggd3.geom = Geom;


// allow layer level specifying of size, fill,
// color, alpha and shape variables/scales
// but inherit from layer/plot if 
function Point(spec) {
  var attributes = {
    name: "point",
    shape: "circle",
  };

  this.attributes = _.merge(attributes, this.attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
}
Point.prototype = new Geom();

Point.prototype.draw = function() {

  var layer     = this.layer(),
      position  = layer.position(),
      plot      = layer.plot(),
      stat      = layer.stat(),
      facet     = plot.facet(),
      margins   = plot.margins(),
      aes       = layer.aes(),
      fill      = d3.functor(this.fill() || plot.fill()),
      size      = d3.functor(this.size() || plot.size()),
      shape     = d3.functor(this.shape() || plot.shape()),
      alpha     = d3.functor(this.alpha() || plot.alpha()),
      color     = d3.functor(this.color() || plot.color()),
      that      = this,
      geom      = d3.superformula()
               .segments(20)
               .type(function(d) { return shape(d[aes.shape]); })
               .size(function(d) { return size(d[aes.size]); });
  function draw(sel, data, i, layerNum) {
    var id = (facet.type() === "grid") ? "single":sel.attr('id'),
        x = plot.xScale()[id],
        y = plot.yScale()[id];
    // drawing and positioning axes probably shouldn't be on
    // the geom
    // but here, we're drawing
    // here set scales according to fixed/free/grid
    if(layerNum === 0 && x && y){
      sel.select('.x.axis')
        .attr("transform", "translate(" + x.positionAxis() + ")")
        .transition().call(x.axis);
      sel.select('.y.axis')
        .attr("transform", "translate(" + y.positionAxis() + ")")
        .transition().call(y.axis);
    }
    // get rid of wrong elements if they exist.
    ggd3.tools.removeElements(sel, layerNum, "path");
    var points = sel.select('.plot')
                  .selectAll('path.geom.g' + layerNum)
                  .data(stat.compute(data.data));
    // add canvas and svg functions.

    points.transition()
        .attr('class', 'geom g' + layerNum + " geom-point")
        .attr('d', geom)
        .attr('transform', function(d) {
          return "translate(" + x.scale()(d[aes.x])+ 
                  "," + y.scale()(d[aes.y]) + ")";
        })
        .attr('fill', function(d) { return fill(d[aes.fill]); })
        .style('stroke', function(d) { return color(d[aes.color]); })
        .style('stroke-width', 1)
        .attr('fill-opacity', function(d) { return alpha(d[aes.alpha]); });
    points.enter().append('path')
        .attr('class', 'geom g' + layerNum + " geom-point")
        .attr('d', geom)
        .attr('transform', function(d) {
          return "translate(" + x.scale()(d[aes.x])+ 
                  "," + y.scale()(d[aes.y]) + ")";
        })
        .attr('fill', function(d) { return fill(d[aes.fill]); })
        .style('stroke', function(d) { return color(d[aes.color]); })
        .style('stroke-width', 1)
        .attr('fill-opacity', function(d) { return alpha(d[aes.alpha]); });
    // sel is svg, data is array of objects
    points.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }
  return draw;
};

Point.prototype.defaultStat = function() {
  return new ggd3.stats.identity();
};

ggd3.geoms.point = Point;


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
  var attributes = {
    name: "text",
    fill: null,
    color: null,
    alpha: null,
  };

  this.attributes = _.merge(attributes, this.attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
}
Text.prototype = new Geom();

Text.prototype.draw = function() {

  var layer = this.layer(),
      plot = layer.plot(),
      stat = layer.stat(),
      facet = plot.facet(),
      aes = layer.aes(),
      fill = d3.functor(this.fill() || plot.fill()),
      size = d3.functor(this.size() || plot.size()),
      alpha = d3.functor(this.alpha() || plot.alpha()),
      color = d3.functor(this.color() || plot.color()),
      that = this;
  function draw(sel, data, i, layerNum) {
    var id = (facet.type() === "grid") ? "single":sel.attr('id'),
        x = plot.xScale()[id],
        y = plot.yScale()[id];
    // this is probably done at the layer level
    if(layerNum === 0){
      sel.select('.x.axis')
        .attr("transform", "translate(" + x.positionAxis() + ")")
        .transition().call(x.axis);
      sel.select('.y.axis')
        .attr("transform", "translate(" + y.positionAxis() + ")")
        .transition().call(y.axis);
    }
    ggd3.tools.removeElements(sel, layerNum, "text");
    var text = sel.select('.plot')
                  .selectAll('text.geom.g' + layerNum)
                  .data(stat.compute(data.data));
    text.transition()
        .attr('class', 'geom g' + layerNum + " geom-text")
        .text(function(d) { return d[aes.label];})
        .attr('transform', function(d) {
          return "translate(" + x.scale()(d[aes.x])+ 
                  "," + y.scale()(d[aes.y]) + ")";
        })  
        .style('font-size', function(d) { return size(d[aes.size]);})
        .style('opacity', function(d) { return alpha(d[aes.alpha]); })
        .style('stroke', function(d) { return color(d[aes.color]); })
        .style('stroke-width', 1)
        .attr('text-anchor', 'middle')
        .attr('y', function(d) { return size(d[aes.size])/2; })
        .attr('fill', function(d) { return fill(d[aes.fill]); });
    text.enter().append('text')
        .attr('class', 'geom g' + layerNum + " geom-text")
        .text(function(d) { return d[aes.label]; })
        .attr('transform', function(d) {
          return "translate(" + x.scale()(d[aes.x])+ 
                  "," + y.scale()(d[aes.y]) + ")";
        })
        .style('font-size', function(d) { return size(d[aes.size]);})
        .style('opacity', function(d) { return alpha(d[aes.alpha]); })
        .style('stroke', function(d) { return color(d[aes.color]); })
        .style('stroke-width', 1)
        .attr('y', function(d) { return size(d[aes.size])/2; })
        .attr('text-anchor', 'middle')
        .attr('fill', function(d) { return fill(d[aes.fill]); });
    text.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }
  return draw;
};

Text.prototype.defaultStat = function() {
  return new ggd3.stats.identity();
};

ggd3.geoms.text = Text;


function Stat() {
  var attributes = {
    aes: null,
    dtypes: null,
    functions: {
      x: function(d, v) { return _.unique(_.pluck(d, v))[0]; },
      y: function(d, v) { return _.unique(_.pluck(d, v))[0]; },
      // write default aesthetic functions to handle 
      // number and character data to be included in tooltip
      // and to be used to 
    }, // object storing column names and agg functions
    // to be optionally used on tooltips.
  };
  this.attributes = attributes;
  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

// bin
function Bin() {

}

Bin.prototype = new Stat();
Bin.prototype.compute = function(data, nbins) {

};
Bin.prototype.name = function() {
  return "bin";
};
ggd3.stats.bin = Bin;


// count
function Count() {
  var attributes = {
  };

  this.attributes = _.merge(attributes, this.attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
}
Count.prototype = new Stat();
Count.prototype.compute = function(data) {
  var out = {"count": data.values.length},
      aes = this.aes();
  for(var a in aes){
    out[aes[a]] = this.functions()[a] ? this.functions()[a](data.values, this.aes()[a]):undefined;
  }
  return out;
};
Count.prototype.name = function() {
  return "count";
};
Count.prototype.defaultGeom = function() {
  return new ggd3.geoms.bar();
};
ggd3.stats.count = Count;

// sum

// mean

// median

// max

// min 

// identity
function Identity() {

}
Identity.prototype = new Stat();
Identity.prototype.compute = function(data) {
  return data || [];
};
Identity.prototype.name = function() {
  return "identity";
};
Identity.prototype.defaultGeom = function() {
  return new ggd3.geoms.point();
};
ggd3.stats.identity = Identity;


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
