// 
function Ribbon(spec) {
  if(!(this instanceof Ribbon)){
    return new Ribbon(spec);
  }
  Area.apply(this);
  var attributes = {
    name: "ribbon",
    stat: "identity",
    position: null,
    gPosition: 'insert'
  };

  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Ribbon.prototype = new Area();

Ribbon.prototype.constructor = Ribbon;

Ribbon.prototype.generator = function(aes, x, y, o2, group, n) {

  var area = d3.svg.area()
                .interpolate(this.interpolate());

  return area
          .x(function(d, i) { return x(d[aes.x]); })
          .y0(function(d, i) { 
            return y('ymin', n)(d); })
          .y1(function(d, i) { 
            return y('ymax', n)(d); });
};
Ribbon.prototype.drawRibbon = function(sel, data, i, layerNum, areaGen,
                                       s) {
  var ribbon = sel.selectAll(".geom.g" + layerNum + ".geom-" + this.name())
              .data(data),
      that = this;
  ribbon.transition()
    .each(function(d, i) {
      Area.prototype.drawArea.call(that, d3.select(this), areaGen(i), s, layerNum, i);
    });
  // makes sense that all area/ribbons go first.
  ribbon.enter()[this.gPosition()](this.geom(), "*")
    .each(function(d, i) {
      Area.prototype.drawArea.call(that, d3.select(this), areaGen(i), s, layerNum, i);
    });
  ribbon.exit()
    .transition()
    .style('opacity', 0)
    .remove();
};

// ribbon is always an operation on ymin, ymax, and x
Ribbon.prototype.draw = function(sel, data, i, layerNum) {
  var s = this.setup(),
      that = this,
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                this.drawX(), this.drawY()),
      x = scales.x.scale(),
      y = scales.y.scale(),
      y2,
      selector = data.selector,
      o2 = function() { return 0; };
      o2.rangeBand = function() { return 0;};
  data = this.prepareData(data, s);
  y2 = this.decorateScale('y', s, y, data);

  var areaGen = function(n) {
    return that.generator(s.aes, x, y2, o2, s.group, n);
  };
  this.drawRibbon(sel, data, i, layerNum, areaGen, s);
};

ggd3.geoms.ribbon = Ribbon;