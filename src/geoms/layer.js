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
  this.attributes = attributes;
  var getSet = ["plot", "position", "aes", "ownData"];
  for(var attr in this.attributes){
    if(!this[attr] && _.contains(getSet, attr) ){
      this[attr] = createAccessor(attr);
    }
  }
}

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

Layer.prototype.data = function(data) {
  if(!arguments.length) { return this.attributes.data; }
  this.attributes.data = data;
  return this;
};

Layer.prototype.draw = function(layerNum) {
  var that = this,
      facet = this.plot().facet(),
      stat = this.stat();
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
      s.call(that.geom().draw(), stat.compute(d), i, layerNum);
    });
  }
  return draw;
};
Layer.prototype.dataList = DataList;

Layer.prototype.nest = Nest;

Layer.prototype.geom = function(geom) {
  if(!arguments.length) { return this.attributes.geom; }
  if(_.isString(geom)){
    geom = new ggd3.geoms[geom]()
                  .layer(this);
    if(_.isNull(this.stat()) ) {
      this.stat(geom.defaultStat());
    }
  } else {
    geom.layer(this);
    if(_.isNull(geom.stat()) && _.isNull(this.stat()) ) {
      this.stat(geom.defaultStat());
    } 
  }
  this.attributes.geom = geom;
  return this;
};

ggd3.layer = Layer;
