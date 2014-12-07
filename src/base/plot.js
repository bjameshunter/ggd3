// 1. Fix tooltip details with 'identity' and special stats.
// 2. Label facets better and provide option to label with function.
// 3. Better details on boxplot tooltip
// 4. Consider annotation object
// 5. Calculate scale domains at last second. If fixed, as each facet is calculated, keep track of extremes. After last facet, reset all facet scales and draw but do not calculate. Duh. 

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
    facet: ggd3.facet(),
    width: 400,
    height: 400,
    margins: {left:20, right:20, top:20, bottom:20},
    xScale: {single: ggd3.scale()}, 
    yScale: {single: ggd3.scale()},
    xDomain: null,
    yDomain: null,
    colorScale: {single: ggd3.scale()},
    sizeScale: {single: ggd3.scale()},
    fillScale: {single: ggd3.scale()},
    shapeScale: {single: ggd3.scale()},
    alphaScale: {single: ggd3.scale()},
    strokeScale: {single: ggd3.scale()},
    alpha: d3.functor(0.5),
    fill: d3.functor('steelblue'),
    color: d3.functor(null),
    size: d3.functor(3), 
    shape: d3.functor('circle'),
    lineType: d3.functor('1,1'),
    lineWidth: 2,
    xAdjust: false,
    yAdjust: false,
    xGrid: true,
    yGrid: true,
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
  var getSet = ["opts", "theme", 
    "width", "height", "xAdjust", "yAdjust", 
    "xDomain", "yDomain",
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

Plot.prototype.margins = function(margins) {
  if(!arguments.length) { return this.attributes.margins; }
  this.attributes.margins = _.merge(this.attributes.margins, margins);
  return this;
};

Plot.prototype.layers = function(layers) {
  if(!arguments.length) { return this.attributes.layers; }
  var aes;
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
        l.aes(_.merge(_.clone(this.aes()), aes));
      } else if (l instanceof ggd3.geom){
        var g = l;
        l = ggd3.layer()
                .aes(_.clone(this.aes()))
                .data(this.data(), true)
                .geom(g);
      }
      l.plot(this).dtypes(this.dtypes());
      this.attributes.layers.push(l);
    }, this);
  } else if (layers instanceof ggd3.layer) {
    if(!layers.data()) { 
      layers.data(this.data(), true); 
    } else {
      layers.ownData(true);
    }
    aes = layers.aes();
    layers.aes(_.merge(_.clone(this.aes()), aes))
      .dtypes(this.dtypes())
      .plot(this);
    this.attributes.layers.push(layers);
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
  // for right now we are not planning on having more than
  // one layer
  _.each(this.layers(), function(l) {
    l.dtypes(this.dtypes());
    if(!l.ownData()) { l.data(this.data(), true); }
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
  _.each(this.layers(), function(layer) {
    layer.aes(_.merge(_.clone(aes), _.clone(layer.aes()) ));
  });
  this.attributes.aes = _.clone(aes);
  return this;
};

Plot.prototype.setFixedScale = function(a) {
  var scale = this[a + "Scale"]().single;
  var domain;
  if(_.contains(linearScales, scale.scaleType())){
    var max, min;
    _.map(this[a + "Scale"](), function(v, k) {
      var d = v.scale().domain();
      if(_.isUndefined(max)) { max = d[1]; }
      if(_.isUndefined(min)) { min = d[0]; }
      if(max < d[1]) { max = d[1]; }
      if(min > d[0]) { max = d[0]; }
    });
    domain = [min, max];
  } else {
    domain = _.unique(
                  _.flatten(
                    _.map(this[a + "Scales"](), function(v, k){
                      return v.domain();
                    }) ) );
  }
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


Plot.prototype.draw = function(sel) {
  var updateFacet = this.facet().updateFacet();
  
  // draw/update facets
  updateFacet(sel);
  // reset nSVGs after they're drawn.
  this.facet().nSVGs = 0;
  // make single scales
  this.setScale('single', this.aes());
  // get the layer classes that should
  // be present in the plot to remove 
  // layers that no longer exist.
  var classes = _.map(_.range(this.layers().length),
                  function(n) {
                    return "g" + (n);
                  }, this);

  _.each(this.layers(), function(l, layerNum) {
    l.compute(sel, layerNum);
  });
  _.each(this.layers(), function(l, layerNum) {
    l.draw(sel, layerNum);
  });
  sel.selectAll('.geom')
    .filter(function() {
      var cl = d3.select(this).attr('class').split(' ');
      return !_.contains(classes, cl[1]);
    })
    .transition().style('opacity', 0).remove();
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
    this.hgrid.compute(sel, 30);
    this.hgrid.draw(sel, 30);}
  if(this.xGrid()) { 
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