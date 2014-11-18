// allow layer level specifying of size, fill,
// color, alpha and shape variables/scales
// but inherit from layer/plot if 
function Point(spec) {
  var attributes = {
    name: "point",
    shape: "square",
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
  // bar takes an array of data, 
  // nests by a required ordinal axis, optional color and group
  // variables then calculates the stat and draws
  // horizontal or vertical bars.
  // stacked, grouped, expanded or not.
  // scales first need to be calculated according to output
  // of the stat. 
  var layer     = this.layer(),
      plot      = layer.plot(),
      stat      = layer.stat(),
      facet     = plot.facet(),
      margins   = plot.margins(),
      aes       = layer.aes(),
      fill      = d3.functor(plot.fill()),
      size      = d3.functor(plot.size()),
      shape     = d3.functor(this.shape()),
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
    data = stat.compute(data);
    // here set scales according to fixed/free/grid
    if(layerNum === 0){
      sel.select('.x.axis')
        .attr("transform", "translate(" + x.positionAxis() + ")")
        .transition().call(x.axis);
      sel.select('.y.axis')
        .attr("transform", "translate(" + y.positionAxis() + ")")
        .transition().call(y.axis);
    }
    var notGeom = sel.select('.plot')
                    .selectAll('.geom' + layerNum)
                    .selectAll('.geom-point');
    var points = sel.select('.plot')
                  .selectAll('path.geom-' + layerNum)
                  .data(data);
    // add canvas and svg functions.

    points.transition()
        .attr('d', geom)
        .attr('transform', function(d) {
          return "translate(" + x.scale()(d[aes.x])+ 
                  "," + y.scale()(d[aes.y]) + ")";
        })
        .style('stroke', 'black')
        .attr('fill', function(d) { return fill(d[aes.fill]); });
    points.enter().append('path')
        .attr('class', 'geom-' + layerNum + " geom-point")
        .attr('d', geom)
        .attr('transform', function(d) {
          return "translate(" + x.scale()(d[aes.x])+ 
                  "," + y.scale()(d[aes.y]) + ")";
        })
        .style('stroke', 'black')
        .attr('fill', function(d) { return fill(d[aes.fill]); });
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
