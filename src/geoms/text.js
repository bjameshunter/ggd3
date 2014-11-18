function Text(spec) {
  var attributes = {
    name: "text",
  };

  this.attributes = _.merge(attributes, this.attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
}
Text.prototype = new Geom();

Text.prototype.draw = function() {
  var layer = this.layer(),
      plot = layer.plot(),
      stat = layer.stat(),
      facet = plot.facet(),
      margins = plot.margins(),
      aes = layer.aes(),
      fill = d3.functor(plot.fill()),
      size = d3.functor(plot.size()),
      that = this;
  function draw(sel, data, i, layerNum) {
    var id = (facet.type() === "grid") ? "single":sel.attr('id'),
        x = plot.xScale()[id],
        y = plot.yScale()[id];
    data = stat.compute(data);
    if(layerNum === 0){
      sel.select('.x.axis')
        .attr("transform", "translate(" + x.positionAxis() + ")")
        .transition().call(x.axis);
      sel.select('.y.axis')
        .attr("transform", "translate(" + y.positionAxis() + ")")
        .transition().call(y.axis);
    }
    var Text = sel.select('.plot')
                  .selectAll('.geom-' + layerNum)
                  .data(data);
    Text.transition()
        .text(function(d) { return d[aes.label];})
        .attr('transform', function(d) {
          return "translate(" + x.scale()(d[aes.x])+ 
                  "," + y.scale()(d[aes.y]) + ")";
        })  
        .style('font-size', function(d) { return size(d[aes.size]);})
        .style('opacity', 0.5)
        .attr('fill', function(d) { return fill(d[aes.fill]); });
    Text.enter().append('text')
        .attr('class', 'geom-' + layerNum + " geom-text")
        .text(function(d) { return d[aes.label]; })
        .attr('transform', function(d) {
          return "translate(" + x.scale()(d[aes.x])+ 
                  "," + y.scale()(d[aes.y]) + ")";
        })
        .style('font-size', function(d) { return size(d[aes.size]);})
        .style('opacity', 0.5)
        .attr('fill', function(d) { return fill(d[aes.fill]); });
    Text.exit()
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
