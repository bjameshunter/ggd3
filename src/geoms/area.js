// 
function Area(spec) {
  if(!(this instanceof Area)){
    return new Area(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "area",
    stat: "identity",
    geom: "path",
    position: null,
    interpolate: 'linear',
    strokeOpacity: 0.1
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Area.prototype = new Geom();

Area.prototype.constructor = Area;

Area.prototype.prepareData = function(data, s) {
  data = s.nest
          .entries(data.data) ;
  data = _.map(data, function(d) { return this.recurseNest(d);}, this);
  return _.isArray(data[0]) ? data: [data];
};
Area.prototype.generator = function(aes, x, y3, o2, group) {

  var area = d3.svg.area()
                .interpolate(this.interpolate());
                // .defined(function(d) {
                //   return (!isNaN(y3(d[aes.y])));
                // });
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
  if(y3.hasOwnProperty('rangeBand')) {
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
          .y0(y3('ymin'))
          .y1(y3('ymax'));

};

Area.prototype.drawArea = function(area, gen, s, layerNum) {
  var that = this;
  area.attr('class', "geom g" + layerNum + " geom-" + this.name())
    .attr('d', gen)
    .attr('fill-opacity', function(d) { return s.alpha(d[1]); })
    .attr('stroke', function(d) { return s.color(d[1]); })
    .attr('stroke-opacity', function(d) { return that.strokeOpacity(); })
    .attr('fill', function(d) { return s.fill(d[1]); });
};

Area.prototype.draw = function(sel, data, i, layerNum) {
  var s = this.setup(),
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                this.drawX(), this.drawY()),
      x = scales.x.scale(),
      y = scales.y.scale(),
      selector = data.selector,
      o2 = function() { return 0; };
      o2.rangeBand = function() { return 0;};
  data = this.prepareData(data, s);
  if(_.isNumber(s.aes.ymin)){
    // both ymin and ymax should be set to be a number above
    // and below the given y variable
    y2 = function(m) {
      return function(d) { return y(d[s.aes.y] + s.aes[m]);};
    };
  }

  var areaGen = this.generator(s.aes, x, y2, o2, s.group);
  var area = sel.select('.plot')
              .selectAll(".g" + layerNum + "geom-" + this.name())
              .data(data);
  area.transition().call(_.bind(this.drawArea, this), areaGen, s, layerNum);
  area.enter().append(this.geom())
    .call(_.bind(this.drawArea, this), areaGen, s, layerNum);
  area.exit()
    .transition()
    .style('opacity', 0)
    .remove();
  // area should work on ordinal axes as well.
  // so we can do, like, bullet charts'n shit.


};

ggd3.geoms.area = Area;