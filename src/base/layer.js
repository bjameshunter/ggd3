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
    if(!this[attr] && contains(getSet, attr) ){
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
  this.attributes.aes = merge(this.attributes.aes, aes);
  this.updateGeom();
  return this;
};

Layer.prototype.geom = function(geom) {
  if(!arguments.length) { return this.attributes.geom; }
  if(typeof geom === 'string'){
    geom = ggd3.geoms[geom]();
  }
  geom.layer(this);
  this.attributes.geom = geom;
  if(this.stat() === null){
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
      scaleType, dtype, diff;

  diff = Object.keys(aes).filter(function(d) {
    return !contains(stat.exclude, d);
  });
  diff.forEach(function(a) {
    dtype = dtypes[aes[a]];
    if(!stat[a]() && contains(measureScales, a)){
      scaleType = plot[a + "Scale"]().single.type();
      if(contains(linearScales, scaleType) && 
         contains(['x', 'y'], a)){
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
  ['x', 'y'].forEach(function(a) {
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
    data = ggd3.tools.clean(data, this);
    this.attributes.dtypes = merge(this.attributes.dtypes, data.dtypes);
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
  // reset geom's data array if geom wasn't given it's own data;
  if(!this.geom().ownData()){
    this.geom().data([]);
  }
  sel.selectAll('.plot-div')
    .each(function(d) {
      divs.push(d3.select(this).attr('id'));
    });
  divs.forEach(function(id, i){
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
        for(var j = 0; j < d.data.length; j++){
          d.data[j]._jitter = Math.random() * (Math.random()<0.5 ? -1:1);
        }
      }
      d = plot.setDomain(d, this);
    }
    if(d === undefined || Object.keys(d).length === 0) { 
      d = {selector: id, data: []}; 
    }
    if(!this.geom().ownData()){
      this.geom().data().push(d);
    }
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
  divs.forEach(function(id, i){
    // cycle through all divs, drawing data if it exists.
    var selection = sel.select("#" + id),
        data;
    if(!this.geom().ownData()){
        data = this.geom().data().filter(function(d) {
          return d.selector === id;
        })[0];
    } else {
      data = this.geom().data();
    }
    if(layerNum !== undefined){
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
