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
  var layer     = this.layer(),
      position  = layer.position(),
      plot      = layer.plot(),
      stat      = layer.stat(),
      facet     = plot.facet(),
      margins   = plot.margins(),
      aes       = layer.aes(),
      fill      = d3.functor(this.fill() || plot.fill()),
      size      = d3.functor(this.size() || plot.size()),
      alpha     = d3.functor(this.alpha() || plot.alpha()),
      color     = d3.functor(this.color() || plot.color()),
      that      = this,
      nest      = layer.geomNest(),
      geom      = d3.superformula()
               .segments(20)
               .type(function(d) { return shape(d[aes.shape]); })
               .size(function(d) { return size(d[aes.size]); });
  function draw(sel, data, i, layerNum) {
    // geom bar allows only one scale out of group, fill, and color.
    // that is, one can be an ordinal scale, but the others must be
    // constants

    var id = (facet.type() === "grid" || 
              facet.scales()==="fixed") ? "single":sel.attr('id'),
        x = plot.xScale()[id],
        y = plot.yScale()[id];


    // drawing axes goes here because they may be dependent on facet id
    if(layerNum === 0){
      sel.select('.x.axis')
        .attr("transform", "translate(" + x.positionAxis() + ")")
        .transition().call(x.axis);
      sel.select('.y.axis')
        .attr("transform", "translate(" + y.positionAxis() + ")")
        .transition().call(y.axis);
    }

    ggd3.tools.removeElements(sel, layerNum, "rect");
    data.data = _.flatten(_.map(nest.entries(data.data), function(d) {
      return stat.compute(d);
    }));
    console.log(data);

    var bars = sel.select('.plot')
                  .selectAll('.geom-' + layerNum)
                  .data(data.data);
    // add canvas and svg functions.
    // update
    bars
      .attr('class', 'geom g' + layerNum + ' geom-bar');
    
    // enter
    bars.enter().append('rect')
        .attr('class', 'geom g' + layerNum + ' geom-bar');
    // sel is svg, data is array of objects
    // exit
    bars.exit()
      .transition()
      .style('opacity', 0)
      .remove();


  }
  return draw;
};

Bar.prototype.defaultStat = function() {
  return new ggd3.stats.count();
};

ggd3.geoms.bar = Bar;
