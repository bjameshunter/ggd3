// 
function Area(spec) {
  Geom.apply(this);
  var attributes = {
    name: "area",
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

Area.prototype = new Area();

Area.prototype.constructor = Area;

Area.prototype.prepareData = function(data, s) {
  data = s.nest
          .entries(data.data) ;
  data = _.map(data, function(d) { return this.recurseNest(d);}, this);
  return _.isArray(data[0]) ? data: [data];
};

Area.prototype.draw = function(sel, data, i, layerNum) {
  var s = this.setup(),
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                this.drawX(), this.drawY()),
      x = scales.x.scale(),
      y = scales.y.scale();
};

ggd3.geoms.area = Area;