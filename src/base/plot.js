// 1. jittering points on ordinal axes.
// 2. figure out how to make aggregated values on barcharts
// work with stacking. 
// 3. Build in expand to stack bar. 
// 4. Maybe start thinking about tooltip.

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
    facet: null,
    width: 400,
    height: 400,
    margins: {left:20, right:20, top:20, bottom:20},
    xScale: {single: ggd3.scale()}, 
    yScale: {single: ggd3.scale()},
    colorScale: {single: ggd3.scale()},
    sizeScale: {single: ggd3.scale()},
    fillScale: {single: ggd3.scale()},
    shapeScale: {single: ggd3.scale()},
    alphaScale: {single: ggd3.scale()},
    strokeScale: {single: ggd3.scale()},
    alpha: d3.functor(0.5),
    fill: d3.functor('steelblue'),
    color: d3.functor('steelblue'),
    size: d3.functor(30), 
    shape: d3.functor('circle'),
    lineType: d3.functor('1,1'),
    lineWidth: 2,
    xAdjust: false,
    yAdjust: false,
    xGrid: true,
    yGrid: true,
    alphaRange: [0.1, 1],
    sizeRange: [20, 200],
    fillRange: ["blue", "red"],
    colorRange: ["white", "black"],
    shapeRange: d3.superformulaTypes,
    opts: {},
    theme: "ggd3",
  };
  // aesthetics I might like to support:
// ["alpha", "angle", "color", "fill", "group", "height", "label", "linetype", "lower", "order", "radius", "shape", "size", "slope", "width", "x", "xmax", "xmin", "xintercept", "y", "ymax", "ymin", "yintercept"] 
  this.attributes = attributes;
  // doing more cleaning than necessary, counting it.
  this.timesCleaned = 0;
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
  this.nested = false;
  this.hgrid = ggd3.layer()
                .geom(ggd3.geoms.hline().grid(true)
                      .lineType("2,2"))
                .plot(this);
  this.vgrid = ggd3.layer()
                .geom(ggd3.geoms.vline().grid(true)
                      .lineType("2,2"))
                .plot(this); 
  // explicitly declare which attributes get a basic
  // getter/setter
  var getSet = ["opts", "theme", "margins", 
    "width", "height", "xAdjust", "yAdjust", 
    'colorRange', 'sizeRange',
    'fillRange', "lineType",
    "alphaRange", "lineWidth",
    "xGrid", "yGrid"];

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

Plot.prototype.shapeScale = scaleConfig('shape');

Plot.prototype.fillScale = scaleConfig('fill');

Plot.prototype.alphaScale = scaleConfig('alpha');

Plot.prototype.layers = function(layers) {
  if(!arguments.length) { return this.attributes.layers; }
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
              .aes(_.clone(this.aes()))
              .data(this.data())
              .geom(l);
      } else if ( l instanceof ggd3.layer ){
        // user specified layer
        if(!l.data()) { 
          l.data(this.data()); 
        } else {
          console.log('instance of ggd3.layer');
          console.log(l.data());
          l.ownData(true);
        }
        if(!l.aes()) { l.aes(_.clone(this.aes())); }
      } else if (l instanceof ggd3.geom){
        var g = l;
        l = ggd3.layer()
                .aes(_.clone(this.aes()))
                .data(this.data())
                .geom(g);
      }
      l.plot(this).dtypes(this.dtypes());
      this.attributes.layers.push(l);
    }, this);
  } else if (layers instanceof ggd3.layer) {
    if(!layers.data()) { 
      layers.data(this.data()).dtypes(this.dtypes()); 
    } else {
      layers.ownData(true);
    }
    if(!layers.aes()) { layers.aes(_.clone(this.aes())); }
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
  if(!arguments.length || _.isNull(data)) { return this.attributes.data; }
  // clean data according to data types
  // and set top level ranges of scales.
  // dataset is passed through once here.
  // if passing 'dtypes', must be done before
  // let's just always nest and unNest
  this.hasJitter = false;
  data = ggd3.tools.unNest(data);
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
  // for right now we are not planning on having more than
  // one layer
  _.each(this.layers(), function(l) {
    l.dtypes(this.dtypes());
    if(!l.ownData()) { l.data(this.data())
                        .aes(_.clone(this.aes())); }
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
  aes = _.merge(this.attributes.aes, aes);
  _.each(this.layers(), function(layer) {
    layer.aes(_.clone(aes));
  });
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
  var that = this,
      updateFacet = that.facet().updateFacet();
  
  // get basic info about scales/aes;
  this.setScales();

  // set stats on layers
  _.each(that.layers(), function(layer) {
    layer.setStat();
  });
  // set fixed/free domains
  this.setDomains();
  function draw(sel) {
    updateFacet(sel);
    // reset nSVGs after they're drawn.
    that.facet().nSVGs = 0;

    if(!that._gridsAdded) {
      if(that.yGrid()) { that.hgrid.draw(1)(sel);}
      if(that.xGrid()) { that.vgrid.draw(1)(sel);}
    }

    // get the number of geom classes that should
    // be present in the plot
    var classes = _.map(_.range(that.layers().length),
                    function(n) {
                      return "g" + (n);
                    });

    _.each(that.layers(), function(l, i) {
      l.draw(i)(sel);
      sel.selectAll('.geom')
        .filter(function() {
          var cl = d3.select(this).node().classList;
          return !_.contains(classes, cl[1]);
        })
        .transition().style('opacity', 0).remove();
    });
    // if any of the layers had a jitter, it has
    // been added to each facet's dataset
    if(_.any(chart.layers(), function(l) {
      return l.position() === "jitter";
    })){ that.hasJitter = true; }
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