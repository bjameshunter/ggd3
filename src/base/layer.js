function Layer(aes) {
  if(!(this instanceof Layer)){
    return new Layer(aes);
  }
  var attributes = {
    plot:     null,
    data:     null,
    dtypes:   {},
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
    // geoms have a default position
    this.position(geom.position());
  }
  return this;
};

Layer.prototype.stat = function(obj) {
  if(!arguments.length) { return this.attributes.stat; }
  var stat;
  // the "stats" object concept is falling pretty flat.
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

  _.each(_.difference(_.keys(aes), stat.exclude), 
    function(a) {
      dtype = dtypes[aes[a]];
      if(!stat[a]() && _.contains(measureScales, a)){
      scaleType = plot[a + "Scale"]().single.type();
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
    if(this.geom().name() === 'area'){
    }
    data = ggd3.tools.clean(data, this);
    if(this.geom().name() === 'area'){
    }
    this.attributes.dtypes = _.merge(this.attributes.dtypes, data.dtypes);
    this.attributes.data = data.data;
  }
  return this;
};

Layer.prototype.compute = function(sel) {
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
// the only thing update doesn't do is removeElements.
Layer.prototype.draw = function(sel, layerNum) {
  var divs = [],
      g;
  sel.selectAll('.plot-div')
    .each(function(d) {
      divs.push(d3.select(this).attr('id'));
    });
  _.each(divs, function(id, i){
    // cycle through all divs, drawing data if it exists.
    var selection = sel.select("#" + id),
        data = this.geom().data().filter(function(d) {
          return d.selector === id;
        })[0];
    if(!_.isUndefined(layerNum)){
      if(selection.select('.plot g.g' + layerNum).empty()) {

        g = selection.select('.plot')[this.geom().gPlacement()]('g', 'g')
              .attr('class', 'g g' + layerNum);
      } else {
        g = selection.select('g.g.g' + layerNum);
      }
    } else {
      // if it's a grid, just pass first g to it
      // the geom will get the proper vgrid or hgrid selection
      g = selection.select('g');
    }
    this.geom().removeElements(g, layerNum, "geom-" + 
                               this.geom().name());
    this.geom().draw(g, data, i, layerNum);
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
