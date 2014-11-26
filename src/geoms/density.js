// 
function Density(spec) {
  Geom.apply(this);
  var attributes = {
    name: "density",
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

Density.prototype.constructor = Density;

ggd3.geoms.density = Density;