// 
function Vline(spec) {
  Geom.apply(this);
  var attributes = {
    name: "vline",
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

Vline.prototype.constructor = Vline;

ggd3.geoms.vline = Vline;