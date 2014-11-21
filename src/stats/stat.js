function Stat() {
  var attributes = {
    aes: null,
    layer: null,
    aggFunctions: {
      x: this.calcAgg('x'),
      y: this.calcAgg('y'),
      color: this.calcAgg('color'),
      fill: this.calcAgg('fill'),
      alpha: this.calcAgg('alpha')
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

Stat.prototype.calcAgg = function(a) {
  var that = this;
  return function(arr, a, layer) {
    var aes = layer.aes(),
        dtype = layer.dtypes()[aes[a]];
    if(dtype[0] === "number" && dtype[1] === "many"){
      return that.calcNumeric(arr, aes[a]);
    }
    return that.calcCharacter(arr, aes[a]);
  };
};
// default to the median/mean for numeric columns
Stat.prototype.calcNumeric = function(arr, name) {
  if(arr.length > 100000) { 
    return {type: 'mean', val: d3.mean(_.pluck(arr, name))}; 
  }
  return {type: 'median', val: d3.median(_.pluck(arr, name))};
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

  };
Bin.prototype.name = function() {
  return "bin";
};
ggd3.stats.bin = Bin;


// count
function Count() {
  // for count, one of x or y should be ordinal and 
  // it should always have one unique value
  function ordinalAxisVar(xy) {

    return function(arr, a, layer){
      var aes = layer.aes();
      return _.unique(_.pluck(arr, aes[a]))[0];
    };
  }
  var attributes = {
    aggFunctions: {
      x: ordinalAxisVar('x'),
      y: ordinalAxisVar('y'),
    }
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
Count.prototype.compute = function(data) {
  var out = {"count": data.values.length},
      aes = this.aes(),
      layer = this.layer();
  for(var a in aes){
    out[aes[a]] = this.aggFunctions()[a] ? 
      this.aggFunctions()[a](data.values, a, layer):undefined;
  }
  return [out];
};
Count.prototype.name = function() {
  return "count";
};
Count.prototype.defaultGeom = function() {
  return new ggd3.geoms.bar();
};
ggd3.stats.count = Count;

// sum

// mean

// median

// max

// min 

// identity
function Identity() {

}
Identity.prototype = new Stat();

Identity.prototype.constructor = Identity;

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

