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
    this.position(geom.defaultPosition());
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
  for(var a in aes){
    dtype = dtypes[aes[a]];
    if(!stat[a]() && _.contains(measureScales, a)){
    scaleType = plot[a + "Scale"]().single.scaleType();
      if(_.contains(linearScales, scaleType) && 
         _.contains(['x', 'y'], a)){
        stat[a](stat.linearAgg());
      } else {
        stat[a](dtype);
      }
    }
  }
  // if a stat has not been set, it is x or y
  // and should be set to count if geom is not density.
  _.each(['x', 'y'], function(a) {
    if(!stat[a]() && 
       !_.contains(['density', 'bin'], this.geom().stat()) ){
      stat[a](stat.linearAgg());
      aes[a] = "n. observations";
      this.aes(aes);
    }
  }, this);

};
Layer.prototype.data = function(data) {
  if(!arguments.length) { return this.attributes.data; }
  this.attributes.data = data;
  return this;
};

Layer.prototype.draw = function(layerNum) {
  var that = this,
      facet = this.plot().facet(),
      plot = this.plot(),
      aes = this.aes(),
      dtypes = this.dtypes(),
      stat = this.stat(),
      dtype,
      scaleType,
      dlist;
  if(this.ownData()) {
    dlist = this.dataList(this.nest(this.data()));
  } else {
    dlist = plot.dataList(plot.data());
  }
  
  function draw(sel) {
    var divs = [];
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
      if(_.isEmpty(d)) { d = {selector: id, data: []}; }
      if(that.position() === "jitter" && 
         !plot.hasJitter) {
        _.each(d.data, function(r) { r._jitter = _.random(-1,1,1); });        
      }
      that.geom().draw()(s, d, i, layerNum);
    });
  }
  return draw;
};

// same as on plot, for when Layer has it's own data
// accepts output of Nest and returns an array of 
// {selector: [string], data: [array]} objects
Layer.prototype.dataList = DataList;

// same as on plot, for when Layer has it's own data
// Nests according to facets
Layer.prototype.nest = Nest;

Layer.prototype.geomNest = function() {

  // to be performed before calculating layer level geoms or scales
  var aes = this.aes(),
      plot = this.plot(),
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


ggd3.layer = Layer;
