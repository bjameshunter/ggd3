// 
function Bar(spec) {
  if(!(this instanceof Geom)){
    return new Bar(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "bar",
    stat: "count",
    position: "dodge",
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
  var s     = this.setup(),
      that  = this;

  function draw(sel, data, i, layerNum) {

    var o, n, rb, 
        valueVar,
        groupOrd  = d3.scale.ordinal(),
        drawX     = true,
        drawY     = true;

    if(_.contains(['wiggle', 'silhouette'], that.offset()) ){
      if(s.plot.xScale().single.scaleType() === "ordinal"){
        // x is ordinal, don't draw Y axis
        drawY = false;
        sel.select('.y.axis')
          .selectAll('*')
          .transition()
          .style('opacity', 0)
          .remove();
      } else {
        // y is ordinal, don't draw X.
        drawX = false;
        sel.select('.x.axis')
          .selectAll('*')
          .transition()
          .style('opacity', 0)
          .remove();
      }
    }
    // gotta do something to reset domains if offset is expand
    if(that.offset() === "expand"){
      if(s.plot.xScale().single.scaleType() === "ordinal"){
        _.mapValues(s.plot.yScale(), function(v, k) {
          v.domain([0,1]);
        });
      } else {
        _.mapValues(s.plot.xScale(), function(v, k) {
          v.domain([0,1]);
        });  
      }
    }


    var scales = that.scalesAxes(sel, s, data.selector, layerNum,
                                 drawX, drawY);
    data = data.data;


    // prep scales for vertical or horizontal use.
    // "o" is ordinal, "n" is numeric
    // width refers to scale defining rangeband of bars
    // size refers to scale defining its length along numeric axis
    // s and p on those objects are for size and position, respectively.
    if(scales.y.scaleType() === 'ordinal'){
      o = scales.y;
      n = scales.x;
      size = {s: "width", p:'x'};
      width = {s:"height", p: 'y'};
    } else {
      o = scales.x;
      n = scales.y;
      size = {s: "height", p: 'y'};
      width = {s: "width", p: 'x'};
    }


    s.nest.rollup(function(data) {
      return s.stat.compute(data);
    });
    rb = o.scale().rangeBand();
    valueVar = s.aes[size.p] || "n. observations";

    // some warnings about nesting with bars
    if(s.aes.fill && s.aes.group){
      console.warn("Doesn't make a lot of sense with bars to set" +
                   " aes.fill and aes.group. That's too many groupings." +
                   " Maybe write a custom geom and specify fewer aesthetics.");
    }

    ggd3.tools.removeElements(sel, layerNum, "rect");

    if(data.length){
      // calculate stat
      data = s.nest.entries(data);
      // get back to array so we can nest for stack
      data = ggd3.tools.unNest(data);
      // nest so we can pass to stack
      // but not necessary if we have no group
      if(s.group !== s.aes[width.p]){
        data = d3.nest().key(function(d) { return d[s.group];})
                  .entries(data);
        s.groups = _.pluck(data, 'key');
        // stack layout requires all layers have same # of groups
        // and sort each layer by group;
        data = ggd3.tools.fillEmptyStackGroups(data, s.aes[width.p]);
        var stack = d3.layout.stack()
                      .x(function(d) { return d[s.aes[width.p]]; })
                      .y(function(d) {
                        return d[valueVar]; })
                      .offset(that.offset())
                      .values(function(d) { 
                        return d.values; });
        data = _.flatten(_.map(stack(data),
                              function(d) {
                                return d.values ? d.values: [];
                              }));
        if(s.position === 'dodge') {
          // make ordinal scale for group
          groupOrd.rangeRoundBands([0, rb])
                  .domain(s.groups);
          rb = groupOrd.rangeBand();
        }
        if(s.position !== "dodge"){
          groupOrd = function(d) {
            return 0;
          };
        }
      }
    }

    var placeBar = function(d) {
      var p = o.scale()(d[s.aes[width.p]]);
      p += groupOrd(d[s.group]);
      return p;
    };

    // I think this is unnecessary.
    var calcSizeS = (function() {
      if(s.position === 'stack' && size.p === "y"){
        return function(d) {
          return s.dim.y - n.scale()(d.y);
        };
      }
      if(s.position === "stack"){
        return function(d) {
          return n.scale()(d.y);
        };
      }
      if(s.position === "dodge" && size.p === "y"){
        return function(d) {
          return s.dim.y - n.scale()(d.y); 
        };
      }
      return function(d) {
        return n.scale()(d[valueVar]); 
      };
    })();
    var calcSizeP = (function () {
      if(s.position === "stack" && size.p === "y"){
        return function(d) { 
          return n.scale()(d.y0 + d.y); 
          };
      }
      if(s.position === "stack"){
        return function(d) {
          return n.scale()(d.y0);
        };
      }
      if(s.position === "dodge" && size.p === "y") {
        return function(d) {
          return n.scale()(d.y);
        };
      }
      return function(d) {
        return 0;
      };
    } )();


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
        .style('fill-opacity', s.alpha)
        .attr('fill', s.fill)
        .style('stroke', s.color)
        .style('stroke-width', that.lineWidth())
        .attr('value', function(d) { 
          return d[s.group] + "~" + d[s.aes[width.p]];
        });
    }

    bars.transition().call(drawBar);
    
    bars.enter()
      .append('rect')
      .style('fill-opacity', s.alpha)
      .attr('fill', s.fill)
      .style('stroke', s.color)
      .style('stroke-width', that.lineWidth())
      .attr(width.s, rb)
      .attr(width.p, placeBar)
      .attr(size.s, 0)
      .attr(size.p, function(d) {
        return size.p === "y" ? s.dim.y: 0;
      })
      .transition()
      .call(drawBar);

    bars.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }
  return draw;
};

ggd3.geoms.bar = Bar;
