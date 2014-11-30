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

Bar.prototype.fillEmptyStackGroups = function(data, v) {
  // every object in data must have same length
  // array in its 'value' slot
  if(!data.length) { return data; }
  var keys = _.unique(_.flatten(_.map(data, function(d) {
    return _.map(d.values, function(e) {
      return e[v];
    });
  })));
  // get an example object and set it's values to null;
  var filler = _.clone(data[0].values[0]);
  _.mapValues(filler, function(v,k) {
    filler[k] = null;
  });
  _.each(data, function(d) {
    var dkey, missing;
    dkeys = _.map(d.values, function(e) { return e[v]; });
    missing = _.compact(_.filter(keys, function(k) {
      return !_.contains(dkeys, k);
    }));
    if(!_.isEmpty(missing)) {
      _.each(missing, function(m) {
        // must fill other values, too.
        var e = _.clone(filler);
        e[v] = m;
        d.values.push(e);
      });
    }
    d.values = _.sortBy(d.values, function(e) {
      return e[v];
    });
  });

  return data;
};

Bar.prototype.domain = function(data, a) {

  var s = this.setup(),
      valueVar = s.aes[a] ? s.aes[a]: "n. observations",
      group, stackby,
      groupSum, stackSum,
      grouped;

  group = s.aes.fill || s.aes.color || s.aes.group;
  stackby = a === "x" ? s.aes.y: s.aes.x;

  grouped = _.groupBy(data, function(d) {
    return d[stackby];
  });

  stackSum = _.mapValues(grouped, function(v, k) {
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
  return s.position === "stack" ? stackSum: groupSum;
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

    // o2 is second scale used
    // to derive width of histogram bars.
    var o, // original value or ordinal scale
        n, // numeric agg scale
        rb, // final range band
        o2, // used to calculate rangeband if histogram
        valueVar, // holds aggregated name
        categoryVar, // name of bar positions
        // secondary ordinal scale to calc dodged rangebands
        groupOrd  = d3.scale.ordinal(),
        drawX     = true,
        drawY     = true,
        verticalBars = (s.plot.xScale().single.scaleType() === "ordinal" ||
                        s.aes.y === "binHeight");

    if(_.contains(['wiggle', 'silhouette'], that.offset()) ){
      if(verticalBars){
        // x is bars, don't draw Y axis
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
      if(verticalBars){
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
    // scales are drawn by now. return if no data.
    if(!data.data.length){ return false; }
    data = data.data;


    // prep scales for vertical or horizontal use.
    // "o" is ordinal, "n" is numeric
    // width refers to scale defining rangeband of bars
    // size refers to scale defining its length along numeric axis
    // s and p on those objects are for size and position, respectively.
    // need to use this for histograms too, but it's going to be
    // tricky
    if(!verticalBars){
      // horizontal bars
      o = scales.y;
      n = scales.x;
      size = {s: "width", p:'x'};
      width = {s:"height", p: 'y'};
    } else {
      // vertical bars
      o = scales.x;
      n = scales.y;
      size = {s: "height", p: 'y'};
      width = {s: "width", p: 'x'};
    }

    s.nest.rollup(function(data) {
      return s.stat.compute(data);
    });

    ggd3.tools.removeElements(sel, layerNum, "rect");

    // calculate stat
    data = that.rollup(data, s);
    s.groups = _.pluck(data, 'key');

    data = ggd3.tools.unNest(data);
    data = d3.nest().key(function(d) { return d[s.group];})
              .entries(data);
    data = _.filter(data, function(d) { 
      return d.key !== "undefined" ;});
    if(that.name() === "bar"){
      rb = o.scale().rangeBand();
      valueVar = s.aes[size.p] || "n. observations";
      categoryVar = s.aes[width.p];
    } else if(that.name() === "histogram"){
      valueVar = "binHeight";
      categoryVar = s.group;
      o2 = d3.scale.ordinal()
              .rangeRoundBands(o.range(), 0, 0)
              .domain(that.bins());
      rb = o2.rangeBand();
      if(rb < 2) {
        rb = 2;
      }
    }
    if(s.grouped && !_.contains([s.aes.x, s.aes.y], s.group)){

    }
    data = that.fillEmptyStackGroups(data, categoryVar);
    var stack = d3.layout.stack()
                  .x(function(d) { return d[categoryVar]; })
                  .y(function(d) {
                    return d[valueVar]; })
                  .offset(that.offset())
                  .values(function(d) { 
                    return d.values; });
    data = _.map(stack(data),
                            function(d) {
                              return d.values ? d.values: [];
                            });
    data = _.flatten(data, 
                     that.name() === "histogram" ? true:false);
    if(s.position === 'dodge') {
      // make ordinal scale for group
      groupOrd.rangeBands([0, rb], 0, 0)
              .domain(s.groups);
      rb = groupOrd.rangeBand();
    }
    if(s.position !== "dodge"){
      groupOrd = function(d) {
        return 0;
      };
    }
    
    var placeBar = function(d) {
      var p = o.scale()(d[s.aes[width.p]]);
      p += groupOrd(d[s.group]) || 0;
      return p || 0;
    };

    // I think this is unnecessary.
    var calcSizeS = (function() {
      if(s.position === 'stack' && size.p === "y"){
        return function(d) {
          return n.scale()(0) - n.scale()(d.y);
        };
      }
      if(s.position === "stack"){
        return function(d) {
          return n.scale()(d.y) - n.scale()(0);
        };
      }
      if(s.position === "dodge" && size.p === "y"){
        return function(d) {
          return n.scale()(0) - n.scale()(d.y); 
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
        .attr(width.p , placeBar || 0)
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
        return n.scale()(0);
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
