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
  };

  if(setting.constructor === Object) {
    for(var a in setting){
      if(typeof setting[a] === 'function'){
        attributes[a] = setting[a];
      } else {
        attributes[a] = this[setting[a]];
      }
    }
  } else if(typeof setting === 'string') {
    attributes.linearAgg = setting;
  }
  this.exclude = ["xintercept", "yintercept", "slope",
  // maybe we do want to calculate mins and maxs
    "ymax", "ymin", "xmax", "xmin", 
    // additional column info included in tooltip
    'additional'
    ];

  this.attributes = attributes;
  var getSet = ["layer", "linearAgg"];
  for(var attr in attributes){
    if(contains(getSet, attr)){
      this[attr] = createAccessor(attr);
    }
  }
}

var specialStats = [
  "density",
  "bin",
  "boxplot"
];

Stat.prototype.agg = function(data, aes) {
  var out = [{}];
  Object.keys(aes).forEach(function (a) {
    if(!contains(this.exclude, a)) {
      if(contains(["range", "unique"], this[a]()._name) ){
        var r = this[a]()(pluck(flatten([data]), aes[a]));
        out = r.map(function(d) {
            var o = clone(out[0]);
            o[aes[a]] = d;
            return o;
          });
      } else {
        out = out.map(function(o) {
          o[aes[a]] = this[a]()(pluck(flatten([data], false), aes[a]));
          return o;
        }, this);
      }
    }
  }, this);
  return out;
};

Stat.prototype.compute = function(data) {
  var aes = this.layer().aes(),
      id = any(difference(Object.keys(aes), this.exclude).map( 
            function(k){
              if(!this[k]()){ return null; }
              return this[k]()([]) === "identity";
            }, this));
  if(contains(specialStats, this.linearAgg()) ){
    return this["compute_" + this.linearAgg()](data);
  }
  // most situations will need these two
  if(id){
    return data;
  }
  out = flatten(this.agg(data, aes));
  return out;
};

function aggSetter(a) {
  return function(f) {
    if(!arguments.length) { return this.attributes[a]; }
    if(typeof f === 'string'){
      this.attributes[a] = this[f];
    } else if(typeof f === 'function'){
      this.attributes[a] = f;
    } else if(Array.isArray(f)){
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
Stat.prototype.ymax = aggSetter('ymax');
Stat.prototype.ymin = aggSetter('ymin');
Stat.prototype.fill = aggSetter('fill');
Stat.prototype.color = aggSetter('color');
Stat.prototype.group = aggSetter('group');
Stat.prototype.alpha = aggSetter('alpha');
Stat.prototype.size = aggSetter('size');
Stat.prototype.size = aggSetter('size');

// label should always be the same each element of array
Stat.prototype.label = function() {
  return function(arr) {
    return arr[0];
  };
};
Stat.prototype.label._name = "label";

Stat.prototype.unique = function(arr) {
  return unique(arr);
};  
Stat.prototype.unique._name = "unique";

Stat.prototype.range = function(arr) {
  return d3.extent(arr);
};
Stat.prototype.range._name = "range";

// median
Stat.prototype.median = function(arr) {
  if(arr.length > 100000) { 
    console.warn("Default behavior of returning median overridden " + 
           "because array length > 1,000,000." + 
           " Mean is probably good enough.");
    return d3.mean(arr); 
  }
  return d3.median(arr);
};
Stat.prototype.median._name = "median";

// count
Stat.prototype.count = function(arr) {
  return arr.length;
};
Stat.prototype.count._name = "count";

// min
Stat.prototype.min = function(arr) {
  return d3.min(arr);
};
Stat.prototype.min._name = "min";

// max
Stat.prototype.max = function(arr) {
  return d3.max(arr);
};
Stat.prototype.max._name = "max";

// mean
Stat.prototype.mean = function(arr) {
  return d3.mean(arr);
};
Stat.prototype.mean._name = "mean";

// iqr
Stat.prototype.iqr = function(arr) {

  return {"75th percentile": d3.quantile(arr, 0.75),
          "50th percentile": d3.quantile(arr, 0.5),
          "25th percentile": d3.quantile(arr, 0.25),
        };
};
Stat.prototype.iqr._name = "iqr";

// don't do anything with character columns
Stat.prototype.first = function(arr) {
  return arr[0];
};
Stat.prototype.first._name = "first";

Stat.prototype.mode = function(arr) {
  return "nuthing yet for mode.";
};
Stat.prototype.mode._name = "mode";

// how to deal with less convential computations?
// ugly hack? Most of this is ugly.
Stat.prototype.identity = function(arr) {
  return "identity";
};
Stat.prototype.identity._name = "identity";

Stat.prototype.density = function(arr) {
  return 'density';
};
Stat.prototype.density._name = "density";

Stat.prototype.boxplot = function(arr) {
  return 'boxplot';
};
Stat.prototype.boxplot._name = "boxplot";

Stat.prototype.bin = function() {
  return 'bin';
};
Stat.prototype.bin._name = "bin";

Stat.prototype.compute_boxplot = function(data) {
  var start = new Date().getTime();
  var aes = this.layer().aes(),
      g = this.layer().geom(),
      // come up with better test to 
      // choose which is factor. Number unique, or a 
      // special marker on dtypes
      factor = this.layer().dtypes()[aes.x][1] === "few" ? 'x': 'y',
      number = factor === 'x' ? 'y': 'x',
      arr = pluck(data, aes[number]).sort(d3.ascending);
      var end = new Date().getTime();
      console.log("after sort");
      console.log(end - start);
      var iqr = this.iqr(arr);
      end = new Date().getTime();
      console.log("after iqr");
      console.log(end - start);
      var upper = d3.quantile(arr, g.tail() ? (1 - g.tail()): g.upper()),
      lower = d3.quantile(arr, g.tail() || g.lower()),
      out = merge({
        "quantiles": iqr,
        "upper": upper,
        "lower": lower,
      }, this.agg(data, aes)[0]);
      out["n. observations"] = data.length;
      end = new Date().getTime();
      console.log("after outliers");
      console.log(end - start);
      out.data = data.filter(function(d) {
        return ((d[aes[number]] < lower) || 
                (d[aes[number]] > upper));
      });
  return out;
};

Stat.prototype.compute_bin = function(data) {

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
    if(d.length === 0) { return d; }
    d[aes[n]] = d.x;
    d.binHeight = d.y;
    // all other aesthetics in histograms will only map to
    // categories, so we don't need to know all about other 
    // variables in the bin.
    for(var a in aes) {
      if(contains(['x', 'y'], a)) { continue; }
      d[aes[a]] = d[0][aes[a]];
    }
    return d;
  });
  return data;
};

Stat.prototype.compute_density = function(data) {
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
  ['color', 'group', "fill"].forEach(function(a) {
    if(aes[a]){
      out[aes[a]] = data[0][aes[a]];
      start[aes[a]] = data[0][aes[a]];
      end[aes[a]] = data[0][aes[a]];
    }
  });
  data = pluck(data, aes[n]);
  g = this.layer().geom();
  k = g[g.kernel()](g.smooth());
  r = d3.extent(data);
  p = d3.range(r[0], r[1], (r[1] - r[0])/g.nPoints());
  kde = g.kde(k, p);
  data = kde(data);
  out = data.map(function(d) {
    var o = clone(out);
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