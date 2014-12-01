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

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Histogram.prototype = new Bar();
  
Histogram.prototype.constructor = Histogram;

Histogram.prototype.domain = function(data, v) {
  var s = this.setup(),
      group, stackby,
      groupSum, stackSum,
      grouped;

  if(s.aes[v] === "binHeight") {
    grouped = _.groupBy(data, function(d) {
      return d.x;
    });
    stackSum = _.mapValues(grouped, function(v, k) {
      return _.reduce(_.pluck(v, "y"), function(a,b) {
        return a + b;
      });
    });
    stackSum = d3.extent(_.map(stackSum, function(v, k) { return v; }));
    groupSum = d3.extent(data, function(d) {
      return d.y;
    });
    extent = s.position === "stack" ? stackSum: groupSum;
    range = extent[1] - extent[0];
    extent[0] -= 0.05*range;
  } else {
    extent = d3.extent(_.pluck(data, 'x'));
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
      breaks = _.map(unNested, "x");
  // this is the problem
  // there should be a 'fixed bins' flag
  this.breaks(breaks);
  return s.nest.entries(data);
};

Histogram.prototype.fillEmptyStackGroups = function(data, v) {

  var keys = _.unique(_.map(data, function(d) { return d.key; })),
      vals = _.unique(_.flatten(_.map(data, function(d) {
        return _.map(d.values, 'x');
      }))),
      empty = {},
      n = d3.nest()
            .key(function(d) { return d[v]; });
  empty.y = 0;
  empty.binHeight = 0;
  empty.dx = data[0].dx;
  _.each(data, function(d) {
    var dkey, missing;
    dkeys = _.map(d.values, 'x');
    missing = _.compact(_.filter(vals, function(k) {
      return !_.contains(dkeys, k);
    }));
    if(!_.isEmpty(missing)) {
      _.each(missing, function(m) {
        // must fill other values, too.
        var e = _.clone(empty);
        e.x = m;
        d.values.push(e);
      });
    }
    d.values = _.sortBy(d.values, function(e) {
      return e.x;
    });
  });
  return data;
};
// geoms may want to be nested differently.
Histogram.prototype.nest = function() {
  // if stacking histograms, bins must be calculated
  // first on entire facet, then individually on
  // each layer. If facet.scales() === "fixed"
  // bins should be the same across facets. If not
  // the pre calculated bins need to be stored and 
  // referenced when calculating layers.
  var aes = this.layer().aes(),
      plot = this.layer().plot(),
      nest = d3.nest(),
      dtypes = plot.dtypes(),
      nestVars = _.unique(_.compact([aes.group, aes.fill, aes.color]));

  _.each(nestVars, function(n) {
    if(dtypes[n][1] !== "many") {
      nest.key(function(d) { return d[n]; });
    }
  });
  _.map(['x', 'y'], function(a) {
    if(plot[a + "Scale"]().single.scaleType() === "ordinal"){
      nest.key(function(d) { return d[aes[a]]; });
    }
  });
  return nest;
};

ggd3.geoms.histogram = Histogram;