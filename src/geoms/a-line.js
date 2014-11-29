// 
function Line(spec) {
  if(!(this instanceof ggd3.geom)){
    return new Line(spec);
  }
  Geom.apply(this, spec);
  var attributes = {
    name: "line",
    stat: "identity",
    grid: false,
    interpolate: 'basis',
    lineType: null,
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}


Line.prototype = new Geom();
Line.prototype.constructor = Line;

Line.prototype.lineType = function(l) {
  if(!arguments.length) { return this.attributes.lineType; }
  this.attributes.lineType = d3.functor(l);
  return this;
};

Line.prototype.generator = function(aes, x, y) {
  return d3.svg.line()
          .x(function(d) { return x(d[aes.x]); })
          .y(function(d) { return y(d[aes.y]); })
          .interpolate(this.interpolate());
};

Line.prototype.selector = function(layerNum) {
  if(this.grid()){
    var direction = this.name() === "hline" ? "x": "y";
    return "grid-" + direction;
  }
  return "geom g" + layerNum + " geom-" + this.name();
};

Line.prototype.drawLines = function (path, line, s, layerNum) {
  var that = this;
  path.attr("class", this.selector(layerNum))
    .attr('d', line)
    .attr('stroke-dasharray', function(d) { 
      return that.lineType() ? that.lineType()(d): s.plot.lineType()(d); });
  if(!this.grid()){
    path  
      .attr('stroke', function(d) { return s.color(d[1]);})
      .attr('stroke-width', this.lineWidth() || s.plot.lineWidth())
      .attr('fill', 'none');
  }
};

Line.prototype.prepareData = function(data, s) {
  data = s.nest
          .rollup(function(d) { return s.stat.compute(d);})
          .entries(data.data) ;

  data = _.map(data, function(d) { return ggd3.tools.recurseNest(d);});
  return data;
};
// why? 
Line.prototype.innerDraw = function draw(sel, data, i, layerNum){

  var s     = this.setup(),
      that  = this,
      scales = that.scalesAxes(sel, s, data.selector, layerNum,
                                 this.drawX(), this.drawY());
    ggd3.tools.removeElements(sel, layerNum, "geom-" + this.name());

  data = this.prepareData(data, s, scales);

  var lines = sel.select('.plot')
                .selectAll("." + that.selector(layerNum).replace(/ /g, '.'))
                .data(data),
  line = that.generator(s.aes, scales.x.scale(), scales.y.scale());
  lines.transition().call(_.bind(this.drawLines, this), line, s, layerNum);
  lines.enter().append('path')
    .call(_.bind(this.drawLines, this), line, s, layerNum);
  lines.exit()
    .transition()
    .style('opacity', 0)
    .remove();
};

Line.prototype.draw = function() {
  // thought there'd be a purpose for this wrapper. Looks like not.


  return _.bind(this.innerDraw, this);
};



ggd3.geoms.line = Line;