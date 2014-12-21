// 
function Smooth(spec) {
  if(!(this instanceof Smooth)){
    return new Smooth(spec);
  }
  Line.apply(this);
  var attributes = {
    name: "smooth",
    stat: "identity",
    position: null,
    method: "lm",
    lineType: 'none',
    sigma: {},
    errorBand: true,
    loessAlpha: 0.5,
    dist: 1.96,
    strokeOpacity: 0.2,
    ribbonAlpha: 0.2,
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Smooth.prototype = new Line();

Smooth.prototype.constructor = Smooth;

Smooth.prototype.loess = function(data, s) {

};

Smooth.prototype.lm = function(data, s) {

  // both should be numbers
  // need to make this work with dates, too.
  data = _.filter(data, function(d) {
    return _.isNumber(d[s.aes.x]) && _.isNumber(d[s.aes.y]);
  });
  var aes = s.aes,
      o1, o2, sigma,
      ts = false,
      prod = d3.mean(_.map(data, function(d) {
        return d[aes.x] * d[aes.y];
      })),
      x2 = d3.mean(_.map(data, function(d) {
        return Math.pow(d[aes.x], 2);
      })),
      xbar = d3.mean(_.pluck(data, aes.x)), 
      ybar = d3.mean(_.pluck(data, aes.y)),
      m = (prod - xbar*ybar) / (x2 - Math.pow(xbar, 2)),
      b = ybar - m*xbar;

  o1 = _.clone(_.min(data, aes.x));
  o2 = _.clone(_.max(data, aes.x));
  o1[aes.y] = b + m * o1[aes.x];
  o2[aes.y] = b + m * o2[aes.x];
  sigma = Math.sqrt(d3.sum(data.map(function(d, i) {

    return Math.pow((d[aes.x]*m + b) - 
                    d[aes.y], 2);
  }))/data.length);
  o1._error_max = this.dist() * sigma;
  o2._error_max = this.dist() * sigma;
  o1._error_min = -this.dist() * sigma;
  o2._error_min = -this.dist() * sigma;
  return [o1, o2];
};

Smooth.prototype.prepareData = function(data, s) {
  data = s.nest.entries(data.data);
  data = ggd3.tools.arrayOfArrays(
          _.map(data, function(d) { 
            return this.recurseNest(d);}, this));
  data = _.filter(data, function(d) {
    return _.isPlainObject(d) || d.length >=2;
  });
  data = _.isArray(data[0]) ? data: [data];
  // sometimes I pass a third argument to prepareData
  // if it's true here, we're getting the data
  // nested to apply error bands. No need to 
  // recalculate lines.
  data = _.map(data, function(d) {
    return this[this.method()](d, s);
  }, this);
  return data;  
};

Smooth.prototype.draw = function(sel, data, i, layerNum) {
  var selector = data.selector;
  data = Line.prototype.draw.call(this, sel, data, i, layerNum);

  if(!this.errorBand()){
    return null;
  }
  var s = this.setup(),
      scales = this.scalesAxes(sel, s, selector, layerNum,
                                this.drawX(), this.drawY()),
      x = scales.x.scale(),
      y = scales.y.scale(),
      y2,
      o2 = function() { return 0; };
      o2.rangeBand = function() { return 0;};
      r = ggd3.geoms.ribbon()
            .color(s.color)
            .data([data]);

  if(this.method() === "loess"){

  } else if(this.method() === "lm"){
    var dist = this.dist() * this.sigma(),
        oldAlpha = this.alpha();
    s.aes.ymin = "_error_min";
    s.aes.ymax = "_error_max";
    s.alpha = d3.functor(this.ribbonAlpha());
    y2 = r.decorateScale('y', s, y, data);
    var areaGen = function(n) {
      return r.generator(s.aes, x, y2, o2, s.group, n);
    };

    r.drawRibbon.call(this.name('smooth-error'), sel, 
                      data, i, layerNum, areaGen, s);
    this.name('smooth')
      .alpha(oldAlpha);

  }

};

ggd3.geoms.smooth = Smooth;

