// 
function Path(spec) {
  if(!(this instanceof Geom)){
    return new Path(aes);
  }
  Geom.apply(this);
  var attributes = {
    name: "path",
    stat: "identity",
    position: null,
    lineWidth: 1,
  };
  // path is just line drawn in order, so probably doesn't need anything.

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Path.prototype.constructor = Path;

ggd3.geoms.path = Path;