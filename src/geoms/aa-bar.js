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
    lineWidth: 0,
    offset: 'zero',
    groupRange: 0,
    stackRange: 0,
  };

  this.attributes = merge(this.attributes, attributes);

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
  var keys = unique(flatten(data.map(function(d) {
    return d.values.map(function(e) {
      return e[v];
    });
  })));
  // get an example object and set it's values to null;
  var filler = clone(data[0].values[0]);
  for(var k in filler){
    filler[k] = null;
  }
  data.forEach(function(d) {
    var dkey, missing;
    dkeys = pluck(d.values, v);
    missing = compact(keys.filter(function(k) {
      return !contains(dkeys, k);
    }));
    if(missing.length !== 0) {
      missing.forEach(function(m) {
        // must fill other values, too.
        var e = clone(filler);
        e[v] = m;
        d.values.push(e);
      });
    }
    d.values = merge_sort(d.values, v);
  });

  return data;
};

Bar.prototype.domain = function(data, a) {
  var s = this.setup(),
      valueVar = s.aes[a] ? s.aes[a]: "n. observations",
      group, stackby,
      groupRange, stackRange,
      grouped;
  if(!contains(linearScales, s.plot[a + "Scale"]().single.type())) {
    var domain = unique(pluck(data, s.aes[a])).sort();
    return domain;
  }
  group = s.aes.fill || s.aes.color || s.aes.group;
  stackby = a === "x" ? s.aes.y: s.aes.x;

  grouped = d3.nest()
              .key(function(d) {
                return d[stackby];
              })
              .entries(data);

  stackRange = grouped.map(function(d) {
    return d.values.reduce(function(a, b) {
      return a[valueVar] + b[valueVar];
    });
  });
  stackRange = d3.extent(stackRange);
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
  return (s.plot.xScale().single.type() === "ordinal" ||
                      s.aes.y === "binHeight");
};

Bar.prototype.draw = function(sel, data, i, layerNum) {

  var s     = this.setup(),
      that  = this,
      o, // original value or ordinal scale
      n, // numeric agg scale
      rb, // final range band
      o2, // used to calculate rangeband if histogram
      valueVar, // holds aggregated name
      categoryVar, // name of bar positions
      // original subscale
      pSub = s.plot.subScale().single.scale(),
      // secondary ordinal scale to calc dodged rangebands
      sub,
      drawX     = this.drawX(),
      drawY     = this.drawY(),
      vertical = this.vertical(s);

  if(contains(['wiggle', 'silhouette'], that.offset()) ){
    var parentSVG = d3.select(sel.node().parentNode.parentNode);
    if(vertical){
      // x is bars, don't draw Y axis
      drawY = false;
      parentSVG.select('.y.axis')
        .selectAll('*')
        .transition()
        .style('opacity', 0)
        .remove();
    } else {
      // y is ordinal, don't draw X.
      drawX = false;
      parentSVG.select('.x.axis')
        .selectAll('*')
        .transition()
        .style('opacity', 0)
        .remove();
    }
  }
  // gotta do something to reset domains if offset is expand
  if(that.offset() === "expand"){
    var k;
    if(vertical){
      for (k in s.plot.yScale()){
        s.plot.yScale()[k].domain([-0.02,1.02]);
      }
    } else {
      for (k in s.plot.xScale()){
        s.plot.xScale()[k].domain([-0.02,1.02]);
      }
    }
  }

  var scales = that.scalesAxes(sel, s, data.selector, 
                               layerNum,
                               drawX, drawY);
  // scales are drawn by now. return if no data.
  if(!data.data.length){ return false; }

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
  if(!s.group){
    s.group = s.aes[size.p];
  }
  s.groups = unique(pluck(data.data, s.group));

  data = this.unNest(data.data);
  // data must be nested to go into stack algorithm
  if(s.group){
    data = d3.nest().key(function(d) { return d[s.group];})
              .entries(data);
  } else {
    data = [{key: 'single',values: data}];
  }

  // with histograms, if a bin is empty, it's key comes
  // back 'undefined'. This causes bars to be drawn
  // from the top (or right). They should be removed
  data = data.filter(function(d) { 
    return d.key !== "undefined" ;});
  if(this.name() === "bar"){
    rb = o.rangeBand();
    valueVar = s.aes[size.p] || "n. observations";
    categoryVar = s.aes[width.p];
  } else if(this.name() === "histogram"){
    valueVar = "binHeight";
    categoryVar = s.group;
    if(vertical){
      rb = o(o.domain()[0] + data[0].values[0].dx );
    } else {
      rb = o(o.domain()[1] - data[0].values[0].dx );
    }
  }
  if(s.grouped && 
     contains([s.aes.x, s.aes.y], s.group)){
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
  data = stack(data).map(function(d) {
                            return d.values ? d.values: [];
                          });

  data = flatten(data, this.name() === 'bar' ? true:false);

  data = data.filter(function(d) {
    var isnull = any([d[s.aes[width.p]], d[s.group]], function(x) {
      return (x === null) || (x === undefined);
    });
    return !isnull;
  });

  if(s.position === 'dodge' && this.name() === 'bar') {
    // make ordinal scale for group
    sub = d3.scale.ordinal()
            .domain(pSub.domain());
    var rrb = pSub.rangeExtent();
    rb = [];
    rb[0] = typeof this.subRangeBand() ==='number' ? this.subRangeBand(): s.plot.subRangeBand();
    rb[1] = typeof this.subRangePadding() ==='number' ? this.subRangePadding(): s.plot.subRangePadding();
    sub.rangeRoundBands(rrb, rb[0], rb[1]);
    rb = sub.rangeBand();
  } else {
    sub = function(d) {
      return 0;
    };
  }
  // dodge histograms require a secondary scale on a numeric axis
  if(this.name() === "histogram" && s.position === "dodge"){
    sub = d3.scale.ordinal()
            .domain(this.collectGroups())
            .rangeRoundBands([0, rb], 0, 0);
    rb = sub.rangeBand();
  }
  
  var placeBar = (function() {
    if(that.name() === "bar" || vertical){
      return function(d) {
        var p = o(d[s.aes[width.p]]);
        p += sub(d[s.group]) || 0;
        return p || 0;};
    } else {
      return function(d) {
        var p = o(d[s.aes[width.p]]) - rb;
        p += sub(d[s.group]) || 0;
        return p || 0;
        };
    }
  })();

  // I think this is unnecessary.
  var calcSizeS = (function() {
    if(s.position === 'stack' && size.p === "y"){
      return function(d) {
        return Math.abs(n(0) - n(d.y));
      };
    }
    if(s.position === "stack"){
      return function(d) {
        return Math.abs(n(d.y) - n(0));
      };
    }
    if(s.position === "dodge" && size.p === "y"){
      return function(d) {
        return Math.abs(n(0) - n(d.y)); 
      };
    }
    return function(d) {
      return Math.abs(n(d[valueVar]) - n(0)); 
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
        return d3.min([n(d.y), n(0)]);
      };
    }
    return function(d) {
      return d3.min([n(0), n(d.y)]);
    };
  } )();

  var matched = this.merge_variables(Object.keys(data[0]));
  var data_matcher = this.data_matcher(matched).bind(this);
  var bars = sel.selectAll('rect.geom.g' + layerNum)
                .data(data, data_matcher),
      tt = ggd3.tooltip()
            .content(this.tooltip())
            .geom(this);

  function draw(rect) {
    rect.attr('class', 'geom g' + layerNum + ' geom-bar')
      .attr(size.s, calcSizeS)
      .attr(width.s, rb)
      .attr(size.p, calcSizeP)
      .attr(width.p , placeBar || 0)
      .attr('value', function(d) { 
        return d[s.group] + "~" + d[s.aes[width.p]];
      })
      .attr('fill', s.fill)
      .attr('stroke', s.color)
      .attr('stroke-width', that.lineWidth())
      .attr('fill-opacity', s.alpha);
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
    .transition()
    .call(draw);

  bars.exit()
    .transition()
    .style('opacity', 0)
    .remove();
  bars.each(function(d) {
      tt.tooltip(d3.select(this));
    });
};

ggd3.geoms.bar = Bar;
