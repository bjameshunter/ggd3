function Text(spec) {
  if(!(this instanceof Geom)){
    return new Text(spec);
  }
  Point.apply(this);
  var attributes = {
    name: "text",
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    // if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    // }
  }
}
Text.prototype = new Point();

Text.prototype.constructor = Text;

Text.prototype.draw = function() {

  var s     = this.setup(),
      that  = this;

  function draw(sel, data, i, layerNum) {

    var scales = that.scalesAxes(sel, s, data.selector, layerNum,
                                 true, true);
    // add canvas and svg functions.

    var positionX = that.positionPoint(scales.x, s.group, s.groups),
        positionY = that.positionPoint(scales.y, s.group, s.groups);

    ggd3.tools.removeElements(sel, layerNum, "text");

    function drawText(text) {
      text
        .attr('class', 'geom g' + layerNum + " geom-text")
        .text(function(d) { return d[s.aes.label]; })
        .attr('x', positionX)
        .attr('y', positionY)
        .style('font-size', s.size)
        .attr('fill-opacity', s.alpha)
        .style('stroke', s.color)
        .style('stroke-width', 1)
        .attr('text-anchor', 'middle')
        .attr('fill', s.fill);
    }

    var text = sel.select('.plot')
                  .selectAll('text.geom.g' + layerNum)
                  .data(s.  stat.compute(data.data));
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
