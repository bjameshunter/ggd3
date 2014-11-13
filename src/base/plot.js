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
    // reset scale to empty object
    if(_.isEmpty(obj) && !_.isUndefined(obj)) {
      this.attributes[scale] = obj;
      return this;
    }
    if(!arguments.length) {
      return this.attributes[scale];
    }
    if(obj instanceof ggd3.scale){
      this.attributesp[scale] = obj;
      return this;
    }
    // this isn't used yet, but will allow passing 
    // an object of 
    var s = new ggd3.scale().type(type).plot(this);
    for(var setting in obj) {
      s[setting](obj[setting]);
    }
    this.attributes[scale] = s;
    return this;
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

// custom data getter setter to pass data to layer if null
Plot.prototype.data = function(data) {
  if(!arguments.length) { return this.attributes.data; }
  // clean data according to data types
  // and set top level ranges of scales.
  // dataset is passed through once here.
  data = ggd3.tools.clean(data, this);
  this.setScales();
  // after data is declared, nest it according to facets.
  this.attributes.data = this.nest(data.data);
  this.dtypes = data.dtypes;
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
      data = ggd3.tools.unNest(this.data());
      // nest according to new facets
      this.attributes.data = this.nest(data);
      this.setScales();
    } else {
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
  this.setScales();
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
  return {x: this.width() - margins.left - margins.right,
   y: this.height() - margins.top - margins.bottom};
};

Plot.prototype.draw = function() {
  var that = this;
  function draw(sel) {
    sel.call(that.facet().updateFacet());
    _.each(that.layers(), function(l) {
      sel.call(l.draw());
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