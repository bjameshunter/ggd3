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
    lineWidth: null,
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

Line.prototype.generator = function(aes, x, y, o2, group) {
  if(x.hasOwnProperty('rangeBand')) {
    return d3.svg.line()
            .x(function(d, i) { 
              return (x(d[aes.x]) + o2(d[group]) + 
                            o2.rangeBand() * i); 
            })
            .y(function(d) { return y(d[aes.y]); })
            .interpolate(this.interpolate());
  }
  if(y.hasOwnProperty('rangeBand')) {
    return d3.svg.line()
            .x(function(d) { return x(d[aes.x]); })
            .y(function(d, i) { 
              return (y(d[aes.y]) + o2(d[group]) +
                            o2.rangeBand()*i); 
            })
            .interpolate(this.interpolate());
  }
  return d3.svg.line()
          .x(function(d, i) { return x(d[aes.x]); })
          .y(function(d, i) { return y(d[aes.y]); })
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
    // grid style defined in css.
    path
      .attr('stroke-opacity', function(d) { return s.alpha(d[1]) ;})
      .attr('stroke', function(d) { return s.color(d[1]);})
      .attr('stroke-width', this.lineWidth())
      .attr('fill', 'none'); // must explicitly declare no grid.
  }
};

Line.prototype.prepareData = function(data, s) {
  data = s.nest
          .entries(data.data) ;
  data = _.map(data, function(d) { return this.recurseNest(d);}, this);
  return data;
};

Line.prototype.draw = function(sel, data, i, layerNum){
  // console.log('first line of line.draw');
  // console.log(data);
  var s     = this.setup(),
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                 this.drawX(), this.drawY()),
      x = scales.x.scale(),
      y = scales.y.scale(),
      o2 = function() { return 0; };
      o2.rangeBand = function() { return 0; };

  if(x.hasOwnProperty('rangeBand') ||
     y.hasOwnProperty('rangeBand')){
    if(s.grouped) {
      o2 = s.plot.subScale().single.scale();
    }
  }

  data = this.prepareData(data, s, scales);
  sel = this.grid() ? sel.select("." + this.direction() + 'grid'): sel.select('.plot');
  var lines = sel
              .selectAll("." + this.selector(layerNum).replace(/ /g, '.'))
              .data(data),
  line = this.generator(s.aes, x, y, o2, s.group);
  lines.transition().call(_.bind(this.drawLines, this), line, s, layerNum);
  lines.enter().append(this.geom())
    .call(_.bind(this.drawLines, this), line, s, layerNum);
  lines.exit()
    .transition()
    .style('opacity', 0)
    .remove();
};


ggd3.geoms.line = Line;