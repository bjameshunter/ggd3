// 
function Point(spec) {
  var attributes = {
    name: "point",
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
  var layer = this.layer(),
      plot = layer.plot(),
      facet = plot.facet(),
      margins = plot.margins(),
      aes = layer.aes(),
      that = this;
  function draw(sel, data, i) {
    var id = (facet.type() === "grid" || 
              facet.scales()==="fixed") ? "single":sel.attr('id'),
        x = plot.xScale()[id],
        y = plot.yScale()[id];
    // drawing and positioning axes probably shouldn't be on
    // the geom
    // but here, we're drawing
    if(i === 0){
      sel.select('.x.axis')
        .attr("transform", "translate(" + x.positionAxis() + ")")
        .transition().call(x.axis);
      sel.select('.y.axis')
        .attr("transform", "translate(" + y.positionAxis() + ")")
        .transition().call(y.axis);
    }
    data = that.stat(data);
    var bars = sel.select('.plot')
                  .selectAll('circle')
                  .data(data);
    // add canvas and svg functions.
    // bars.enter().append('rect')
    //     .attr('class', 'geom-bar');    
    // sel is svg, data is array of objects


  }
  return draw;
};

Point.prototype.defaultStat = function() {
  return new ggd3.stats.identity();
};

ggd3.geoms.point = Point;
