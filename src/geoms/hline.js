// 
function Hline(spec) {
  Geom.apply(this);
  var attributes = {
    name: "hline",
    stat: "identity",
    position: null,
    lineWidth: 1,
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Hline.prototype.constructor = Hline;

ggd3.geoms.hline = Hline;