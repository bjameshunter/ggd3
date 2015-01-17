// 
function Path(spec) {
  if(!(this instanceof Geom)){
    return new Path(spec);
  }
  Line.apply(this);
  var attributes = {
    name: "path",
    stat: "identity",
    position: 'append',
    interpolate: "linear",
    lineWidth: 1,
    tension: 1,
  };
  // path is just line drawn in order, so probably doesn't need anything.

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Path.prototype = new Line();

Path.prototype.constructor = Path;

ggd3.geoms.path = Path;
