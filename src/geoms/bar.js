// 
function Bar(spec) {
  if(!(this instanceof Geom)){
    return new Bar(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "bar",
    stat: "count",
    position: null,
    lineWidth: 1,
    offset: 'zero',
    groupSum: 0,
    stackSum: 0,
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Bar.prototype = new Geom();

Bar.prototype.constructor = Bar;

Bar.prototype.domain = function(data, a) {
  // data passed here have been computed and 
  // separated by facet if not fixed.
  // all that is required is the stacked or dodged
  // values
  var layer = this.layer(),
      plot = layer.plot(),
      aes = layer.aes(),
      position = layer.position() || this.position(),
      valueVar = aes[a] ? aes[a]: "n. observations",
      group, ord,
      groupSum, stackSum;

  // I need the ordinal axis variable
  // and group axis variable to do this.
  group = aes.fill || aes.color || aes.group;
  ord = a === "x" ? aes.y: aes.x;
  stackSum = _.mapValues(_.groupBy(data, function(d) {
    return d[ord];
  }), function(v, k) {
    return _.reduce(_.pluck(v, valueVar), function(a,b) {
      return a + b;
    });
  });
  stackSum = d3.extent(_.map(stackSum, function(v, k) { return v; }));
  groupSum = d3.extent(data, function(d) {
    return d[valueVar];
  });
  this.stackSum(stackSum);
  this.groupSum(groupSum);

  stackSum[0] = 0;
  groupSum[0] = 0;
  stackSum[1] *= 1.1;
  groupSum[1] *= 1.1;
  return position === "stack" ? stackSum: groupSum;
};

Bar.prototype.draw = function() {
  // bar takes an array of data, 
  // nests by a required ordinal axis, optional color and group
  // variables then calculates the stat and draws
  // horizontal or vertical bars.
  // stacked, grouped, expanded or not.
  // scales first need to be calculated according to output
  // of the stat. 
  var layer     = this.layer(),
      position  = layer.position() || this.position(),
      plot      = layer.plot(),
      that      = this,
      stat      = layer.stat(),
      nest      = layer.geomNest(),
      dim       = plot.plotDim(),
      facet     = plot.facet(),
      margins   = plot.margins(),
      aes       = layer.aes(),
      fill      = d3.functor(this.fill() || plot.fill()),
      size      = d3.functor(this.size() || plot.size()),
      alpha     = d3.functor(this.alpha() || plot.alpha()),
      color     = d3.functor(this.color() || plot.color()),
      geom      = d3.superformula()
               .segments(20)
               .type(function(d) { return shape(d[aes.shape]); })
               .size(function(d) { return size(d[aes.size]); }),
      grouped   = false,
      group;
      if(aes.fill) {
        grouped = true;
        group = aes.fill;
      } else if(aes.color){
        grouped = true;
        group = aes.color;
      } else if(aes.group){
        grouped = true;
        group = aes.group;
      }

  function draw(sel, data, i, layerNum) {
    // geom bar allows only one scale out of group, fill, and color.
    // that is, one can be an ordinal scale, but the others must be
    // constants

    // choose axis
    var x, y, o, n, rb, 
        xaxis, yaxis, 
        xfree, yfree,
        stackMax, groupMax,
        valueVar,
        groups, // array holding unique group elements
        groupOrd = d3.scale.ordinal();
    if(!_.contains(["free", "free_x"], facet.scales()) || 
       _.isUndefined(plot.xScale()[data.selector])){
      x = plot.xScale().single;
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

    // work with this to get bars going top to bottom or right to left
    // y.scale().domain().reverse();
    // x.scale().domain().reverse();
    // y.scale().range().reverse();
    // x.scale().range().reverse();
    // for bars, one scale will be ordinal, one will not
    data = data.data;


    // prep scales for vertical or horizontal use.
    // "o" is ordinal, "n" is numeric
    // width refers to scale defining rangeband of bars
    // size refers to scale defining its length along numeric axis
    // s and p on those objects are for size and position, respectively.
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
    if(that.offset() === "expand"){
      n.domain([0, 1]);
    }


    // console.log(stat.y());
    nest.rollup(function(data) {
      return stat.compute(data);
    });
    rb = o.scale().rangeBand();
    valueVar = aes[size.p] || "n. observations";

    // some warnings about nesting with bars
    if(aes.fill && aes.group){
      console.warn("Doesn't make a lot of sense with bars to set" +
                   " aes.fill and aes.group. That's too many groupings." +
                   " Maybe write a custom geom and specify fewer aesthetics.");
    }

    ggd3.tools.removeElements(sel, layerNum, "rect");

    if(data.length){
      // calculate stat
      data = nest.entries(data);
      // get back to array so we can nest for stack
      data = ggd3.tools.unNest(data);
      // nest so we can pass to stack
      // but not necessary if we have no group
      if(group !== aes[width.p]){
        data = d3.nest().key(function(d) { return d[group];})
                  .entries(data);
        groups = _.pluck(data, 'key');
        // stack layout requires all layers have same # of groups
        // and sort each layer by group;
        data = ggd3.tools.fillEmptyStackGroups(data, aes[width.p]);
        var stack = d3.layout.stack()
                      .x(function(d) { return d[aes[width.p]]; })
                      .y(function(d) {
                        return d[valueVar]; })
                      .offset(that.offset())
                      .values(function(d) { 
                        return d.values; });
        data = _.flatten(_.map(stack(data),
                              function(d) {
                                return d.values ? d.values: [];
                              }));
        if(position === 'dodge') {
          // make ordinal scale for group
          groupOrd.rangeRoundBands([0, rb])
                  .domain(groups);
          rb = groupOrd.rangeBand();
        }
        if(position !== "dodge"){
          groupOrd = function(d) {
            return 0;
          };
        }
      }
    }

    var placeBar = function(d) {
      var p = o.scale()(d[aes[width.p]]);
      p += groupOrd(d[group]);
      return p;
    };

    // I think this is unnecessary.
    var calcSizeS = (function() {
      if(position === 'stack' && size.p === "y"){
        return function(d) {
          return dim.y - n.scale()(d[valueVar]);
        };
      }
      if(position === "stack"){
        return function(d) {
          return n.scale()(d[valueVar]);
        };
      }
      if(position === "dodge" && size.p === "y"){
        return function(d) {
          return dim.y - n.scale()(d[valueVar]); 
        };
      }
      return function(d) {
        return n.scale()(d[valueVar]); 
      };
    })();
    var calcSizeP = (function () {
      if(position === "stack" && size.p === "y"){
        return function(d) { 
          return n.scale()(d.y0 + d[valueVar]); 
          };
      }
      if(position === "stack"){
        return function(d) {
          return n.scale()(d.y0);
        };
      }
      if(position === "dodge" && size.p === "y") {
        return function(d) {
          return n.scale()(d[valueVar]);
        };
      }
      return function(d) {
        return 0;
      };
    } ) ();

    // drawing axes goes in geom because they may be dependent on facet id
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


    var bars = sel.select('.plot')
                  .selectAll('rect.geom.g' + layerNum)
                  .data(data);
    // add canvas and svg functions.
    function drawBar(rect) {
      rect.attr('class', 'geom g' + layerNum + ' geom-bar')
        .attr(size.s, calcSizeS)
        .attr(width.s, rb)
        .attr(size.p, calcSizeP)
        .attr(width.p , placeBar)
        .style('fill-opacity', alpha)
        .attr('fill', fill)
        .style('stroke', color)
        .style('stroke-width', that.lineWidth())
        .attr('value', function(d) { 
          return d[group] + "~" + d[aes[width.p]];
        });
    }

    bars.transition().call(drawBar);
    
    bars.enter().append('rect').call(drawBar);

    bars.exit()
      .transition()
      .style('opacity', 0)
      .remove();


  }
  return draw;
};

ggd3.geoms.bar = Bar;
