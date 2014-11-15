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
        if(i % 1000 ===0) { console.log(d[k]);}
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
  console.log(data);
  return {data: data, dtypes: dtypes};
}

ggd3.tools.clean = Clean;
function DataList() {
  // needs to work for plots and layers.
  // I think this should be cheap enought to not 
  // worry about executing a few times per draw.
  // it's a layer and doesn't have it's own data
  if((this instanceof ggd3.layer) && !this.ownData()) {
    this.data(this.plot().data());
  }
  // it's a layer and has it's own data
  if((this instanceof ggd3.layer) && this.ownData()){
    this.attributes.data = this.plot().nest(this.data());
  }
  var facet = (this instanceof ggd3.layer) ? this.plot().facet(): this.facet(),
      x = facet.x(),
      y = facet.y(),
      by = facet.by(),
      selector;
  if((x && !y) || (y && !x)){
    console.log('x xor y');
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
      data = this.plot().data(),
      nrows, ncols;
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
  row = selection.selectAll('div')
           .data(_.range((this.nFacets - this.nSVGs) > remainder ? 
                 ncols: remainder));
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
      plot = this.plot(),
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
    .attr('width', plot.width())
    .attr('height', plot.height())
    .each(function(d) {
      that.makeCell(d3.select(this));
      that.makeClip(d3.select(this), x, rowNum);
    });
  svg.enter().append('svg')
    .attr('class', 'plot-svg')
    .attr('width', plot.width())
    .attr('height', plot.height())
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
Facet.prototype.makeCell = function(selection) {
  var margins = this.plot().margins(),
      plotDim = this.plot().plotDim();

  var plot = selection.selectAll('g.plot')
                .data([0]);
  plot.enter().append('g')
    .attr('class', 'plot')
    .attr('transform', "translate(" + margins.left + 
            "," + margins.top + ")")
    .append('rect')
    .attr('class', 'background')
    .attr({x: 0, y:0, width: plotDim.x, height:plotDim.y});
  plot.exit().remove();

  var xaxis = selection.selectAll('g.x.axis')
                .data([0]);
  xaxis.enter().append('g')
    .attr('class', 'x axis');
  xaxis.exit().remove();
  var yaxis = selection.selectAll('g.y.axis')
                .data([0]);
  yaxis.enter().append('g')
    .attr('class', 'y axis');
  yaxis.exit().remove();


};
ggd3.facet = Facet;

// aes is an object literal with 
// x, y, yintercept, xintercept, shape, size, 
// color, etc.
function Plot(aes) {
  var attributes = {
    data: null,
    layers: [],
    facet: new ggd3.facet(),
    xScale: {}, 
    yScale: {},
    colorScale: {},
    sizeScale: {},
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
  };
  // aesthetics I might like to support:
// ["alpha", "angle", "color", "fill", "group", "height", "label", "linetype", "lower", "order", "radius", "shape", "size", "slope", "width", "x", "xmax", "xmin", "xintercept", "y", "ymax", "ymin", "yintercept"] 
  this.attributes = attributes;
  // if the data method has been handed a new dataset, 
  // dataNew will be true, after the plot is drawn the
  // first time, dataNew is set to false
  this.dataNew = true;
  // when cycling through data, need to know if 
  // data are nested or not.
  this.nested = false;
  // explicitly declare which attributes get a basic
  // getter/setter
  var getSet = ["opts", "theme", "margins", 
    "width", "height", "xAdjust", "yAdjust"];

  for(var attr in attributes){
    if((!this[attr] && 
       _.contains(getSet, attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

function scaleConfig(type) {
  var scale;
  switch(type){
    case "x":
      scale = 'xScale';
      break;
    case "y":
      scale = 'yScale';
      break;
    case "color":
      scale = 'colorScale';
      break;
    case "size":
      scale = 'sizeScale';
      break;
  }
  function scaleGetter(obj){
    if(!arguments.length) {
      return this.attributes[scale];
    }
    if(obj instanceof ggd3.scale){
      this.attributes[scale] = obj;
      return this;
    }
    // reset scale to empty object or pass settings
    if(!_.isUndefined(obj)) {
      this.attributes[scale] = obj;
      return this;
    }
  }
  return scaleGetter;
}

Plot.prototype.xScale = scaleConfig('x');

Plot.prototype.yScale = scaleConfig('y');

Plot.prototype.colorScale = scaleConfig('color');

Plot.prototype.sizeScale = scaleConfig('size');

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
                      .plot(this)
                      .geom(l);

        this.attributes.layers.push(layer);
      } else if ( l instanceof ggd3.layer ){
        // user specified layer
        this.attributes.push(l.ownData(true).plot(this));
      }
    }, this);
  }
  return this;
};

Plot.prototype.dtypes = function(dtypes) {
  if(!arguments.length) { return this.attributes.dtypes; }
  this.attributes.dtypes = _.merge(this.attributes.dtypes, dtypes);
  return this;
};

// custom data getter setter to pass data to layer if null
Plot.prototype.data = function(data) {
  if(!arguments.length) { return this.attributes.data; }
  // clean data according to data types
  // and set top level ranges of scales.
  // dataset is passed through once here.
  // must have passed a datatypes object in before.
  data = ggd3.tools.clean(data, this);
  // after data is declared, nest it according to facets.
  this.attributes.data = this.nest(data.data);
  this.dtypes(data.dtypes);
  this.setScales();
  this.nested = true;
  this.dataNew = true;
  return this;
};


Plot.prototype.facet = function(spec) {
  if(!arguments.length) { return this.attributes.facet; }
  var data;
  if(spec instanceof ggd3.facet){
    this.attributes.facet = spec.plot(this);
    if(this.nested){
      // unnest from old facets
      console.log('nested');
      data = ggd3.tools.unNest(this.data());
      // nest according to new facets
      this.attributes.data = this.nest(data);
      this.setScales();
    } else {
      console.log('not nested');
      this.attributes.data = this.nest(this.data());
      this.setScales();
    }
  } else {
    this.attributes.facet = new ggd3.facet(spec)
                                    .plot(this);
    if(this.nested){
      data = ggd3.tools.unNest(this.data());
      this.attributes.data = this.nest(data);
      this.setScales();
    } else {
      this.attributes.data = this.nest(this.data());
      this.setScales();
    }
  }
  this.nested = true;
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
  this.setScales();
  return this;
};

Plot.prototype.plotDim = function() {
  var margins = this.margins();
  return {x: this.width() - margins.left - margins.right,
   y: this.height() - margins.top - margins.bottom};
};

Plot.prototype.draw = function() {
  var that = this;
  function draw(sel) {
    sel.call(that.facet().updateFacet());
    // kinda labored way to get rid of unnecessary facets
    var divs = [],
        facets = _.pluck(that.dataList(), "selector");
    sel.selectAll('.plot-div')
      .each(function(d) {
        divs.push(d3.select(this).attr('id'));
      });
    divs = divs.filter(function(d) { return !_.contains(facets, d);});
    divs.forEach(function(d) {
      sel.select("#" + d).select('svg').selectAll('*').remove();
    });

    // drawing layers
    _.each(that.layers(), function(l, i) {
      sel.call(l.draw(), i);
    });
  }
  this.dataNew = false;
  return draw;
};


Plot.prototype.nest = function(data) {
  if(_.isNull(data)) { return data; }
  var nest = d3.nest(),
      that = this,
      facet = this.facet();
  if(!_.isNull(facet.x())){
    nest.key(function(d) { return d[facet.x()]; });
  }
  if(!_.isNull(facet.y())){
    nest.key(function(d) { return d[facet.y()]; });
  }
  if(!_.isNull(facet.by())){
    nest.key(function(d) { return d[facet.by()]; });
  }
  data = nest.entries(data);
  return data; 
};

// returns array of faceted objects {selector: s, data: data} 
Plot.prototype.dataList = DataList;

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
  };
  this.opts = opts;
  this.attributes = attributes;
  this.scaleType(opts.type ? opts.type:null);
  var getSet = ["aesthetic", "plot", "orient", "position"];
  for(var attr in this.attributes){
    if(!this[attr] && _.contains(getSet, attr) ){
      this[attr] = createAccessor(attr);
    }
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
    this.attributes.scale.rangeRoundBands(range, 0);
  } else {
    this.attributes.scale.range(range);
  }
  return this;
};

Scale.prototype.domain = function(domain) {
  if(!arguments.length) { return this.attributes.domain; }
  this.attributes.scale.domain(domain);

  return this;
};
Scale.prototype.positionAxis = function() {
  var margins = this.plot().margins(),
      dim = this.plot().plotDim(),
      aes = this.aesthetic(),
      opts = this.opts.axis;
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
function SetScales() {

  // do nothing if the object doesn't have aes, data and facet
  // if any of them get reset, the scales must be reset
  if(!this.data() || !this.aes() || !this.facet()){
    console.log('not setting scales');
    return false;
  }
  // obj is a layer or main plot
  console.log('setting scales');
  var aes = this.aes(),
      that = this,
      facet = this.facet(),
      scales = ['x', 'y', 'color', 'size'],
      aesMap = {
        x: 'xScale',
        y: 'yScale',
        color: 'colorScale',
        size: 'sizeScale',
      },
      data = this.dataList(),
      dtype,
      settings,
      // gather user defined settings in opts object
      opts = _.mapValues(aesMap, function(v, k) {
        return that[v]();
      });
  console.log(opts);

  function makeScale(d, aesthetic) {
    // rescale all aesthetics
    // need to allow the scale settings from plot object to 
    // take precedence over this, if scale config is 
    // passed to xScale, yScale, colorScale or sizeScale
    for(var a in aes){
      if(_.contains(scales, a)){
        // user is not specifying a scale.
        if(!(that[aesMap[a]]() instanceof ggd3.scale)){
          // get plot level options set for scale.

          dtype = that.dtypes()[aes[a]];
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
          }
          for(var ax in settings.axis){
            if(scale.axis.hasOwnProperty(ax)){
              scale.axis[ax](settings.axis[ax]);
            }
          }
          for(var sc in settings.scale){
            if(scale.scale.hasOwnProperty(sc)){
              scale.scale()[ax](settings.scale[sc]);
            }
          }
          if(_.contains(['linear', 'log', 'time'], settings.type)){
            if(facet.scales() === "free" || 
               facet.scales() === "free_" + a) {
              scale.domain(d3.extent(_.pluck(d.data, aes[a])));
            } else {
              scale.domain(d3.extent(
                              _.pluck(
                                ggd3.tools.unNest(that.data()), aes[a])));     
            }
          } else {
            // scale is ordinal
            if(facet.scales() === "free" || 
               facet.scales() === "free_" + a) {
              scale.domain(_.unique(_.pluck(d.data, aes[a])));
            } else {
              scale.domain(_.unique(
                              _.pluck(
                                ggd3.tools.unNest(that.data()), aes[a])));              
            }
          }
          that[aesMap[a]]()[d.selector] = scale;
        } else {
          // copy scale settings, merge with default info that wasn't
          // declared and create for each facet if needed.
        } 
      }
    }
  }
  // for(var a in aes) {
  //   // reset all scales to empty object
  //   that[aesMap[a]]({});
  // }
  _.map(data, function(d,i) {return makeScale(d);});
}

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
                  scale: {rangeRoundBands: ""}};
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
  var s;
  switch(aesthetic) {
    case "x":
      s = xyScale(dtype);
      s.axis.position = "bottom";
      s.axis.orient = "bottom";
      return s;
    case "y":
      s = xyScale(dtype);
      s.axis.position = "left";
      s.axis.orient = "left";
      return s;
    case "color":
      return {type:"category10", 
            axis: {position:'none'},
            scale: {}};
    case "size":
      return {type: 'linear', 
             axis: {position:'none'},
             scale: {}};
  }
};
ggd3.tools.domain = function(data) {
  return d3.extent(data);
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
  var layer = this.layer(),
      plot = layer.plot(),
      margins = plot.margins(),
      aes = layer.aes(),
      that = this;
  function draw(sel, data) {
    var id = sel.attr('id'),
        x = plot.xScale()[id],
        y = plot.yScale()[id];
    // drawing and positioning axes probably shouldn't be on
    // the geom
    sel.select('.x.axis')
      .attr("transform", "translate(" + x.positionAxis() + ")")
      .call(x.axis);
    sel.select('.y.axis')
      .attr("transform", "translate(" + y.positionAxis() + ")")
      .call(y.axis);
    
    // sel is svg, data is array of objects


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
    layer:     null,
  };
  this.attributes = attributes;
  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}
ggd3.geom = Geom;


function Layer(aes) {
  var attributes = {
    plot:     null,
    data:     null,
    geom:     null,
    stat:     null, // identity, sum, mean, percentile, etc.
    position: null, // jitter, dodge, stack, etc.
    aes:      null,
    ownData: false,
  };
  this.attributes = attributes;
  var getSet = ["plot", "data", "position", "aes"];
  for(var attr in this.attributes){
    if(!this[attr] && _.contains(getSet, attr) ){
      this[attr] = createAccessor(attr);
    }
  }
}

Layer.prototype.ownData = function(tf) {
  if(!arguments.length) { return this.attributes.ownData; }
  // eventually, when called, this may
  // nest the data appropriately
  // ie.
  // this.attributes.data = this.plot().nest(this.data());
  this.attributes.ownData = tf;
  return tf;
};

Layer.prototype.stat = function(stat) {
  if(!arguments.length) { return this.attributes.stat; }
  this.attributes.stat = stat;
  // usually, default stat is accepted from geom
  // but you can choose a stat and get a default geom
  if(_.isNull(this.attributes.geom)) {
    this.attributes.geom = stat.defaultGeom();
  }
  return this;
};

Layer.prototype.draw = function() {
  var that = this,
      facet = this.plot().facet();
  function draw(sel) {

    var dataList = that.ownData() ? that.dataList():that.plot().dataList();
    _.each(dataList, function(data){
      var s = sel.select("#" + data.selector);
      s.call(that.geom().draw(), data.data);
    });
  }
  return draw;
};
Layer.prototype.dataList = DataList;

Layer.prototype.geom = function(geom) {
  if(!arguments.length) { return this.attributes.geom; }
  geom = new ggd3.geoms[geom]()
                .layer(this);
  this.attributes.geom = geom;
  return this;
};

ggd3.layer = Layer;





function Stat() {
  var attributes = {
  };
  this.attributes = attributes;
  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
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

}
Count.prototype = new Stat();
Count.prototype.compute = function(data) {
  return data.length;
};
Count.prototype.name = function() {
  return "count";
};
Count.prototype.defaultGeom = function() {
  return new ggd3.geom.bar();
};
ggd3.stats.count = Count;

// sum

// mean

// median

// max

// min 

// identity
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
