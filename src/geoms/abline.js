// 
function Abline(spec) {
  Geom.apply(this);
  var attributes = {
    name: "abline",
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

Abline.prototype.constructor = Abline;

ggd3.geoms.abline = Abline;