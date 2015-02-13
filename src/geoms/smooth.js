// 
// find better way to give up if no line is to be drawn

function Smooth(spec) {
  if(!(this instanceof Smooth)){
    return new Smooth(spec);
  }
  Line.apply(this);
  var attributes = {
    name: "smooth",
    stat: "identity",
    position: 'insert',
    method: "loess",
    lineType: 'none',
    sigma: {},
    errorBand: true,
    loessParams: {alpha: 1, lambda: 1, m: null},
    dist: 1,
    interpolate: 'basis',
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

Smooth.prototype.validate = function(data, s){
  data = _.filter(data, function(d) {
    var xvalid = _.isNumber(d[s.aes.x]) || _.isDate(d[s.aes.x]);
    var yvalid = _.isNumber(d[s.aes.y]);
    return xvalid && yvalid;
  });
  return data;
};

Smooth.prototype.loess = function(data, s) {

  var params = _.clone(this.loessParams()),
      aes = s.aes,
      vs = [],
      size = Math.floor(params.alpha * data.length),
      bandWidth = Math.floor(data.length/params.m),
      points = [];
  data = _.sortBy(this.validate(data, s), function(d) {
            return d[aes.x];
          });
  if(_.isNull(params.m)){ 
    vs = data; 
  } else {
    // get equally spaced points
    vs = _.map(_.range(params.m), function(d) {
          return data[bandWidth*d];
        });
    vs.push(data[data.length-1]);
  }
  _.each(vs, function(d, i) {
    var vindow,
        pos = bandWidth * i,
        mid = Math.floor(size / 2),
        max, min;
    if(params.alpha === 1) {
      vindow = data;
    } else if ((data.length - pos) < mid) {
      vindow = data.slice(data.length - size, data.length);
    } else if(pos > mid){
      vindow = data.slice(pos - mid, pos);
      vindow = _.flatten([vindow, data.slice(pos, pos + mid)]);
    } else {
      vindow = data.slice(0, size);
    }
    max = d3.max(_.pluck(vindow, aes.x));
    min = d3.min(_.pluck(vindow, aes.x));
    // Thanks Jason Davies. I'll have to learn better how this actually works.
    // https://github.com/jasondavies/science.js/blob/master/src/stats/loess.js
    // Also, see:
    // http://en.wikipedia.org/wiki/Least_squares#Weighted_least_squares
    var sumWeights = 0,
        sumX = 0,
        sumXSquared = 0,
        sumY = 0,
        sumXY = 0;

    _.each(vindow, function(v) {
      var xk   = v[aes.x],
          yk   = v[aes.y],
          dist = d3.max([Math.abs(max - d[aes.x]), Math.abs(d[aes.x] - min)]),
          w = Math.pow(1 - Math.abs(Math.pow((v[aes.x] - d[aes.x])/dist, 3)),3),
          xkw  = xk * w;
      sumWeights += w;
      sumX += xkw;
      sumXSquared += xk * xkw;
      sumY += yk * w;
      sumXY += yk * xkw;      
    });
    var meanX = sumX / sumWeights,
        meanY = sumY / sumWeights,
        meanXY = sumXY / sumWeights,
        meanXSquared = sumXSquared / sumWeights;

    var beta = (Math.sqrt(Math.abs(meanXSquared - meanX * meanX)) < 1e-12)        ? 0 : ((meanXY - meanX * meanY) / (meanXSquared - meanX * meanX));

    var alpha = meanY - beta * meanX,
        out = _.clone(d);

    out[aes.y] = alpha + beta*out[aes.x];
    points.push(out);

  }, this);
  return points;
};

Smooth.prototype.lm = function(data, s, coef, weights) {

  // both should be numbers
  // need to make this work with dates, too.
  data = this.validate(data, s);
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
  if(coef) { return {m: m, b: b}; }
  o1 = _.clone(_.min(data, aes.x));
  o2 = _.clone(_.max(data, aes.x));
  if(_.any([o1, o2], function(d) {
    return !_.isPlainObject(d);}) ){ return [];}
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

  data = _.map(data, function(d) {
    return this[this.method()](d, s);
  }, this);
  return data;  
};

Smooth.prototype.draw = function(sel, data, i, layerNum) {
  var selector = data.selector;
  data = Line.prototype.draw.call(this, sel, data, i, layerNum);
  if(_.isEmpty(_.flatten(data))) { return data; }

  if(!this.errorBand()){
    return null;
  }
  var s = this.setup(),
      scales = this.scalesAxes(sel, s, selector, layerNum,
                                this.drawX(), this.drawY()),
      x = scales.x.scale(),
      y = scales.y.scale(),
      y2, r,
      o2 = function() { return 0; };
      o2.rangeBand = function() { return 0;};
      r = ggd3.geoms.ribbon()
            .color(s.color)
            .data([data]);

  if(this.method() === "loess"){
    return null;
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

