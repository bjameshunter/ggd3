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
  this.attributes = _.merge(this.attributes, attributes);

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

  _.each(minmax, function(d) {
    if(_.isFunction(aes[d])){
      extent.push(d3.extent(_.map(data, function(r) {
        return aes[d](r);
      })));
    } else if(_.isString(aes[d])){
      extent.push(d3.extent(_.map(data, aes[d])));
    }
  });
  extent = d3.extent(_.flatten(extent));
  return extent;
};

Linerange.prototype.prepareData = function(data, s){
  var aes = _.clone(s.aes),
      dir = !_.isUndefined(aes.ymin) ? "y": "x",
      min = aes[dir + 'min'],
      max = aes[dir + 'max'];
  data = Line.prototype.prepareData.call(this, data, s);

  data = _.map(_.flatten(data), function(d) {
    var o1 = _.clone(d),
        o2 = _.clone(d);
    o1[aes[dir]] = min(d);
    o2[aes[dir]] = max(d);
    return [o1, o2];
  });  
  return data;
};

ggd3.geoms.linerange = Linerange;
