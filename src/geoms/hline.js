
function Hline(spec) {
  if(!(this instanceof Geom)){
    return new Hline(spec);
  }
  Line.apply(this);
  var attributes = {
    name: "hline",
    direction: "x",
    highlightZero: true,
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

Hline.prototype.generator = function(aes, x, y, sub, group) {
  // get list of intercepts and translate them
  // in the data to the actual coordinates
  var s = this.setup();
  if(this.grid()){
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
  } else {
    return Line.prototype.generator.call(this, aes, x, y, sub, group);
  }
};

Hline.prototype.prepareData = function(data, s, scales) {
  // hline and vline accept two forms of data
  // an array of intercepts to be drawn on every facet
  // or an array of objects.
  // objects will be nested according to the grouping 
  // variables and a summary function will be 
  // executed
  var direction = this.direction(),
      other = direction === "x" ? 'y': 'x',
      scale = scales[direction],
      otherScale = scales[other],
      range = scale.domain(),
      p;
  if(this.grid()) {
    if(!_.contains(linearScales, scale.type())){
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
    // disregard data grab intercepts from axis and
    // create new dataset.
    var close_to_zero = function(val) {
      return Math.abs(val) < 1e-6 ? true: false;
    };
    data = [];
    _.each(p, function(intercept) {
      var o1 = {}, o2 = {};
      o1[direction] = intercept;
      o2[direction] = intercept;
      o1[other] = 0;
      o2[other] = s.dim[other];
      if(_.contains(linearScales, scale.type()) && this.highlightZero()){
        o1.zero = close_to_zero(scale.scale().invert(intercept));
        o2.zero = close_to_zero(scale.scale().invert(intercept));
      }
      data.push([o1, o2]);
    }, this);
    return data;
  }
  if(_.isUndefined(s.aes[other + "intercept"])){
    // data must be array of objects with required aesthetics.
    data = Line.prototype.prepareData.call(this, data, s);
    // data are nested
    if(_.contains(linearScales, scale.type())) {
      data = _.map(data, function(d) {
        return _.map(d, function(r) {
          return _.map(range, function(e){
            var o = _.clone(r);
            o[s.aes[direction]] = e;
            return o;
          });
        });
      });
      data = _.flatten(data, true);
    } else {
      data = _.map(_.flatten(data), function(d) {
        return [d, d];
      });
    }
  } else {
    // there should be an array of intercepts on 
    // s.aes.yintercept or s.aes.xintercept
    data = _.map(s.aes[other + "intercept"], function(i) {
      var o1 = {},
          o2 = {};
      o1[s.aes[other]] = i;
      o1[s.aes[direction]] = range[0];
      o2[s.aes[other]] = i;
      o2[s.aes[direction]] = range[1];
      return [o1, o2];
    });
  }
  return data;

};



ggd3.geoms.hline = Hline;