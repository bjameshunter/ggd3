function Stat() {
  var attributes = {
    aes: null,
    dtypes: null,
    functions: {
      x: function(d, v) { return _.unique(_.pluck(d, v))[0]; },
      y: function(d, v) { return _.unique(_.pluck(d, v))[0]; },
      // write default aesthetic functions to handle 
      // number and character data to be included in tooltip
      // and to be used to 
    }, // object storing column names and agg functions
    // to be optionally used on tooltips.
  };
  this.attributes = attributes;
  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

// bin
function Bin() {

}

Bin.prototype = new Stat();
Bin.prototype.compute = function(data, nbins) {

};
Bin.prototype.name = function() {
  return "bin";
};
ggd3.stats.bin = Bin;


// count
function Count() {
  var attributes = {
  };

  this.attributes = _.merge(attributes, this.attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
}
Count.prototype = new Stat();
Count.prototype.compute = function(data) {
  var out = {"count": data.values.length},
      aes = this.aes();
  for(var a in aes){
    out[aes[a]] = this.functions()[a] ? this.functions()[a](data.values, this.aes()[a]):undefined;
  }
  return out;
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

