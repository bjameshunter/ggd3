// Base geom from which all geoms inherit
// tooltip gets passed the selection, data, geom.setup() and "opts"
// whatever those are.
function Geom(aes) {
  if(!(this instanceof Geom)){
    return new Geom(aes);
  }
  var attributes = {
    layer: null,
    stat: null,
    fill: null,
    alpha: null,
    color: null,
    size: null,
    position: null,
    gPlacement: 'append',
    drawX: true,
    drawY: true,
    data: [],
    ownData: false,
    style: "", // optional class attributes for css 
    tooltip: null,
    groups: null, 
    subRangeBand: 0,
    subRangePadding: 0,
    omit: null,
    mergeOn: null,
    enter: null,
    exit: null,
    initial: null,
  };
  var r = function(d) { return ggd3.tools.round(d, 2);};
  // default tooltip
  // done here because setting a big long
  // default function on attributes is messy.
  function tooltip(sel, s, opts){
    var omit = this.omit() || [],
        d = sel.data()[0],
        diff;
    omit = flatten([omit, s.stat.exclude]);
    // if 'additional' aesthetics are declared, they are wanted regardless.
    // remove them from the omit array
    omit.splice(omit.indexOf('additional'), 1);
    diff = Object.keys(s.aes).filter(function(d) {
            return !contains(omit, d);
          });
    diff.forEach(function(k) {
      if(k === 'additional'){
        s.aes[k].forEach(function(a, i) {
          sel.append('h4')
            .text(a + ": ")
            .append('span').text(this.abbrev(d, s, k, i));
        }, this);
      } else {
      if(s.stat[k] === null || s.stat[k]() === null){ return null; }
      var stat = s.stat[k]()._name || "identity";
      stat = contains(["identity", "first"], stat) ? "": " (" + stat + ")";
        sel.append('h4')
          .text(s.aes[k] + stat + ": ")
          .append('span').text('(' + k + ') ' + 
                               this.abbrev(d, s, k));
      }
    }, this);
  }
  this.attributes = attributes;
  this.attributes.tooltip = tooltip.bind(this);
}

Geom.prototype.tooltip = function(tooltip) {
  if(!arguments.length) { return this.attributes.tooltip; }
  var wrapper = function(sel, s, opts) {
    sel.each(function(d) {
      var el = d3.select(this);
      tooltip(el, d, s, opts);
    });
  };
  this.attributes.tooltip = wrapper;
  return this;
};

Geom.prototype.defaultPosition = function() {
  var n = this.name();
  return {
    "point": "identity",
    "text": "identity",
    "bar": "stack",
    "box": "dodge",
    "hline": "identity",
    "vline": "identity",
    "abline": "identity",
    "smooth": "loess", 
    "area" : "identity",
    "error": "identity",
    "density": "kernel",
    "path" : "identity",
    "ribbon" : "identity",
    }[n];
};

Geom.prototype.abbrev = function(d, s, a, i){
  if(a === 'additional'){ 
    a = s.aes[a][i]; 
  } else {
    a = s.aes[a];
  }
  var dtype = s.dtypes[a],
      format;
  if(dtype){
    if(dtype[0]==='date'){
      format = d3.time.format(dtype[2] || "%Y-%m-%d");
      return format(d[a]);
    }
    else if(dtype[0] === 'number'){
      format = d3.format(dtype[2] || ",.2fo");
      return format(d[a]);
    }
    return d[a];
  } else {
    // this is a computed variable. ie "binHeight"
    return d3.format(",.2f")(d[a]);
  }
};

Geom.prototype.merge_variables = function(variables){
  if(this.mergeOn() !== null){
    return this.mergeOn();
  }
  var s = this.setup(),
      matched = intersection(variables,
                   Object.keys(s.dtypes).filter(function(d) {
                       return (s.dtypes[d][1] === 'few' ||
                               s.dtypes[d][0] === 'string');
                     }));
  return matched;
};

Geom.prototype.data_matcher = function(matches){
  return function(d, i) {
    if(matches.length){
      return matches.map(function(m) {
        return d[m];
      }).join(' ');
    } else {
      return i;
    }
  };
};

Geom.prototype.setup = function() {
  // when calling a geom from within
  // another geom, many of these properties will not exist.
  var s = {
      layer     : this.layer(),
    };
  // sometimes a geom doesn't have a layer as in 
  // compound geoms - boxplot is box and point.
  if(s.layer){
    s.grouped   = false;
    s.plot      = s.layer.plot();
    s.stat      = s.layer.stat();
    s.nest      = this.nest();
    s.dtypes    = s.plot.dtypes();
    s.position  = s.layer.position();
    s.dim       = s.plot.plotDim();
    s.facet     = s.plot.facet();
    s.aes       = s.layer.aes();
    s.fill      = d3.functor(this.fill() || s.plot.fill());
    s.size      = d3.functor(this.size() || s.plot.size());
    s.alpha     = d3.functor(this.alpha() || s.plot.alpha());
    s.color     = d3.functor(this.color() || s.plot.color());
    s.nest.rollup(function(d) {
      return s.stat.compute(d);
    });
    if(s.aes.fill) {
      s.grouped = true;
      s.group = s.aes.fill;
    } else if(s.aes.color){
      s.grouped = true;
      s.group = s.aes.color;
    } else if(s.aes.group){
      s.grouped = true;
      s.group = s.aes.group;
    }
    // not convinced this is a good idea.
    // if(contains([s.facet.x(), s.facet.y()], 
    //               s.group)) {
    //   // uninteresting grouping, get rid of it.
    //   s.grouped = false;
    //   s.group = null;
    //   s.groups = null;
    //   // must get all groups from layer to do this
    //   // meaningfully. Facets without a group 
    //   // are throwing it off.
    // }
  }
  return s;
};

Geom.prototype.collectGroups = function() {
  var groups, grouped,
      aes = this.layer().aes();
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
  if(grouped) {
    groups = unique(
                pluck(
                  flatten(
                    this.data().map(getItem('data'))), group));
    this.groups(groups);
  }
  return groups;
};

Geom.prototype.compute = function(data, s) {
  return s.nest.entries(data);
};

Geom.prototype.domain = function(data, a) {
  var layer   = this.layer(),
      plot    = layer.plot(),
      aes     = layer.aes(),
      extent,
      range;

  if(contains(linearScales, plot[a + "Scale"]().single.type())) {
    extent  = d3.extent(pluck(data, aes[a]));
    range   = extent[1] - extent[0];
  } else {
    var domain = unique(data, aes[a]);
    return domain.sort();
  }
  // done if date
  // and not a calculated aesthetic
  var skip = ['binHeight', 'density', 'n. observations', undefined],
      skip2 = ['yintercept', 'xintercept', 'slope'];

  if(!contains(skip, aes[a]) && !contains(skip2, a)){
    if(contains(["date", "time"], plot.dtypes()[aes[a]][0]) ){
      return extent;
    }
  }
  // extent both ways
  if(range === 0){
    extent[0] -= 1;
    extent[1] += 1;
  }
  extent[0] -= 0.1 * range;
  extent[1] += 0.1 * range;
  return extent;
};


Geom.prototype.scalesAxes = function(sel, setup, selector, 
                                     layerNum, drawX, drawY){

  var x, y,
      parentSVG = d3.select(sel.node().parentNode.parentNode), 
      plot = this.layer().plot(),
      rowNum = parseInt(parentSVG.attr('row')),
      colNum = parseInt(parentSVG.attr('col'));
  // choosing scales based on facet rule

  if(!contains(["free", "free_x"], setup.facet.scales()) || 
     setup.plot.xScale()[selector] === undefined){
    x = setup.plot.xScale().single;
    xfree = false;
  } else {
    x = setup.plot.xScale()[selector];
    xfree = true;
  }
  if(!contains(["free", "free_y"], setup.facet.scales()) || 
     setup.plot.xScale()[selector] === undefined){
    y = setup.plot.yScale().single;
    yfree = false;
  } else {
    y = setup.plot.yScale()[selector];
    yfree = true;
  }

  if(layerNum === 0 && drawX){
    var xax = parentSVG.select('.x.axis')
              .attr("transform", "translate(" + x.positionAxis(rowNum, colNum) + ")")
              .attr('opacity', 1)
              .call(x.axis);
    x.style(xax);
    xax.attr('opacity', 1);
    if(x.label()){
      parentSVG.select('.x.axis')
        .call(x.axisLabel.bind(x));
    }
  }
  if(layerNum === 0 && drawY){
    var yax = parentSVG.select('.y.axis')
              .attr("transform", "translate(" + y.positionAxis(rowNum, colNum) + ")")
              .attr('opacity', 1)
              .transition().call(y.axis);
    y.style(yax);
    yax.attr('opacity', 1);
    if(y.label()){
      parentSVG.select('.y.axis')
        .call(y.axisLabel.bind(y));
    }
  }
  return {
    x: x,
    y: y,
    xfree: xfree,
    yfree: yfree,
  };
};

Geom.prototype.nest = function() {

  // to be performed before calculating layer level geoms or scales
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

Geom.prototype.removeElements = function(sel, layerNum, clss) {
  var remove = sel
                .selectAll('.geom.g' + layerNum)
                .filter(function() {
                  return d3.select(this)[0][0].classList !== clss;
                });
  remove.transition()
    .style('opacity', 0)
    .remove();
  
};


ggd3.geom = Geom;


Geom.prototype.unNest = unNest;
Geom.prototype.recurseNest = recurseNest;
