function Stat() {
  var attributes = {
  };
  this.attributes = attributes;
  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
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

}
Count.prototype = new Stat();
Count.prototype.compute = function(data) {
  data = data.data || [];
  return data;
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
  data = data.data || [];
  return data;
};
Identity.prototype.name = function() {
  return "identity";
};
Identity.prototype.defaultGeom = function() {
  return new ggd3.geoms.point();
};
ggd3.stats.identity = Identity;

