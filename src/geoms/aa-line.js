function Line(spec) {
  if(!(this instanceof ggd3.geom)){
    return new Line(spec);
  }
  Geom.apply(this, spec);
  var attributes = {
    name: "line",
    stat: "identity",
    geom: "path",
    grid: false,
    interpolate: 'linear',
    lineType: null,
    lineWidth: null,
    tension: 0.7,
    freeColor: false,
    position: "append" 
  };
  // freeColor is confusing. Most global aesthetics should be 
  // that way. 
  // My example is faceted by decade, meaning the color variable
  // "date", doesn't change much within a facet. With "freeColor" it does.
  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}


Line.prototype = new Geom();

Line.prototype.constructor = Line;

Line.prototype.lineType = function(l) {
  if(!arguments.length) { return this.attributes.lineType; }
  this.attributes.lineType = d3.functor(l);
  return this;
};

Line.prototype.generator = function(aes, x, y, o2, group) {
  var pos;
  if(this.name() === "linerange"){
    pos = function() { return o2.rangeBand()/2; };
  } else {
    pos = function(i) { return o2.rangeBand()*i; };
  }
  var line = d3.svg.line()
              .interpolate(this.interpolate())
              .tension(this.tension());
  if(x.hasOwnProperty('rangeBand')) {
    return line
            .x(function(d, i) { 
              return (x(d[aes.x]) + o2(d[group]) + 
                            pos(i)); 
            })
            .y(function(d) { return y(d[aes.y]); });
  }
  if(y.hasOwnProperty('rangeBand')) {
    return line
            .x(function(d) { return x(d[aes.x]); })
            .y(function(d, i) { 
              return (y(d[aes.y]) + o2(d[group]) +
                            pos(i)); 
            });
  }
  return line
          .defined(function(d, i) { return !isNaN(y(d[aes.y])); })
          .x(function(d, i) { return x(d[aes.x]); })
          .y(function(d, i) { return y(d[aes.y]); });
};

Line.prototype.selector = function(layerNum) {
  if(this.grid()){
    var direction = this.name() === "hline" ? "x": "y";
    return "grid-" + direction;
  }
  return "geom g" + layerNum + " geom-" + this.name();
};

Line.prototype.drawLines = function (path, line, s, layerNum) {
  var that = this, lt;
  if(!this.lineType()){
    lt = s.plot.lineType();
  } else {
    if(this.grid()){
      lt = function(d) {
        return d[0].zero ? 'none':that.lineType()(d);
      };
    }else{
      lt = this.lineType();
    }
  }
  var lw = d3.functor(this.lineWidth());
  path.attr("class", this.selector(layerNum))
    .attr('d', line)
    .attr('stroke-dasharray', lt);
  if(!this.grid()){
    path
      .attr('opacity', function(d) { return s.alpha(d[1]) ;})
      .attr('stroke', function(d) { return s.lcolor(d[1]);})
      .attr('stroke-width', function(d) {
        return lw(d[1]);
      })
      .attr('fill',  function(d) { 
        return s.gradient ? s.lcolor(d[1]): 'none';});
  }
};

Line.prototype.prepareData = function(data, s) {
  data = s.nest
          .entries(data.data) ;
  // array of grouped data with 1 or 2 group variables
  data = _.map(data, function(d) { return this.recurseNest(d);}, this);
  data = ggd3.tools.arrayOfArrays(data);
  return _.isArray(data[0]) ? data: [data];
};

Line.prototype.draw = function(sel, data, i, layerNum){
  // console.log('first line of line.draw');
  var s      = this.setup(),
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                 this.drawX(), this.drawY()),
      x = scales.x.scale(),
      y = scales.y.scale(),
      parentSVG = d3.select(sel.node().parentNode.parentNode),
      line,
      o2 = function() { return 0; };
      o2.rangeBand = function() { return 0; };
      s.gradient = false;

  if(x.hasOwnProperty('rangeBand') ||
     y.hasOwnProperty('rangeBand')){
    if(s.grouped) {
      o2 = s.plot.subScale().single.scale();
    } else {
      if(x.hasOwnProperty('rangeBand')){
        o2.rangeBand = function() { return x.rangeBand(); };
      } else {
        o2.rangeBand = function() { return y.rangeBand(); };
      }
    }
  }

  var l1 = this.generator(s.aes, x, y, o2, s.group),
      selector = data.selector;
  data = this.prepareData(data, s, scales);
  if(_.isEmpty(_.flatten(data))) { return data; }
  // overwriting the color function messes up tooltip labeling,
  // if needed.
  s.lcolor = s.color;

  // if color gradient
  if(s.aes.color && _.contains(['number', 'date', 'time'], s.dtypes[s.aes.color][0]) && s.dtypes[s.aes.color][1] === "many"){
    s.gradient = true;
    if(this.freeColor()){
      var color = d3.scale.linear()
                .range(s.plot.colorRange())
                .domain(d3.extent(_.pluck(_.flatten(data), s.aes.color)));
      s.lcolor = function(d) { return color(d[s.aes.color]); };
    } 
    data = _.map(data, function(d) { 
      return this.quad(this.sample(d, l1, x, y, s.color, s.aes ), 
                       s.aes); }, this);
    data = _.flatten(data, true);
    // alpha must be constant
    var lw = this.lineWidth();
    s.alpha = s.plot.alpha();
    line = _.bind(function(d) {
      return this.lineJoin(d[0], d[1], d[2], d[3], lw);
    }, this);
  } else {
    line = l1;
  }
  sel = this.grid() ? parentSVG.select("." + this.direction() + 'grid'): sel;
  var matched = this.merge_variables(_.keys(data[0]));
  var data_matcher = _.bind(this.data_matcher(matched), this);

  var lines = sel.selectAll("." + 
                            this.selector(layerNum).replace(/ /g, '.'))
              .data(data, data_matcher);
  var update = s.transition ? lines.transition(): lines;
  update.call(_.bind(this.drawLines, this), line, s, layerNum);
  lines.enter().append(this.geom(), ".geom")
    .call(_.bind(this.drawLines, this), line, s, layerNum);
  var exit = s.transition ? lines.exit().transition(): lines.exit();
  exit.style('opacity', 0)
    .remove();
  return data;
};
// next four functions copied verbatim from http://bl.ocks.org/mbostock/4163057
// used to add linear gradient to line.
// Sample the SVG path string "d" uniformly with the specified precision.
// gonna use this for discrete change of colors for a few points and
// continuous change of color for many
Line.prototype.sample = function(d, l, x, y, color, aes) {
  var n = d.length;
  d = _.map(d, function(r, i) {
        var o = [];
        o[aes.color] = r[aes.color];
        o[0] = x(r[aes.x]);
        o[1] = y(r[aes.y]);
        return o;
      });
  return d;
  // uncomment this code for continuous gradient legends, for example.
  // var path = document.createElementNS(d3.ns.prefix.svg, "path");
  // path.setAttribute("d", l(d);
  // var n = path.getTotalLength(), t = [0], i = 0, 
  //     dt = Math.floor(n/precision);
  //     console.log(n);
  // while ((i += dt) < n) { t.push(i); }
  // t.push(n);

  // return t.map(function(t) {
  //   var p = path.getPointAtLength(t), a = [p.x, p.y];
  //   a.t = t / n;
  //   return a;
  // });
};

// Compute quads of adjacent points [p0, p1, p2, p3].
Line.prototype.quad = function(points, aes) {
  return d3.range(points.length - 1).map(function(i) {
    var a = [points[i - 1], points[i], points[i + 1], points[i + 2]];
    a[aes.color] = (points[i][aes.color] + points[i + 1][aes.color]) / 2;
    return a;
  });
};

// Compute stroke outline for segment p12.
Line.prototype.lineJoin = function(p0, p1, p2, p3, width) {
  var u12 = this.perp(p1, p2),
      r = width / 2,
      a = [p1[0] + u12[0] * r, p1[1] + u12[1] * r],
      b = [p2[0] + u12[0] * r, p2[1] + u12[1] * r],
      c = [p2[0] - u12[0] * r, p2[1] - u12[1] * r],
      d = [p1[0] - u12[0] * r, p1[1] - u12[1] * r],
      e, u23, u01;

  // this section is causing very large numbers in y vector.
  // if (p0) { // clip ad and dc using average of u01 and u12
  //   u01 = this.perp(p0, p1);
  //   e = [p1[0] + u01[0] + u12[0], p1[1] + u01[1] + u12[1]];
  //   a = this.lineIntersect(p1, e, a, b);
  //   d = this.lineIntersect(p1, e, d, c);
  // }

  // if (p3) { // clip ab and dc using average of u12 and u23
  //   u23 = this.perp(p2, p3);
  //   e = [p2[0] + u23[0] + u12[0], p2[1] + u23[1] + u12[1]];
  //   b = this.lineIntersect(p2, e, a, b);
  //   c = this.lineIntersect(p2, e, d, c);
  // }
  return "M" + a + "L" + b + " " + c + " " + d + "Z";
};

// Compute intersection of two infinite lines ab and cd.
Line.prototype.lineIntersect = function(a, b, c, d) {
  var x1 = c[0], x3 = a[0], x21 = d[0] - x1, x43 = b[0] - x3,
      y1 = c[1], y3 = a[1], y21 = d[1] - y1, y43 = b[1] - y3,
      ua = (x43 * (y1 - y3) - y43 * (x1 - x3)) / (y43 * x21 - x43 * y21);
  return [x1 + ua * x21, y1 + ua * y21];
};

// Compute unit vector perpendicular to p01.
Line.prototype.perp = function(p0, p1) {
  var u01x = p0[1] - p1[1], u01y = p1[0] - p0[0],
      u01d = Math.sqrt(u01x * u01x + u01y * u01y);
  return [u01x / u01d, u01y / u01d];
};

ggd3.geoms.line = Line;