// this is more than I need, I think.
// All a stat is is a mapping from aesthetics to 
// statistics. So points can map aesthetics to 
// statistics, but usually don't.
// Bars map one of x or y to identity and
// the other to some aggregate, default count.
// Box is like bars, but maps one to the five figure summary
// In this sense, jitter goes here as well. But it probably won't.

function Stat(aggFuncs) {
  var attributes = {
    aes: null,
    layer: null,
    aggFunctions: {
      x: this.aesVar('x'),
      y: this.aesVar('y'),
      color: this.aesVar('color'),
      fill: this.aesVar('fill'),
      alpha: this.aesVar('alpha'),
      group: this.aesVar('group'),
      // write default aesthetic functions to handle 
      // number and character data to be included in tooltip
      // and to be used to 
    }, // object storing column names and agg functions
    // to be optionally used on tooltips.
  };
  this.attributes = attributes;
  var getSet = ['aes', 'layer'];
  for(var attr in attributes){
    if((!this[attr] && 
       _.contains(getSet, attr))){
      this[attr] = createAccessor(attr);
    }
  }
}


// generic agg calc. returns median for number and
// nothing for characters;
Stat.prototype.aesVar = function(xy) {
  var that = this;
  // each of these guys needs to know the layer/plot
  // do get dtypes, and aesthetic
  return function(arr, a, layer){
    var aes = layer.aes(),
        dtype = layer.plot().dtypes()[aes[a]];
    // keep first element of character vectors because
    // many times it will be nested by that variable.
    // making it unique in the array.
    if(dtype[0] === "string"){
      return _.unique(_.pluck(arr, aes[a]))[0];
    }
    if(dtype[0] === "number" && dtype[1] === "many"){
      return that.median(_.pluck(arr, aes[a]));
    }
    return false;
  };
};

Stat.prototype.compute = function(data) {
  var out = {"count": data.length},
      aes = this.aes(),
      layer = this.layer();
  for(var a in aes){
    out[aes[a]] = this.aggFunctions()[a] ? 
      this.aggFunctions()[a](data, a, layer):undefined;
  }
  return out;
};

Stat.prototype.median = function(arr) {
  if(arr.length > 100000) { 
    console.warn("Default behavior of returning median overridden " + 
                 "because array length > 1,000,000.");
    return d3.mean(arr); 
  }
  return d3.median(arr);
};
// don't know why I feel need to do this.
Stat.prototype.min = function(arr) {
  return d3.min(arr);
};
Stat.prototype.max = function(arr) {
  return d3.max(arr);
};
Stat.prototype.mean = function(arr) {
  return d3.mean(arr);
};
Stat.prototype.iqr = function(arr, name) {
  arr = _.sortBy(arr);
  return {"25th percentile": d3.quantile(arr, 0.25),
          "50th percentile": d3.quantile(arr, 0.5),
          "75th percentile": d3.quantile(arr, 0.75)
        };
};

// don't do anything with character columns
Stat.prototype.calcCharacter = d3.functor(null);

Stat.prototype.aggFunctions = function(obj) {
  if(!arguments.length) { return this.attributes.aggFunctions; }
  var agg = _.merge(this.attributes.aggFunctions, obj);
  this.attributes.aggFunctions = agg;
  return this;
};

// bin
function Bin() {

}

Bin.prototype = new Stat();
Bin.prototype.constructor = Bin;
Bin.prototype.compute = function(data, nbins) {
  if(_.isUndefined(nbins)) {
    nbins = 20;
  }
};
Bin.prototype.name = function() {
  return "bin";
};
ggd3.stats.bin = Bin;


// count
function Count() {
  // for count, one of x or y should be ordinal and 
  // it should always have one unique value
  var that = this;
  var attributes = {
  };

  this.attributes = _.merge(this.attributes, attributes);
  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}
Count.prototype = new Stat();
Count.prototype.constructor = Count;
Count.prototype.name = function() {
  return "count";
};
Count.prototype.defaultGeom = function() {
  return new ggd3.geoms.bar();
};
ggd3.stats.count = Count;


//sum
function Sum(aggFuncs) {

}

Sum.prototype = new Stat();

Sum.prototype.compute = function() {

};

Sum.prototype.name = function() {
  return "sum";
};


// mean
function Mean(aggFuncs) {

}

Mean.prototype = new Stat();

Mean.prototype.compute = function() {

};

Mean.prototype.name = function() {
  return "mean";
};

// median
function Median(aggFuncs){

}
Median.prototype = new Stat();

Median.constructor = Median;

Median.prototype.compute = function(data) {
  var out = {"_n_obs": data.length},
      aes = this.aes(),
      layer = this.layer(),
      plot = layer.plot();


  for(var a in aes){
    out[aes[a]] = this.aggFunctions()[a] ? 
      this.aggFunctions()[a](data, a, layer):undefined;
  }

  return out;
};

Median.prototype.name = function() {
  return "median";
};

ggd3.stats.median = Median;

// min
function Min(aggFuncs){

}
Min.prototype = new Stat();

Min.constructor = Min;

Min.prototype.compute = function(data) {
  var out = {"_n_obs": data.length},
      aes = this.aes(),
      layer = this.layer(),
      plot = layer.plot();



  for(var a in aes){
    out[aes[a]] = this.aggFunctions()[a] ? 
      this.aggFunctions()[a](data, a, layer):undefined;
  }

  return out;
};

Min.prototype.name = function() {
  return "min";
};

Min.prototype.defaultGeom = function() {
  return new ggd3.geoms.bar();
};

ggd3.stats.min = Min;

// max 
function Max(aggFuncs){

}
Max.prototype = new Stat();

Max.constructor = Max;

Max.prototype.compute = function(data) {
  var out = {"_n_obs": data.length},
      aes = this.aes(),
      layer = this.layer(),
      plot = layer.plot();


  for(var a in aes){
    out[aes[a]] = this.aggFunctions()[a] ? 
      this.aggFunctions()[a](data, a, layer):undefined;
  }

  return out;
};

Max.prototype.name = function() {
  return "min";
};
Max.prototype.defaultGeom = function() {
  return new ggd3.geoms.bar();
};

ggd3.stats.Max = Max;

// identity
function Identity() {

}
Identity.prototype = new Stat();

Identity.prototype.constructor = Identity;

// override base compute
Identity.prototype.compute = function(data) {
  return data || [];
};
Identity.prototype.name = function() {
  return "identity";
};
Identity.prototype.defaultGeom = function() {
  return new ggd3.geoms.point();
};
ggd3.stats.identity = Identity;


// identity
function Box(aggFuncs) {

}
Box.prototype = new Stat();

Box.prototype.constructor = Identity;

Box.prototype.compute = function(data) {

  return out;
};
Box.prototype.name = function() {
  return "Box";
};
Box.prototype.defaultGeom = function() {
  return new ggd3.geoms.box();
};
ggd3.stats.box = Box;

