
function Hline(spec) {
  if(!(this instanceof Geom)){
    return new Hline(spec);
  }
  Line.apply(this);
  var attributes = {
    name: "hline",
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Hline.prototype = new Line();

Hline.prototype.constructor = Hline;

Hline.prototype.generator = function(aes, x, y) {
  // get list of intercepts and translate them
  // in the data to the actual coordinates
  var s = this.setup();
  x = d3.scale.linear()
        .range([0, s.dim.x])
        .domain([0, s.dim.x]);
  y = d3.scale.linear()
          .range([0, s.dim.y])
          .domain([0, s.dim.y]);
  return d3.svg.line()
          .x(function(d) { return x(d.x); })
          .y(function(d) { return y(d.y); })
          .interpolate(this.interpolate());
};

Hline.prototype.prepareData = function(data, s, scales) {
  var direction = this.name() === "hline" ? "y":"x",
      other = direction === "x" ? 'y': 'x',
      scale = scales[direction],
      p;
  if(!_.contains(linearScales, scale.scaleType())){
    p =  _.map(scale.scale().domain(),
              function(i) {
                return scale.scale()(i) + scale.scale().rangeBand()/2;
              });
  } else {
    p = _.map(scales[direction].scale().ticks(4),
              function(i) {
                return scale.scale()(i);
              });
  } 
  if(this.grid()) {
    // disregard data grab intercepts from axis and
    // create new dataset.
    data = [];
    _.each(p, function(intercept) {
      var o1 = {}, o2 = {};
      o1[direction] = intercept;
      o2[direction] = intercept;
      o1[other] = 0;
      o2[other] = s.dim[other];
      data.push([o1, o2]);
    });
  } else {
    // do something else with the data
    // data = 
  }
  return data;
};



ggd3.geoms.hline = Hline;