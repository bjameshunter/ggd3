// Base geom from which all geoms inherit
function Geom(aes) {
  var attributes = {
    layer:     null,
  };
  this.attributes = attributes;
  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}
ggd3.geom = Geom;
