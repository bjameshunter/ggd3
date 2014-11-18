// 
function Bar(spec) {
  var attributes = {
    name: "bar",
  };

  this.attributes = _.merge(attributes, this.attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
}

Bar.prototype = new Geom();

Bar.prototype.draw = function() {
  // bar takes an array of data, 
  // nests by a required ordinal axis, optional color and group
  // variables then calculates the stat and draws
  // horizontal or vertical bars.
  // stacked, grouped, expanded or not.
  // scales first need to be calculated according to output
  // of the stat. 
  var layer = this.layer(),
      stat = layer.stat(),
      plot = layer.plot(),
      facet = plot.facet(),
      margins = plot.margins(),
      aes = layer.aes(),
      that = this;
  function draw(sel, data, i, layerNum) {
    // each facet gets it's own axes and scales, regardless,
    // but for grid and fixed, only 'single' is used to draw
    // because some facets may not have data in them.
    // this ensures axes are drawn on the right and top/bottom
    // for grid
    var id = (facet.type() === "grid" || 
              facet.scales()==="fixed") ? "single":sel.attr('id'),
        x = plot.xScale()[id],
        y = plot.yScale()[id];
    // drawing and positioning axes probably shouldn't be on
    // the geom
    // but here, we're drawing
    data = stat.compute(data);
    if(layerNum === 0){
      sel.select('.x.axis')
        .attr("transform", "translate(" + x.positionAxis() + ")")
        .transition().call(x.axis);
      sel.select('.y.axis')
        .attr("transform", "translate(" + y.positionAxis() + ")")
        .transition().call(y.axis);
    }
    var bars = sel.select('.plot')
                  .selectAll('.geom-' + layerNum)
                  .data(data);
    // add canvas and svg functions.

    bars.enter().append('rect')
        .attr('class', 'geom-' + layerNum + ' geom-bar');    
    // sel is svg, data is array of objects
    bars.exit()
      .transition().remove();


  }
  return draw;
};

Bar.prototype.defaultStat = function() {
  return new ggd3.stats.count();
};

ggd3.geoms.bar = Bar;
