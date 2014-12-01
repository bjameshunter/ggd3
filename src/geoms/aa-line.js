// 
function Line(spec) {
  if(!(this instanceof ggd3.geom)){
    return new Line(spec);
  }
  Geom.apply(this, spec);
  var attributes = {
    name: "line",
    stat: "identity",
    geom: "path",
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
  if(!this.lineType()){
    this.lineType(s.plot.lineType());
  }
  path.attr("class", this.selector(layerNum))
    .attr('d', line)
    .attr('stroke-dasharray', this.lineType());
  if(!this.grid()){
    path
      .attr('stroke-opacity', function(d) { return s.alpha(d[1]) ;})
      .attr('stroke', function(d) { return s.color(d[1]);})
      .attr('stroke-width', this.lineWidth() || s.plot.lineWidth())
      .attr('fill', 'none'); // must explicitly declare no grid.
  }
};

Line.prototype.prepareData = function(data, s) {
  data = s.nest
          .rollup(function(d) { return s.stat.compute(d);})
          .entries(data.data) ;

  data = _.map(data, function(d) { return this.recurseNest(d);}, this);
  return data;
};

Line.prototype.draw = function draw(sel, data, i, layerNum){
// data should be passed in in order
// missing data should be allowed somehow
// the 
  var s     = this.setup(),
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                 this.drawX(), this.drawY());

  ggd3.tools.removeElements(sel, layerNum, "geom-" + this.name());
  data = this.prepareData(data, s, scales);
  sel = this.grid() ? sel.select("." + this.direction() + 'grid'): sel.select('.plot');
  var lines = sel
              .selectAll("." + this.selector(layerNum).replace(/ /g, '.'))
              .data(data),
  line = this.generator(s.aes, scales.x.scale(), scales.y.scale());
  lines.transition().call(_.bind(this.drawLines, this), line, s, layerNum);
  lines.enter().append(this.geom())
    .call(_.bind(this.drawLines, this), line, s, layerNum);
  lines.exit()
    .transition()
    .style('opacity', 0)
    .remove();
};


ggd3.geoms.line = Line;