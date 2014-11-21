function Layer(aes) {
  var attributes = {
    plot:     null,
    data:     null,
    dtypes:   null,
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
  var getSet = ["plot", "position", "ownData", 'dtypes'];
  for(var attr in this.attributes){
    if(!this[attr] && _.contains(getSet, attr) ){
      this[attr] = createAccessor(attr);
    }
  }
}
Layer.prototype.aes = function(aes) {
  if(!arguments.length) { return this.attributes.aes; }
  this.attributes.aes = aes;
  if(this.stat()) {
    this.stat().layer(this);
  }
  if(this.geom()) {
    this.geom().layer(this);
  }
  return this;
};

Layer.prototype.geom = function(geom) {
  if(!arguments.length) { return this.attributes.geom; }
  if(_.isString(geom)){
    geom = new ggd3.geoms[geom]()
                  .layer(this);
    if(!this.stat() ) {
      this.stat(new geom.defaultStat().layer(this));
    }
  } else if(_.isObject(geom)){
    geom.layer(this);
    if(!geom.stat() && !this.stat() ) {
      this.stat(new geom.defaultStat().layer(this));
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
    stat = new ggd3.stats[stat]()
                  .layer(this);
  }
  if(!this.geom()) {
    this.geom(new stat.defaultGeom().layer(this));
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

    var dataList = that.plot().dataList(),
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
      that.geom().draw()(s, d, i, layerNum);
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
  if(aes.fill) {
    nest.key(function(d) { return d[aes.fill]; });
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
