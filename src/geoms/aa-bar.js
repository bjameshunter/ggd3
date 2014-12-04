// 
function Bar(spec) {
  if(!(this instanceof Geom)){
    return new Bar(spec);
  }
  
  Geom.apply(this);
  var attributes = {
    name: "bar",
    stat: "count",
    geom: "rect",
    position: "dodge",
    lineWidth: 1,
    offset: 'zero',
    groupRange: 0,
    stackRange: 0,
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
  // this should be usable for histograms as well
  // but currently is not.
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
      groupRange, stackRange,
      grouped;
  if(!_.contains(linearScales, s.plot[a + "Scale"]().single.scaleType())) {
    var domain = _.sortBy(_.unique(_.pluck(data, s.aes[a])));
    return domain;
  }
  group = s.aes.fill || s.aes.color || s.aes.group;
  stackby = a === "x" ? s.aes.y: s.aes.x;

  grouped = _.groupBy(data, function(d) {
    return d[stackby];
  });

  stackRange = _.mapValues(grouped, function(v, k) {
    return _.reduce(_.pluck(v, valueVar), function(a,b) {
      return a + b;
    });
  });
  stackRange = d3.extent(_.map(stackRange, 
                         function(v, k) { return v; }));
  groupRange = d3.extent(data, function(d) {
    return d[valueVar];
  });

  stackRange[0] = 0 - 0.1 * (stackRange[1] - stackRange[0]);
  groupRange[0] = 0 - 0.1 * (groupRange[1] - groupRange[0]);
  stackRange[1] *= 1.1;
  groupRange[1] *= 1.1;
  this.stackRange(stackRange);
  this.groupRange(groupRange);
  return s.position === "stack" ? stackRange: groupRange;
};

Bar.prototype.vertical = function(s){
  return (s.plot.xScale().single.scaleType() === "ordinal" ||
                      s.aes.y === "binHeight");
};

Bar.prototype.draw = function(sel, data, i, layerNum) {

  var s     = this.setup(),
      that  = this;

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
      vertical = this.vertical(s);

  if(_.contains(['wiggle', 'silhouette'], that.offset()) ){
    if(vertical){
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
    if(vertical){
      _.mapValues(s.plot.yScale(), function(v, k) {
        v.domain([-0.05,1.05]);
      });
    } else {
      _.mapValues(s.plot.xScale(), function(v, k) {
        v.domain([-0.05,1.05]);
      });  
    }
  }

  var scales = that.scalesAxes(sel, s, data.selector, 
                               layerNum,
                               drawX, drawY);
  // scales are drawn by now. return if no data.
  ggd3.tools.removeElements(sel, layerNum, "rect");
  if(!data.data.length){ return false; }

  data = data.data;


  // prep scales for vertical or horizontal use.
  // "o" is ordinal, "n" is numeric
  // width refers to scale defining rangeband of bars
  // size refers to scale defining its length along numeric axis
  // s and p on those objects are for size and position, respectively.
  // need to use this for histograms too, but it's going to be
  // tricky
  if(vertical){
    // vertical bars
    o = scales.x.scale();
    n = scales.y.scale();
    size = {s: "height", p: 'y'};
    width = {s: "width", p: 'x'};
  } else {
    // horizontal bars
    o = scales.y.scale();
    n = scales.x.scale();
    size = {s: "width", p:'x'};
    width = {s:"height", p: 'y'};
  }


  // calculate stat
  // but why isn't this already done since 
  // we've trained domains?
  data = this.compute(data, s);
  s.groups = _.pluck(data, 'key');

  data = this.unNest(data);
  // data must be nested to go into stack algorithm
  if(s.group){
    data = d3.nest().key(function(d) { return d[s.group];})
              .entries(data);
  } else {
    data = [{key: 'single',values:data}];
  }

  // with histograms, if a bin is empty, it's key comes
  // back 'undefined'. This causes bars to be drawn
  // from the top (or right). They should be removed
  data = _.filter(data, function(d) { 
    return d.key !== "undefined" ;});
  if(this.name() === "bar"){
    rb = o.rangeBand();
    valueVar = s.aes[size.p] || "n. observations";
    categoryVar = s.aes[width.p];
  } else if(that.name() === "histogram"){
    valueVar = "binHeight";
    categoryVar = s.group;
    if(vertical){
      rb = o(o.domain()[0] + data[0].values[0].dx );
    } else {
      rb = o(o.domain()[1] - data[0].values[0].dx );
    }
  }
  if(s.grouped && 
     _.contains([s.aes.x, s.aes.y], s.group)){
    console.log('grouping is already shown by facets' +
                ' unnecessary color scales probably generated');
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
  
  var placeBar = (function() {
    if(that.name() === "bar" || vertical){
      return function(d) {
        var p = o(d[s.aes[width.p]]);
        p += groupOrd(d[s.group]) || 0;
        return p || 0;};
    } else {
      return function(d) {
        var p = o(d[s.aes[width.p]]) - rb;
        p += groupOrd(d[s.group]) || 0;
        return p || 0;
        };
    }
  })();

  // I think this is unnecessary.
  var calcSizeS = (function() {
    if(s.position === 'stack' && size.p === "y"){
      return function(d) {
        return n(0) - n(d.y);
      };
    }
    if(s.position === "stack"){
      return function(d) {
        return n(d.y) - n(0);
      };
    }
    if(s.position === "dodge" && size.p === "y"){
      return function(d) {
        return n(0) - n(d.y); 
      };
    }
    return function(d) {
      return n(d[valueVar]) - n(0); 
    };
  })();
  var calcSizeP = (function () {
    if(s.position === "stack" && size.p === "y"){
      return function(d) { 
        return n(d.y0 + d.y); 
        };
    }
    if(s.position === "stack"){
      return function(d) {
        return n(d.y0);
      };
    }
    if(s.position === "dodge" && size.p === "y") {
      return function(d) {
        return n(d.y);
      };
    }
    return function(d) {
      return n(0);
    };
  } )();


  var bars = sel.select('.plot')
                .selectAll('rect.geom.g' + layerNum)
                .data(data),
      tt = ggd3.tooltip()
            .content(this.tooltip())
            .geom(this);
  // add canvas and svg functions.
  function draw(rect) {
    rect.attr('class', 'geom g' + layerNum + ' geom-bar')
      .attr(size.s, calcSizeS)
      .attr(width.s, rb)
      .attr(size.p, calcSizeP)
      .attr(width.p , placeBar || 0)
      .attr('value', function(d) { 
        return d[s.group] + "~" + d[s.aes[width.p]];
      })
      .style({
        fill: s.fill,
        stroke: s.color,
        'fill-opacity': s.alpha,
        'stroke-width': that.lineWidth()
      });
  }

  bars.transition().call(draw)
    .each(function(d) {
      tt.tooltip(d3.select(this));
    });
  
  bars.enter()
    .append(this.geom())
    .attr(width.s, rb)
    .attr(width.p, placeBar)
    .attr(size.s, 0)
    .attr(size.p, function(d) {
      return n(0);
    })
    .style({
      fill: s.fill,
      stroke: s.color,
      'fill-opacity': s.alpha,
      'stroke-width': that.lineWidth()
    })
    .transition()
    .call(draw)
    .each(function(d) {
      tt.tooltip(d3.select(this));
    });

  bars.exit()
    .transition()
    .style('opacity', 0)
    .remove();
};

ggd3.geoms.bar = Bar;
