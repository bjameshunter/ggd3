// 2. Label facets better and provide option to label with function.
// 3. Better details on boxplot tooltip
// 4. Make annotation object
// 5. Delete relevant scale when aes changes so they'll be recreated.
// 6. Sorting method for ordinal domains -- currently works manually
      // could be better
// 7. Add 5 number option to boxplot
// 8. update numeric scale domains, they get bigger but not smaller.
      // - resetting a scale with null also works
// 11. figure out scale label offsets and foreign object height
// 12. Allow top x-axis labeling/annotation.
// 13. Function placing tooltip wrt border of plot
// 14. Function to position tooltip that does not follow mouse.
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
    lineWidth: d3.functor(2),
    xAdjust: false,
    yAdjust: false,
    xGrid: true,
    yGrid: true,
    highlightXZero: true,
    highlightYZero: true,
    gridLineType: "1,1",
    alphaRange: [0.1, 1],
    sizeRange: [3, 20],
    fillRange: ["blue", "red"],
    colorRange: ["white", "black"],
    shapeRange: d3.superformulaTypes,
    opts: {},
    transition: true,
    theme: "ggd3",
    // currently just used to ensure clip-paths are unique
    // on pages with more than one single faceted plot.
    id: parseInt(_.random(0, 1, true)*10000)
  };

  this.attributes = attributes;
  this.gridsAdded = false;
  this.timesCleaned = 0;
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
  var getSet = ["opts", "theme", "id",
    "width", "height", "xAdjust", "yAdjust", 
    "xDomain", "yDomain", 
    'colorRange', 'sizeRange',
    'fillRange', "lineType", "subScale",
    'rangeBand', 'rangePadding', 
    'subRangeBand', 'subRangePadding', 'subDomain',
    "alphaRange", "lineWidth",
    "xGrid", "yGrid", "gridLineType",
    "highlightXZero", "highlightYZero",
    'transition'];

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
        // scale must have type to be initiated.
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
      this.aes(_.merge(_.clone(l.aes()), _.clone(origAes)));
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
  this.data(this.data());
  this.updateLayers();
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
  if(_.contains(linearScales, scale.type())){
    domain[0] = _.min(this[a + "Scale"](), function(v, k) {
                  if(k === "single") { return undefined; }
                  return v.domain()[0];
                }).domain()[0];
    domain[1] = _.max(this[a + "Scale"](), function(v, k) {
                  if(k === "single") { return undefined; }
                  return v.domain()[1];
                }).domain()[1];
  } else {
    if(!_.isUndefined(scale._userOpts.scale) &&
       !_.isUndefined(scale._userOpts.scale.domain)){
      domain = scale._userOpts.scale.domain;
      return scale.domain(domain);
    }
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
  return {x: this.width(),
   y: this.height()};
};

// subScale holds default settings, but
// geoms just copy those settings and make an 
// entirely new scale.
Plot.prototype.setSubScale = function(order) {
  // do nuthin if no ordinal
  var xord = this.xScale().single.type(),
      ord,
      direction, 
      domain;
  // histogram needs subscales, too.
  if(xord === "ordinal"){
    ord = this.xScale().single.scale();
    direction = 'x';
  } else if(this.yScale().single.type() === "ordinal"){
    ord = this.yScale().single.scale();
    direction = 'y';
  } else {
    return false;
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
  // draw/update facets
  this.facet().updateFacet(sel);
  
  // reset nSVGs after they're drawn.
  this.facet().nSVGs = 0;

  // get the layer classes that should
  // be present in the plot to remove 
  // layers that no longer exist.
  var classes = _.map(_.range(this.layers().length),
                  function(n) {
                    return "g" + (n);
                  }, this);

  
  // if(!this.aes().x || !this.aes().y){
  //   var missing = this.aes().x ? 'y':'x';
  //   var k = ['bar', 'histogram', 'density'];
  // // if either histogram, density or bar - count are used
  // // we need to set that variable in dtypes as ['number', 'many']
  //   _.each(this.layers(), function(l) {

  //   });
    
  // }
  this.setScale('single', this.aes());

  _.each(this.layers(), function(l) {
    l.compute(sel);
  }, this);

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
  sel.selectAll('g.geom')
    .filter(function() {
      var cl = d3.select(this).attr('class').split(' ');
      return !_.contains(classes, cl[1]);
    })
    .transition() // add custom remove function here.
    .style('opacity', 0)
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
        .lineType(this.gridLineType())
        .highlightZero(this.highlightYZero()));
    this.hgrid.compute(sel);
    this.hgrid.draw(sel);}
  if(this.xGrid()) { 
    this.vgrid
      .geom(ggd3.geoms.vline().grid(true)
        .lineType(this.gridLineType())
        .highlightZero(this.highlightXZero()));
    this.vgrid.compute(sel);
    this.vgrid.draw(sel);}
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