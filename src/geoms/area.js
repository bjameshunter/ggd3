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
    position: null,
    interpolate: 'linear',
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
  } else if(_.isFunction(s.aes.ymin)) {
    this.check(s.aes, 'y');
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
        return sc(d[s.aes.y] + v) ;};
    };
  } else if (_.isString(s.aes[dir + "min"])){
    this.check(s.aes, dir);
    // not tested, should work fine;
    return function(m) {
      return function(d) { 

        return sc(d[s.aes.y] + d[s.aes[m]]);
      };
    };
  }
};

Area.prototype.drawArea = function(area, gen, s, layerNum) {
  var that = this;
  area.attr('class', "geom g" + layerNum + " geom-" + this.name())
    .attr('d', gen)
    .attr('fill-opacity', function(d) { return s.alpha(d[0]); })
    .attr('stroke', function(d) { 
      console.log(d); 
      return s.color(d[0]); 
    })
    .attr('stroke-opacity', function(d) { return that.strokeOpacity(); })
    .attr('fill', function(d) { return s.fill(d[0]); });
};

Area.prototype.check = function(aes) {
  var a = ['xmin', 'ymin', 'xmax', 'ymax'];
  if(!(_.all(a, function(d) { return _.isNumber(aes[d]); } ))){
    throw "You must specify xmin, xmax, ymin and ymax for " +
    "geom area";
  }
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
      o2 = function() { return 0; };
      o2.rangeBand = function() { return 0;};
  data = this.prepareData(data, s);
  // area should work on ordinal axes as well.
  // so we can do, like, bullet charts'n shit.
  y2 = this.decorateScale('y', s, y);
  x2 = this.decorateScale('x', s, x);
  var areaGen = function(n) {
    return that.generator(s.aes, x2, y2, o2, s.group);
    };
  console.log(data);

  var area = sel.select('.plot')
              .selectAll(".g" + layerNum + "geom-" + this.name())
              .data(data); // one area per geom
  area.transition()
    .each(function(d, i) {
      that.drawArea(d3.select(this), areaGen(i), s, layerNum, i);
    });
  // makes sense that all area/ribbons go first.
  area.enter().insert(this.geom(), ".geom.g0")
    .each(function(d, i) {
      that.drawArea(d3.select(this), areaGen(i), s, layerNum);
    });
  area.exit()
    .transition()
    .style('opacity', 0)
    .remove();


};

ggd3.geoms.area = Area;