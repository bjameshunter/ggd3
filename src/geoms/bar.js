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
      nest      = layer.geomNest()
                      .rollup(_.bind(stat.compute, stat)),
      grouped   = aes.fill || aes.group || aes.color ? true:false,
      geom      = d3.superformula()
               .segments(20)
               .type(function(d) { return shape(d[aes.shape]); })
               .size(function(d) { return size(d[aes.size]); });
  function draw(sel, data, i, layerNum) {
    // geom bar allows only one scale out of group, fill, and color.
    // that is, one can be an ordinal scale, but the others must be
    // constants

    // choose axis
    var x, y, o, n, rb, xaxis, yaxis;
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
    // for bars, one scale will be ordinal, one will not
    if(y.scaleType() === 'ordinal'){
      o = y;
      n = x;
      size = {s: "width", p:'x'};
      width = {s:"height", p: 'y'};
    } else {
      o = x;
      n = y;
      size = {s: "height", p: 'y'};
      width = {s: "width", p: 'x'};
    }
    rb = o.scale().rangeBand();


    // drawing axes goes here because they may be dependent on facet id
    // if a facet has no data, therefore, no x or y, draw single
    // facet axis
    if(layerNum === 0){
      xaxis = sel.select('.x.axis');
      yaxis = sel.select('.y.axis');
      xaxis.transition()
        .attr("transform", 
             "translate(" + x.positionAxis() + ")")
        .call(x.axis);
      yaxis.transition()
        .attr("transform", 
             "translate(" + y.positionAxis() + ")")
        .call(y.axis);
    }

    // some warnings about nesting with bars
    if(aes.fill && aes.group){
      console.warn("Doesn't make a lot of sense with bars to set" +
                   " aes.fill and aes.group. That's too many groupings." +
                   " Maybe write a custom geom and specify fewer aesthetics.");
    }

    ggd3.tools.removeElements(sel, layerNum, "rect");
    console.log(data.data);

    var stack = d3.layout.stack()
                  .x(function(d) { return d.key; })
                  .y(function(d) {
                    if(grouped) {
                      return d.values[0][aes[size.p] || 'count'];
                    }
                    return d[aes[size.p] || "count"]; })
                  .values(function(d) { 
                    return d.values; });
    if(data.data.length){
      data.data = nest.entries(data.data);
      if(grouped) {
        data.data = ggd3.tools.fillEmptyStack(data.data);
      }
      data.data = _.flatten(_.map(stack(data.data),
                            function(d) {
                              return d.values ? d.values[0]: [];
                            }));
    }
    console.log(data.data);

    var bars = sel.select('.plot')
                  .selectAll('rect.geom.g' + layerNum)
                  .data(data.data);
    // add canvas and svg functions.

    bars.transition()
      .attr('class', 'geom g' + layerNum + ' geom-bar')
        .attr(size.s, function(d) { 
          if(size.p === "y") {
            return dim.y - n.scale()(d[aes[size.p] || "count"]); 
          } 
          return n.scale()(d[aes[size.p] || "count"]);
        })
        .attr(width.s, rb)
        .attr(size.p, function(d) { 
          if(size.p === "y") {
            return n.scale()(d.y); 
          } 
          return 0;
        })
        .attr(width.p, function(d) { return o.scale()(d[aes[width.p]]); })
        .attr('fill', function(d) { 
          return fill(d[aes.fill]); })
        .attr('fill-opacity', function(d) { 
          return alpha(d[aes.alpha]); });
    
    bars.enter().append('rect')
        .attr('class', 'geom g' + layerNum + ' geom-bar')
        .attr(size.s, function(d) { 
          if(size.p === "y") {
            return dim.y - n.scale()(d[aes[size.p] || "count"]); 
          } 
          return n.scale()(d[aes[size.p] || "count"]);
        })
        .attr(width.s, rb)
        .attr(size.p, function(d) { 
          if(size.p === "y") {
            return n.scale()(d.y); 
          } 
          return 0;
        })
        .attr(width.p , function(d) { return o.scale()(d[aes[width.p]]); })
        .attr('fill', function(d) { return fill(d[aes.fill]); })
        .attr('fill-opacity', function(d) { return alpha(d[aes.alpha]); });

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
