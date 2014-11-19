// allow layer level specifying of size, fill,
// color, alpha and shape variables/scales
// but inherit from layer/plot if 
function Point(spec) {
  var attributes = {
    name: "point",
    shape: "circle",
  };

  this.attributes = _.merge(attributes, this.attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
}
Point.prototype = new Geom();

Point.prototype.draw = function() {

  var layer     = this.layer(),
      position  = layer.position(),
      plot      = layer.plot(),
      stat      = layer.stat(),
      facet     = plot.facet(),
      margins   = plot.margins(),
      aes       = layer.aes(),
      fill      = d3.functor(this.fill() || plot.fill()),
      size      = d3.functor(this.size() || plot.size()),
      shape     = d3.functor(this.shape() || plot.shape()),
      alpha     = d3.functor(this.alpha() || plot.alpha()),
      color     = d3.functor(this.color() || plot.color()),
      that      = this,
      geom      = d3.superformula()
               .segments(20)
               .type(function(d) { return shape(d[aes.shape]); })
               .size(function(d) { return size(d[aes.size]); });
  function draw(sel, data, i, layerNum) {
    var id = (facet.type() === "grid") ? "single":sel.attr('id'),
        x = plot.xScale()[id],
        y = plot.yScale()[id];
    // drawing and positioning axes probably shouldn't be on
    // the geom
    // but here, we're drawing
    // here set scales according to fixed/free/grid
    if(layerNum === 0 && x && y){
      sel.select('.x.axis')
        .attr("transform", "translate(" + x.positionAxis() + ")")
        .transition().call(x.axis);
      sel.select('.y.axis')
        .attr("transform", "translate(" + y.positionAxis() + ")")
        .transition().call(y.axis);
    }
    // get rid of wrong elements if they exist.
    ggd3.tools.removeElements(sel, layerNum, "path");
    var points = sel.select('.plot')
                  .selectAll('path.geom.g' + layerNum)
                  .data(stat.compute(data.data));
    // add canvas and svg functions.

    points.transition()
        .attr('class', 'geom g' + layerNum + " geom-point")
        .attr('d', geom)
        .attr('transform', function(d) {
          return "translate(" + x.scale()(d[aes.x])+ 
                  "," + y.scale()(d[aes.y]) + ")";
        })
        .attr('fill', function(d) { return fill(d[aes.fill]); })
        .style('stroke', function(d) { return color(d[aes.color]); })
        .style('stroke-width', 1)
        .attr('fill-opacity', function(d) { return alpha(d[aes.alpha]); });
    points.enter().append('path')
        .attr('class', 'geom g' + layerNum + " geom-point")
        .attr('d', geom)
        .attr('transform', function(d) {
          return "translate(" + x.scale()(d[aes.x])+ 
                  "," + y.scale()(d[aes.y]) + ")";
        })
        .attr('fill', function(d) { return fill(d[aes.fill]); })
        .style('stroke', function(d) { return color(d[aes.color]); })
        .style('stroke-width', 1)
        .attr('fill-opacity', function(d) { return alpha(d[aes.alpha]); });
    // sel is svg, data is array of objects
    points.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }
  return draw;
};

Point.prototype.defaultStat = function() {
  return new ggd3.stats.identity();
};

ggd3.geoms.point = Point;
