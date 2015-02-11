function Linerange(spec){
  if(!(this instanceof Linerange)){
    return new Linerange(spec);
  }
  Line.apply(this);
  var attributes = {
    lineType: "none",
    gPlacement: 'insert',
    name: 'linerange',
  };
  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}
// linerange responds to x, xmin, xmax or y, ymin, ymax and group or color

Linerange.prototype = new Line();

Linerange.prototype.constructor = Linerange;

Linerange.prototype.domain = function(data, a) {

  var layer   = this.layer(),
      plot    = layer.plot(),
      aes     = layer.aes(),
      extent  = [],
      minmax  = a === "x" ? ['xmin', 'xmax']:['ymin', 'ymax'],
      range;

  minmax.forEach(function(d) {
    if(typeof aes[d] === 'function'){
      extent.push(d3.extent(pluck(data, function(r) {
        return aes[d](r);
      })));
    } else if(typeof aes[d] === 'string'){
      extent.push(d3.extent(pluck(data, aes[d])));
    }
  });
  extent = d3.extent(flatten(extent));
  return extent;
};

Linerange.prototype.prepareData = function(data, s){
  var aes = clone(s.aes),
      dir = aes.ymin !== undefined ? "y": "x",
      min = aes[dir + 'min'],
      max = aes[dir + 'max'];
  data = Line.prototype.prepareData.call(this, data, s);

  data = pluck(flatten(data), function(d) {
    var o1 = clone(d),
        o2 = clone(d);
    o1[aes[dir]] = min(d);
    o2[aes[dir]] = max(d);
    return [o1, o2];
  });  
  return data;
};

ggd3.geoms.linerange = Linerange;
