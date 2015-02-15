// allow layer level specifying of size, fill,
// color, alpha and shape variables/scales
// but inherit from layer/plot if 
function Point(spec) {
  if(!(this instanceof Geom)){
    return new Point(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "point",
    geom: "circle",
    stat: "identity",
    position: "identity",
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}
Point.prototype = new Geom();

Point.prototype.constructor = Point;

Point.prototype.positionPoint = function(s, group) {

  var o2,
      rb = 0,
      a = s.aesthetic(),
      shift = 0,
      aes = this.layer().aes();
  if(s.type() === "ordinal" && group){
    o2 = this.layer().plot().subScale().single.scale();
    rb = o2.rangeBand()/2;
    shift = d3.sum(s.rangeBands(), function(r) {
      return r*s.scale().rangeBand();});
  } else if(s.type() === "ordinal") {
    o2 = function() { 
      return s.scale().rangeBand() / 2; 
    };
    rb = s.scale().rangeBand() / 2;
  } else {
    o2 = function() { return 0;};
  }
  return function(d) {
    return (s.scale()(d[aes[a]]) +
          o2(d[group]) + shift + 
          (d._jitter || 0) * rb);
  };
};

Point.prototype.draw = function(sel, data, i, layerNum, s) {

  // should be able to pass a setup object from a different geom
  // if a different geom wants to create a point object.
  var x, y, scales, points;
  // other functions that call geom point will supply an "s" object
  if(_.isUndefined(s)) {
    s = this.setup();
    scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                 true, true);
    // point should have both canvas and svg functions.
    x = this.positionPoint(scales.x, s.group);
    y = this.positionPoint(scales.y, s.group);
    data = this.unNest(data.data);
    // get rid of wrong elements if they exist.
    points = sel.selectAll('.geom.g' + layerNum + ".geom-" + this.name())
                .data(_.filter(data, function(d) {
                  return !isNaN(d[s.aes.x]) && !isNaN(d[s.aes.y]);
                }));
  } else {
    points = sel.selectAll('.geom.g' + layerNum + ".geom-" + this.name())
                .data(data);
    x = s.x;
    y = s.y;
  }
  var tt = ggd3.tooltip()
            .content(this.tooltip())
            .geom(this);
  var update = s.transition ? points.transition(): points;
  update.call(this.drawGeom, x, y, s, layerNum);
  points.enter().append(this.geom())
    .call(this.drawGeom, x, y, s, layerNum);
  var exit = s.transition ? points.exit().transition():points.exit();
  exit.style('opacity', 0)
    .remove();
  points.each(function() {
      tt.tooltip(d3.select(this), s);
    });
};

Point.prototype.drawGeom = function (point, x, y, s, layerNum) {
  point
    .attr('class', 'geom g' + layerNum + " geom-point")
    .attr({
      cx: x,
      cy: y,
      r: s.size,
      fill: s.fill
    })
    .attr({
      stroke: s.color,
      "stroke-width": 1,
      "fill-opacity": s.alpha
    });
};

ggd3.geoms.point = Point;
