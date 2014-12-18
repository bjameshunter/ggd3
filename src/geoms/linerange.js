function Linerange(spec){
  if(!(this instanceof Linerange)){
    return new Linerange(spec);
  }
  Line.apply(this);
  var attributes = {

  };

}
// linerange responds to x, xmin, xmax or y, ymin, ymax and group or color

Linerange.prototype = new Line();

Linerange.prototype.constructor = Linerange;

Linerange.prototype.domain = function(data, a) {
  var layer   = this.layer(),
      plot    = layer.plot(),
      aes     = layer.aes(),
      minmax  = a === "y" ? ['ymin', 'ymax']: ['xmin', 'xmax'],
      extent = [],
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
  extent = _.flatten(extent);

  return extent;
};


Linerange.prototype.draw = function(sel, data, i, layerNum){
  console.log(data);


};

ggd3.geoms.linerange = Linerange;
