function Text(spec) {
  var attributes = {
    name: "text",
    stat: "identity",
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    // if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    // }
  }
}
Text.prototype = new Geom();
// Text.prototype.constructor = Text;

Text.prototype.draw = function() {

  var layer   = this.layer(),
      plot    = layer.plot(),
      stat    = layer.stat(),
      facet   = plot.facet(),
      aes     = layer.aes(),
      fill    = d3.functor(this.fill() || plot.fill()),
      size    = d3.functor(this.size() || plot.size()),
      alpha   = d3.functor(this.alpha() || plot.alpha()),
      color   = d3.functor(this.color() || plot.color()),
      that    = this;
  function draw(sel, data, i, layerNum) {
    var id = (facet.type() === "grid") ? "single":sel.attr('id'),
        x = plot.xScale()[id],
        y = plot.yScale()[id];

    if(layerNum === 0){
      sel.select('.x.axis')
        .attr("transform", "translate(" + x.positionAxis() + ")")
        .transition().call(x.axis);
      sel.select('.y.axis')
        .attr("transform", "translate(" + y.positionAxis() + ")")
        .transition().call(y.axis);
    }
    ggd3.tools.removeElements(sel, layerNum, "text");
    var text = sel.select('.plot')
                  .selectAll('text.geom.g' + layerNum)
                  .data(stat.compute(data.data));
    text.transition()
        .attr('class', 'geom g' + layerNum + " geom-text")
        .text(function(d) { return d[aes.label];})
        .attr('transform', function(d) {
          return "translate(" + x.scale()(d[aes.x])+ 
                  "," + y.scale()(d[aes.y]) + ")";
        })  
        .style('font-size', function(d) { return size(d[aes.size]);})
        .style('opacity', function(d) { return alpha(d[aes.alpha]); })
        .style('stroke', function(d) { return color(d[aes.color]); })
        .style('stroke-width', 1)
        .attr('text-anchor', 'middle')
        .attr('y', function(d) { return size(d[aes.size])/2; })
        .style('fill', function(d) { return fill(d[aes.fill]); });
    text.enter().append('text')
        .attr('class', 'geom g' + layerNum + " geom-text")
        .text(function(d) { return d[aes.label]; })
        .attr('transform', function(d) {
          return "translate(" + x.scale()(d[aes.x])+ 
                  "," + y.scale()(d[aes.y]) + ")";
        })
        .style('font-size', function(d) { return size(d[aes.size]);})
        .style('opacity', function(d) { return alpha(d[aes.alpha]); })
        .style('stroke', function(d) { return color(d[aes.color]); })
        .style('stroke-width', 1)
        .attr('y', function(d) { return size(d[aes.size])/2; })
        .attr('text-anchor', 'middle')
        .style('fill', function(d) { return fill(d[aes.fill]); });
    text.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }
  return draw;
};

Text.prototype.defaultStat = function() {
  return new ggd3.stats.identity();
};

ggd3.geoms.text = Text;
