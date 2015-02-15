// 
function Area(spec) {
  if(!(this instanceof Area)){
    return new Area(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "area",
    stat: "identity",
    geom: "path",
    gPlacement: 'insert',
    interpolate: 'linear',
    alpha: 0.2,
    strokeOpacity: 0.1
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Area.prototype = new Geom();

Area.prototype.constructor = Area;

Area.prototype.prepareData = function(data, s) {
  data = s.nest
          .entries(data.data) ;
  data = _.map(data, function(d) { return this.recurseNest(d);}, this);
  return _.isArray(data[0]) ? data: [data];
};

Area.prototype.generator = function(aes, x, y, o2, group, n) {
  var dir = !_.isUndefined(aes.ymin) ? 'x': 'y',
      other = dir === "x" ? "y": 'x',
      dirScale = dir === "x" ? x: y,
      otherScale = dir === "x" ? y: x;
  var area = d3.svg.area()
                .interpolate(this.interpolate());

  if(x.hasOwnProperty('rangeBand')) {
    return area
            .x0(function(d, i) { 
              return (x()(d[aes.x]) + o2(d[group])); 
            })
            .x1(function(d, i) { 
              return (x()(d[aes.x]) + o2(d[group]) + 
                            o2.rangeBand()); 
            })
            .y(function(d) { return y()(d[aes.y]); });
  }
  if(y.hasOwnProperty('rangeBand')) {
    return area
            .x(function(d) { return x()(d[aes.x]); })
            .y0(function(d, i) { 
              return (y()(d[aes.y]) + o2(d[group]) +
                            o2.rangeBand()); 
            })
            .y1(function(d, i) { 
              return (y()(d[aes.y]) + o2(d[group])); 
            });
  }
  area[dir](function(d, i) { 
    return dirScale()(d[aes[dir]]); 
    });
  area[other + "0"](function(d, i) { 
    return otherScale(other + 'min', n)(d); });
  area[other + '1'](function(d, i) { 
    return otherScale(other + 'max', n)(d); });
  return area;
};


Area.prototype.decorateScale = function(dir, s, sc, data) {
  // if it's area, don't use data and just use values
  var a = this.name() === 'area';
  if(_.isNumber(s.aes[dir + 'min'])){
    // both ymin and ymax should be set to be a number above
    // and below the given y variable
    this.check(s.aes, dir);
    if(a) {
      return function(m) {
        return function(d) { return sc(s.aes[m]); };
      };
    }else {
      return function(m) {
        return function(d) { return sc(d[s.aes[dir]] + s.aes[m]);};
      };
    }
  } else if(_.isFunction(s.aes[dir + "min"])) {
    this.check(s.aes, dir);
    // is trusting the order a reliable thing to do?
    var minAgg = _.map(data, function(d) { 
      return -s.aes[dir + 'min'](_.pluck(d, s.aes[dir]));
    });
    var maxAgg = _.map(data, function(d) { 
      return s.aes[dir + 'max'](_.pluck(d, s.aes[dir]));
    });
    return function(m, i) {
      return function(d) {
        var v = m === (dir + 'max') ? maxAgg[i]:minAgg[i];
        return sc(d[s.aes[dir]] + v) ;};
    };
  } else if (_.isString(s.aes[dir + "min"])){
    this.check(s.aes, dir);
    // not tested, should work fine;
    return function(m) {
      return function(d) { 
        return sc(d[s.aes[dir]] + d[s.aes[m]]);
      };
    };
  } else {
    // we're not going in that direction
    return function() {
      return function(d) {
        return sc(d);
      };
    };
  }
};

Area.prototype.data_matcher = function(matches, layerNum){
  return function(d, i) {
    if(matches.length){
      return matches.map(function(m) {
        return d[m];
      }).join(' ') + " " + i + " " + layerNum;
    } else {
      return i;
    }
  };
};

Area.prototype.check = function(aes, d) {
  if(!aes[d + 'min'] || !aes[d + 'max']){
    throw "You must specify, as a function, variable, or constant" +
      " a " + d + "min and " + d + "max";
  }
};

Area.prototype.drawArea = function(area, gen, s, layerNum) {
  var that = this;
  area.attr('class', "geom g" + layerNum + " geom-" + this.name())
    .attr('d', gen)
    .attr('fill-opacity', function(d) { return s.alpha(d[0]); })
    .attr('stroke', function(d) { 
      return s.color(d[0]); 
    })
    .attr('stroke-opacity', function(d) { return that.strokeOpacity(); })
    .attr('fill', function(d) { return s.fill(d[0]); });
};

// area recieves an array of objects, each of which
// have variables corresponding to ymin, ymax, xmin, xmax
// or those aesthetics are numbers or functions 
Area.prototype.draw = function(sel, data, i, layerNum){
  var s = this.setup(),
      that = this,
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                this.drawX(), this.drawY()),
      x = scales.x.scale(),
      y = scales.y.scale(),
      y2,
      x2,
      selector = data.selector,
      o,
      o2 = function() { return 0; };
      o2.rangeBand = function() { return 0;};
  // flatten till we have an array of arrays.
  data = ggd3.tools.arrayOfArrays(this.prepareData(data, s));
  // area should work on ordinal axes as well.
  // so we can do, like, bullet charts'n shit.
  y2 = this.decorateScale('y', s, y);
  x2 = this.decorateScale('x', s, x);

  // silly way to give scale wrappers an ownProperty
  // of 'rangeBand' to satisfy generator conditions for ordinal
  if(x.hasOwnProperty('rangeBand')){
    if(s.grouped) {
      o = s.plot.subScale().single.scale();
      o2 = d3.scale.ordinal()
              .domain(o.domain())
              .rangeRoundBands(o.rangeExtent(), 
                               s.plot.subRangeBand()/2,
                               s.plot.subRangePadding()/2);
      x2.rangeBand = function() { return "yep"; };
    }
  }
  if(y.hasOwnProperty('rangeBand')){
    if(s.grouped) {
      o = s.plot.subScale().single.scale();
      o2 = d3.scale.ordinal()
              .domain(o.domain())
              .rangeRoundBands(o.rangeExtent(), 
                               s.plot.subRangeBand()/2,
                               s.plot.subRangePadding()/2);
      y2.rangeBand = function() { return "yep"; };
    }
  }
  var areaGen = that.generator(s.aes, x2, y2, o2, s.group);
  var matched = this.merge_variables(_.keys(data[0][0]));
  var data_matcher = _.bind(this.data_matcher(matched, layerNum), this);
  var area = sel.selectAll("path.geom.g" + layerNum + ".geom-" + this.name())
              .data(data, data_matcher); // one area per geom
  var update = s.transition ? area.transition(): area;
  update.each(function(d, i) {
      that.drawArea(d3.select(this), areaGen, s, layerNum);
    });
  area.enter().append(this.geom(), "*")
    .each(function(d, i) {
      that.drawArea(d3.select(this), areaGen, s, layerNum);
    });
  var exit = s.transition ? area.exit().transition(): area.exit();
  exit.style('opacity', 0)
    .remove();
};

ggd3.geoms.area = Area;