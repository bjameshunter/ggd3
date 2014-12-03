// Base geom from which all geoms inherit
function Geom(aes) {
  if(!(this instanceof Geom)){
    return new Geom(aes);
  }
  var attributes = {
    layer: null,
    stat: null,
    fill: null,
    alpha: null,
    color: null,
    size: null,
    position: null,
    lineWidth: null,
    drawX: true,
    drawY: true,
    style: "", // optional class attributes for css 
    tooltip: null,
  };
  this.attributes = attributes;
}
Geom.prototype.defaultPosition = function() {
  var n = this.name();
  return {
    "point": "identity",
    "text": "identity",
    "bar": "stack",
    "box": "dodge",
    "hline": "identity",
    "vline": "identity",
    "abline": "identity",
    "smooth": "loess", 
    "area" : "identity",
    "error": "identity",
    "density": "kernel",
    "path" : "identity",
    "ribbon" : "identity",
    }[n];
};

Geom.prototype.tooltip = function(tooltip) {
  if(!arguments.length) { return this.attributes.tooltip; }
  var t = ggd3.tooltip();

};

Geom.prototype.setup = function() {
  var s = {
      layer     : this.layer(),
    };
  s.plot      = s.layer.plot();
  s.stat      = s.layer.stat();
  s.nest      = this.nest();
  s.dtypes    = s.layer.dtypes();
  s.position  = s.layer.position();
  s.dim       = s.plot.plotDim();
  s.facet     = s.plot.facet();
  s.aes       = s.layer.aes();
  s.fill      = d3.functor(this.fill() || s.plot.fill());
  s.size      = d3.functor(this.size() || s.plot.size());
  s.alpha     = d3.functor(this.alpha() || s.plot.alpha());
  s.color     = d3.functor(this.color() || s.plot.color());

  s.nest.rollup(function(d) {
    return s.stat.compute(d);
  });

  if(s.aes.fill) {
    s.grouped = true;
    s.group = s.aes.fill;
  } else if(s.aes.color){
    s.grouped = true;
    s.group = aes.color;
  } else if(aes.group){
    s.grouped = true;
    s.group = s.aes.group;
  }
  if(_.contains([s.facet.x(), s.facet.y(), 
                s.aes.x, s.aes.y], 
                s.group)) {
    // uninteresting grouping, get rid of it.
    grouped = false;
    group = null;
    groups = null;
  }

  return s;
};
Geom.prototype.compute = function(data, s) {
  return s.nest.entries(data);
};

Geom.prototype.domain = function(data, a) {
  var layer   = this.layer(),
      plot    = layer.plot(),
      aes     = layer.aes(),
      extent,
      range;

  if(_.contains(linearScales, plot[a + "Scale"]().single.scaleType())) {
    extent  = d3.extent(_.pluck(data, aes[a]));
    range   = extent[1] - extent[0];
  } else {
    var domain = _.sortBy(_.unique(_.pluck(data, aes[a])));
    return domain;
  }
  // done if date
  // and not histogram or density
  if(_.contains(["date", "time"], plot.dtypes()[aes[a]][0]) ){
    return extent;
  }
  // extent both ways
  if(range === 0){
    extent[0] -= 1;
    extent[1] += 1;
  }
  extent[0] -= 0.1 * range;
  extent[1] += 0.1 * range;
  return extent;
};


Geom.prototype.scalesAxes = function(sel, setup, selector, 
                                     layerNum, drawX, drawY){

  var x, y;
    // choosing scales based on facet rule,
  // factor out.
  if(!_.contains(["free", "free_x"], setup.facet.scales()) || 
     _.isUndefined(setup.plot.xScale()[selector])){
    x = setup.plot.xScale().single;
    xfree = false;
  } else {
    x = setup.plot.xScale()[selector];
    xfree = true;
  }
  if(!_.contains(["free", "free_y"], setup.facet.scales()) || 
     _.isUndefined(setup.plot.xScale()[selector])){
    y = setup.plot.yScale().single;
    yfree = false;
  } else {
    y = setup.plot.yScale()[selector];
    yfree = true;
  }

  if(layerNum === 0 && drawX){
    sel.select('.x.axis')
      .attr("transform", "translate(" + x.positionAxis() + ")")
      .transition().call(x.axis);
  }
  if(layerNum === 0 && drawY){
    sel.select('.y.axis')
      .attr("transform", "translate(" + y.positionAxis() + ")")
      .transition().call(y.axis);
  }
  return {
    x: x,
    y: y,
    xfree: xfree,
    yfree: yfree,
  };
};

Geom.prototype.nest = function() {

  // to be performed before calculating layer level geoms or scales
  var aes = this.layer().aes(),
      plot = this.layer().plot(),
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

ggd3.geom = Geom;


Geom.prototype.unNest = unNest;
Geom.prototype.recurseNest = recurseNest;
