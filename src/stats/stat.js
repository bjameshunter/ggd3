// this is more than I need, I think.
// All a stat is is a mapping from aesthetics to 
// statistics. So points can map aesthetics to 
// statistics, but usually don't.
// Bars map one of x or y to identity and
// the other to some aggregate, default count.
// Box is like bars, but maps one to the five figure summary
// In this sense, jitter goes here as well. But it probably won't.

function Stat(setting) {
  if(!(this instanceof Stat)){
    return new Stat(setting);
  }
  var attributes = {
    layer: null,
    linearAgg: null,
    x: null,
    y: null,
    fill: null,
    color: null,
    alpha: null,
    size: null,
    shape: null,
    label: null,
    yint: null, // default is median of group, like the rest
  }; 
  if(_.isPlainObject(setting)) {
    for(var a in setting){
      if(_.isFunction(setting[a])){
        attributes[a] = setting[a];
      } else {
        // map[a] is a string specifying a function
        // that lives on Stat
        attributes[a] = this[setting[a]];
      }
    }
  } else if(_.isString(setting)){
    attributes.linearAgg = setting;
  }
  // object storing column names and agg functions
  // to be optionally used on tooltips.
  this.attributes = attributes;
  var getSet = ["layer", "linearAgg"];
  for(var attr in attributes){
    if(_.contains(getSet, attr)){
      this[attr] = createAccessor(attr);
    }
  }
}

Stat.prototype.compute = function(data) {
  var out = {},
      aes = this.layer().aes(),
      id = _.any(_.map(_.keys(aes), function(k){
              if(!this[k]()){ return null; }
              return this[k]()([]) === "identity";
            }, this));
  if(this.linearAgg() === "density"){
    return this.calcDensity(data);
  }
  if(this.linearAgg() === "bin"){
    return this.calcBin(data);
  }
  // most situations will need these two
  if(id){
    return data;
  }
  for(var a in aes){
    out[aes[a]] = this[a]()(_.pluck(data, aes[a]));
  }
  return out;
};

function aggSetter(a) {
  return function(f) {
    if(!arguments.length) { return this.attributes[a]; }
    if(_.isString(f)){
      this.attributes[a] = this[f];
    } else if(_.isFunction(f)){
      this.attributes[a] = f;
    } else if(_.isArray(f)){
      // f is dtype
      if(f[0] === "string" || f[1] === "few"){
        // likely just need first
        this.attributes[a] = this.first;
      } else if(f[0] === "number" && f[1] === "many"){
        this.attributes[a] = this.median;
      }
    }
    return this;
  };
}
Stat.prototype.x = aggSetter('x');
Stat.prototype.y = aggSetter('y');
Stat.prototype.fill = aggSetter('fill');
Stat.prototype.color = aggSetter('color');
Stat.prototype.alpha = aggSetter('alpha');
Stat.prototype.size = aggSetter('size');
Stat.prototype.size = aggSetter('size');
Stat.prototype.yint = aggSetter('yint');
Stat.prototype.slope = d3.functor(null);
Stat.prototype.label = function() {
  return function(arr) {
    return arr[0];
  };
};

Stat.prototype.median = function(arr) {
  if(arr.length > 100000) { 
    console.warn("Default behavior of returning median overridden " + 
           "because array length > 1,000,000." + 
           " Mean is probably good enough.");
    return d3.mean(arr); 
  }
  return d3.median(arr);
};
Stat.prototype.count = function(arr) {
  return arr.length;
};
Stat.prototype.min = function(arr) {
  return d3.min(arr);
};
Stat.prototype.max = function(arr) {
  return d3.max(arr);
};
Stat.prototype.mean = function(arr) {
  return d3.mean(arr);
};
Stat.prototype.iqr = function(arr) {
  // arr = _.sortBy(arr);
  return {"25th percentile": d3.quantile(arr, 0.25),
          "50th percentile": d3.quantile(arr, 0.5),
          "75th percentile": d3.quantile(arr, 0.75)
        };
};

// don't do anything with character columns
Stat.prototype.first = function(arr) {
  return arr[0];
};

Stat.prototype.mode = function(arr) {
  return "nuthing yet for mode.";
};
// ugly hack? Most of this is ugly.
Stat.prototype.identity = function(arr) {
  return "identity";
};

Stat.prototype.density = function(arr) {
  // console.log(this);
  // var l = this.layer(),
  //     g = layer.geom(),
  //     k = g[g.kernel()](g.smooth());
  return 'density';
};

Stat.prototype.calcBin = function(data) {

  var aes = this.layer().aes(),
      g = this.layer().geom(),
      h, n;
  
  if(aes.y && aes.x) {
    // we've been through before and density exists on aes
    h = aes.y === "binHeight" ? 'y': 'x';
  } else {
    h = aes.y ? 'x': 'y';
    aes[h] = "binHeight";
  }
  n = h === "y" ? "x": "y";

  var hist = d3.layout.histogram()
                .bins(g.breaks() || g.bins())
                .frequency(g.frequency())
                .value(function(d) {
                  return d[aes[n]];
                });
  data = hist(data);
  data.map(function(d) {
    if(_.isEmpty(d)) { return d; }
    d[aes[n]] = d.x;
    d.binHeight = d.y;
    // all other aesthetics in histograms will only map to
    // categories, so we don't need to know all about other 
    // variables in the bin.
    for(var a in aes) {
      if(_.contains(['x', 'y'], a)) { continue; }
      d[aes[a]] = d[0][aes[a]];
    }
    return d;
  });
  return data;
};

Stat.prototype.calcDensity = function(data) {

  var out = {},
      start = {},
      end = {},
      aes = this.layer().aes();
  var g, k, r, p;
  if(aes.y && aes.x) {
    // we've been through before and density exists on aes
    d = aes.y === "density" ? 'y': 'x';
  } else {
    d = aes.y ? 'x': 'y';
    aes[d] = "density";
  }
  n = d === "y" ? "x": "y";
  _.map(['color', 'group'], function(a) {
    if(aes[a]){
      out[aes[a]] = data[0][aes[a]];
    }
  });
  data = _.pluck(data, aes[n]);
  g = this.layer().geom();
  k = g[g.kernel()](g.smooth());
  r = d3.extent(data);
  p = _.range(r[0], r[1], (r[1] - r[0])/g.nPoints());
  kde = g.kde(k, p);
  data = kde(data);
  out = _.map(data, function(d) {
    var o = _.clone(out);
    o[aes[n]] = d[0];
    o.density = d[1];
    return o;
  });
  start.density = 0;
  end.density = 0;
  start[aes[n]] = r[0];
  end[aes[n]] = r[1];
  out.splice(0, 0, start);
  out.push(end);
  return out;
};

ggd3.stats = Stat;