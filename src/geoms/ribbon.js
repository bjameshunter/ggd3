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
  };

  this.attributes = _.merge(this.attributes, attributes);

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

  if(x.hasOwnProperty('rangeBand')) {
    return area
            .x0(function(d, i) { 
              return (x(d[aes.x]) + o2(d[group]) + 
                            o2.rangeBand() * i); 
            })
            .x1(function(d, i) { 
              return (x(d[aes.x]) + o2(d[group]) + 
                            o2.rangeBand() * (i + 1)); 
            })
            .y0(function(d) { return y(d[aes.ymin]); })
            .y1(function(d) { return y(d[aes.ymax]); });
  }
  if(y.hasOwnProperty('rangeBand')) {
    return area
            .x0(function(d) { return x(d[aes.xmax]); })
            .x1(function(d) { return x(d[aes.xmin]); })
            .y0(function(d, i) { 
              return (y(d[aes.y]) + o2(d[group]) +
                            o2.rangeBand()*i); 
            })
            .y1(function(d, i) { 
              return (y(d[aes.y]) + o2(d[group]) +
                            o2.rangeBand()*(i + 1)); 
            });
  }
  return area
          .x(function(d, i) { return x(d[aes.x]); })
          .y0(function(d, i) { return y('ymin', n)(d); })
          .y1(function(d, i) { return y('ymax', n)(d); });
};

Ribbon.prototype.check = function(aes, d) {
  if(!aes[d + 'min'] || !aes[d + 'max']){
    throw "You must specify, as a function, variable, or constant" +
      " a " + d + "min and " + d + "max";
  }
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
  var ribbon = sel.select('.plot')
              .selectAll(".g" + layerNum + "geom-" + this.name())
              .data(data);
  ribbon.transition()
    .each(function(d, i) {
      that.drawArea(d3.select(this), areaGen(i), s, layerNum, i);
    });
  // makes sense that all area/ribbons go first.
  ribbon.enter().insert(this.geom(), ".geom.g0")
    .each(function(d, i) {
      that.drawArea(d3.select(this), areaGen(i), s, layerNum);
    });
  ribbon.exit()
    .transition()
    .style('opacity', 0)
    .remove();
};

ggd3.geoms.ribbon = Ribbon;