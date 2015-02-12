// 
function Box(spec) {
  if(!(this instanceof Geom)){
    return new Box(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "box",
    stat: "box",
  };

  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Box.prototype = new Geom();

Box.prototype.constructor = Box;

Box.prototype.determineOrdinal = function(s) {
  // this is dumb, this logic needs to happen when scales are created;
  if(s.plot.xScale().single.type() === "ordinal"){
    return 'x';
  } else {
    return 'y';
  }
};

Box.prototype.domain = function(data, a) {

  var s = this.setup(),
      factor = this.determineOrdinal(s),
      number = factor === 'x' ? 'y': 'x',
      domain,
      extent;
  if(a === factor) {
    domain = data.map(function(d) {
      return unique(pluck(d.data, s.aes[a]));
    });
    domain.sort();
  } else {
    domain = d3.extent(flatten(data.map(function(d) {
      return pluck(d.data, s.aes[a]);
    })));
    extent = domain[1] - domain[0];
    domain[0] -= extent*0.1;
    domain[1] += extent*0.1;
  }
  return domain;
};
// box takes an array of numbers and draws a box around the 
// two extremes and lines at the inner points.
Box.prototype.drawGeom = function(box, x, y, w, h, s, layerNum) {
  console.log(s);
  box.attr({
    x: x,
    y: y,
    width: w,
    height: h,
    fill: s.fill,
    "fill-opacity": s.alpha,
    stroke: s.color,
    "stroke-opacity": s.alpha
  });

};

Box.prototype.draw = function(sel, data, i, layerNum) {
  // not really necessary, but can look a lot like point and text.
  // might be the same. 
};

ggd3.geoms.box = Box;