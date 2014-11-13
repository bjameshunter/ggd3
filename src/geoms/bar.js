// 
function Bar(spec) {
  var attributes = {
    name: "bar",
  };

  this.attributes = _.merge(attributes, this.attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
}

Bar.prototype = new Geom();

Bar.prototype.draw = function() {
  var layer = this.layer(),
      plot = layer.plot(),
      aes = layer.aes(),
      that = this;
  function draw(sel, data) {
    // sel is svg, data is array of objects


  }
  return draw;
};

Bar.prototype.defaultStat = function() {
  return new ggd3.stats.count();
};

ggd3.geoms.bar = Bar;
