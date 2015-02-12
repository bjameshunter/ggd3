// 
function Histogram(spec) {
  if(!(this instanceof Geom)){
    return new Histogram(spec);
  }
  Bar.apply(this);
  var attributes = {
    name: "histogram",
    stat: "bin",
    position: "stack",
    bins: 30,
    breaks: null,
    frequency: true,
  };
  var r = function(d) { return ggd3.tools.round(d, 2);};
  this.attributes = merge(this.attributes, attributes);

  function tooltip(sel, opts) {
    var s = this.setup(),
        that = this,
        v = s.aes.y === "binHeight" ? s.aes.x: s.aes.y,
        c = s.aes.fill || s.aes.color;
    sel.each(function(d) {
        var el = d3.select(this);
        if(c) {
          el.append('h4')
            .text(c + ": ")
            .append('span')
            .text(d[c]);
        }
        el.append('h4')
          .text(v + ": " )
          .append("span").text(r(d[v]) + " - " + r(d[v]+d.dx));
        el.append('h4')
          .text("bin size: " )
          .append("span").text(r(d.binHeight));
        el.append('h4')
          .text("n: " )
          .append("span").text(d.length);
    });
  }
  this.attributes.tooltip = tooltip.bind(this);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Histogram.prototype = new Bar();
  
Histogram.prototype.constructor = Histogram;

// can't get histogram to match by relevent variables
Histogram.prototype.data_matcher = function(matches){
  return function(d, i) {
    // if(matches.length){
    //   // console.log(d[0]);
    //   return _.map(matches, function(m) {
    //     if(d.length > 0){
    //       // match from first element in bin array
    //       return d[0][m];
    //     }else {
    //       // no elements in this bin, skip
    //       return i;
    //     }
    //   }).join(' ');
    // } else {
      return i;
    // }
  };
};

Histogram.prototype.domain = function(data, v) {
  var s = this.setup(),
      group, stackby,
      groupSum, stackSum,
      grouped;

  if(s.aes[v] === "binHeight") {
    grouped = d3.nest()
                .key(function(d) {
                  return d.x;
                })
                .entries(data);
    stackSum = grouped.map(function(d) {
      return d.values.reduce(function(pre, val) {
        return val.y + pre;
      }, 0);
    });
    stackSum = d3.extent(stackSum.map(function(v, k) { return v; }));
    groupSum = d3.extent(data, function(d) {
      return d.y;
    });
    extent = s.position === "stack" ? stackSum: groupSum;
    range = extent[1] - extent[0];
    extent[0] -= 0.05*range;
  } else {
    extent = d3.extent(pluck(data, 'x'));
    range = extent[1] - extent[0];
    extent[0] -= 0.1*range;
  }
  // extent both ways to draw an empty chart, I guess
  if(range === 0){
    extent[0] -= 1;
    extent[1] += 1;
  }
  extent[1] += 0.1*range;
  return extent;
};

Histogram.prototype.compute = function(data, s) {
  // first get bins according to ungrouped data;
  if(!s.grouped) { 
    return s.nest.entries(data); 
  }
  this.breaks(this.bins());
  var unNested = s.stat.compute(data),
      breaks = pluck(unNested, "x");
  // this is the problem
  // there should be a 'fixed bins' flag
  this.breaks(breaks);
  return s.nest.entries(data);
};

Histogram.prototype.fillEmptyStackGroups = function(data, v) {

  var keys = unique(pluck(data, function(d) { return d.key; })),
      vals = unique(flatten(pluck(data, function(d) {
        return pluck(d.values, 'x');
      }))),
      empty = {};
  empty.y = 0;
  empty.binHeight = 0;
  empty.dx = data[0].dx;
  console.log(vals);
  data.forEach(function(d) {
    var dkeys, missing;
    dkeys = pluck(d.values, 'x');
    missing = compact(vals.filter(function(k) {
      return !contains(dkeys, k);
    }));
    if(missing.length !== 0) {
      missing.forEach(function(m) {
        // must fill other values, too.
        var e = clone(empty);
        e.x = m;
        d.values.push(e);
      });
    }
    d.values = d.values.sort(function(a, b) {
      return b.x - a.x;
    });
  });
  return data;
};
// geoms may want to be nested differently.
Histogram.prototype.nest = function() {
  // if stacking histograms, bins must be calculated
  // first on entire facet, then individually on
  // each stack layer. If facet.scales() === "fixed"
  // bins should be the same across facets. If not
  // the pre calculated bins need to be stored and 
  // referenced when calculating layers.
  // one call to goem histogram is going through 47 times.
  var aes = this.layer().aes(),
      plot = this.layer().plot(),
      nest = d3.nest(),
      dtypes = plot.dtypes(),
      nestVars = unique(compact([aes.group, aes.fill, aes.color]));

  nestVars.forEach(function(n) {
    if(dtypes[n][1] !== "many") {
      nest.key(function(d) { return d[n]; });
    }
  });
  ['x', 'y'].forEach(function(a) {
    if(plot[a + "Scale"]().single.type() === "ordinal"){
      nest.key(function(d) { return d[aes[a]]; });
    }
  });
  return nest;
};

ggd3.geoms.histogram = Histogram;