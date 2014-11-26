// 
function Smooth(spec) {
  Geom.apply(this);
  var attributes = {
    name: "smooth",
    stat: "identity",
    position: null,
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Smooth.prototype.constructor = Smooth;

ggd3.geoms.smooth = Smooth;