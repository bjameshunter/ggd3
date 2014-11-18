// Base geom from which all geoms inherit
function Geom(aes) {
  var attributes = {
    layer: null,
    stat: null,
  };
  this.attributes = attributes;
  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}
Geom.prototype.defaultStat = function() {
  return null;
};

ggd3.geom = Geom;
