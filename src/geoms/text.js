function Text(spec) {
  if(!(this instanceof Geom)){
    return new Text(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "text",
    stat: "identity",
    position: null,
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

Text.prototype.domain = function(data, a) {
  // duplicated at point
  var layer = this.layer(),
      plot = layer.plot(),
      aes = layer.aes(),
      extent = d3.extent(_.pluck(data, aes[a])),
      range = extent[1] - extent[0];

  // point always extends both ways
  if(range === 0){
    extent[0] -= 1;
    extent[1] += 1;
  }
  extent[0] -= 0.1 * range;
  extent[1] += 0.1 * range;
  return extent;
};

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
    var x, y;

    if(!_.contains(["free", "free_x"], facet.scales()) || 
       _.isUndefined(plot.xScale()[data.selector])){
      x = plot.xScale().single;
      console.log(x.domain());
      xfree = false;
    } else {
      x = plot.xScale()[data.selector];
      xfree = true;
    }
    if(!_.contains(["free", "free_y"], facet.scales()) || 
       _.isUndefined(plot.xScale()[data.selector])){
      y = plot.yScale().single;
      yfree = false;
    } else {
      y = plot.yScale()[data.selector];
      yfree = true;
    }
    if(layerNum === 0){
      sel.select('.x.axis')
        .attr("transform", "translate(" + x.positionAxis() + ")")
        .transition().call(x.axis);
      sel.select('.y.axis')
        .attr("transform", "translate(" + y.positionAxis() + ")")
        .transition().call(y.axis);
    }
    ggd3.tools.removeElements(sel, layerNum, "text");

    function drawText(text) {
      text
        .attr('class', 'geom g' + layerNum + " geom-text")
        .text(function(d) { return d[aes.label]; })
        .attr('transform', function(d) {
          return "translate(" + x.scale()(d[aes.x])+ 
                  "," + y.scale()(d[aes.y]) + ")";
        })
        .style('font-size', size)
        .attr('fill-opacity', alpha)
        .style('stroke', color)
        .style('stroke-width', 1)
        .attr('y', function(d) { return size(d)/2; })
        .attr('text-anchor', 'middle')
        .attr('fill', fill);
    }

    var text = sel.select('.plot')
                  .selectAll('text.geom.g' + layerNum)
                  .data(stat.compute(data.data));
    text.transition().call(drawText);
    text.enter().append('text').call(drawText);
    text.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }
  return draw;
};

ggd3.geoms.text = Text;
