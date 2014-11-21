// 
function Bar(spec) {
  var attributes = {
    name: "bar",
    stat: "count",
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Bar.prototype = new Geom();

// Bar.prototype.constructor = Bar;

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
      dim       = plot.plotDim(),
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

    // choose axis
    var x, y, rb, xaxis, yaxis;
    if(!_.contains(["free", "free_x"], facet.scales()) || 
       _.isUndefined(plot.xScale()[data.selector])){
      x = plot.xScale().single;
    } else {
      x = plot.xScale()[data.selector];
    }
    if(!_.contains(["free", "free_y"], facet.scales()) || 
       _.isUndefined(plot.xScale()[data.selector])){
      y = plot.yScale().single;
    } else {
      y = plot.yScale()[data.selector];
    }
    rb = x.scale().rangeBand();


    // drawing axes goes here because they may be dependent on facet id
    // if a facet has no data, therefore, no x or y, draw single
    // facet axis
    if(layerNum === 0){
      xaxis = sel.select('.x.axis');
      yaxis = sel.select('.y.axis');
      if(x) {
        xaxis.transition()
          .attr("transform", 
               "translate(" + x.positionAxis() + ")")
          .call(x.axis);
      } else {
        xaxis.transition()
          .attr("transform", 
               "translate(" + 
                  plot.xScale().single.positionAxis() + ")")
          .call(plot.xScale().single.axis);
      }
      if(y) {
        yaxis.transition()
          .attr("transform", 
               "translate(" + y.positionAxis() + ")")
          .call(plot.yScale().single.axis);
      } else {
        yaxis.transition()
          .attr("transform", 
               "translate(" + 
                  plot.yScale().single.positionAxis() + ")")
          .call(plot.yScale().single.axis);
      }
    }

    // some warnings about nesting with bars
    if(aes.fill && aes.group){
      console.warn("Doesn't make a lot of sense with bars to set" +
                   " aes.fill and aes.group. That's too many groupings." +
                   " Maybe write a custom geom and specify fewer aesthetics.");
    }

    ggd3.tools.removeElements(sel, layerNum, "rect");
    data.data = _.flatten(_.map(nest.entries(data.data), function(d) {
      return stat.compute(d);
    }));

    var bars = sel.select('.plot')
                  .selectAll('rect.geom.g' + layerNum)
                  // data should be matched according to ordinal
                  // axis and group/color/fill.
                  .data(data.data);
    // add canvas and svg functions.
    // update
    bars.transition()
      .attr('class', 'geom g' + layerNum + ' geom-bar')
        .attr('height', function(d) { return dim.y - y.scale()(d[aes.y || "count"]); })
        .attr('width', rb)
        .attr('y', function(d) { 
          return y.scale()(d[aes.y || "count"]); })
        .attr('x', function(d) { return x.scale()(d[aes.x]); })
        .attr('fill', function(d) { return fill(d[aes.fill]); });
    
    // enter
    bars.enter().append('rect')
        .attr('class', 'geom g' + layerNum + ' geom-bar')
        .attr('height', function(d) { return dim.y - y.scale()(d[aes.y || "count"]); })
        .attr('width', rb)
        .attr('y', function(d) { 
          return y.scale()(d[aes.y || "count"]); })
        .attr('x', function(d) { return x.scale()(d[aes.x]); })
        .attr('fill', function(d) { return fill(d[aes.fill]); });
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
  var stat = new ggd3.stats.count();
  return stat;
};

ggd3.geoms.bar = Bar;
