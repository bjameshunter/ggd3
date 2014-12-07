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
    subRangeBand: 0.3,
    subRangePadding: 0.1,
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

Point.prototype.positionPoint = function(s, group, groups) {

  var sub,
      rb = 0,
      a = s.aesthetic(),
      shift = 0,
      aes = this.layer().aes();
  if(s.scaleType() === "ordinal" && groups){
    sub = d3.scale.ordinal()
                .rangeBands([0, s.scale().rangeBand()], 
                                 this.subRangeBand(), 
                                 this.subRangePadding())
                .domain(groups);
    rb = sub.rangeBand()/2;
    shift = d3.sum(s.rangeBands(), function(r) {
      return r*s.scale().rangeBand();});
  } else if(s.scaleType() === "ordinal") {
    sub = function() { 
      return s.scale().rangeBand() / 2; 
    };
    rb = s.scale().rangeBand() / 2;
  } else {
    sub = function() { return 0;};
  }
  return function(d) {
    return (s.scale()(d[aes[a]]) +
          sub(d[group]) + shift + 
          (d._jitter || 0) * rb);
  };
};

Point.prototype.draw = function(sel, data, i, layerNum, s) {

  // should be able to pass a setup object from a different geom
  // if a different geom wants to create a point object.
  var x, y, scales, points;
  if(_.isUndefined(s)) {
    s     = this.setup();
    scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                 true, true);
    s.groups = _.unique(_.pluck(data.data, s.group));
    // poing should have both canvas and svg functions.
    x = this.positionPoint(scales.x, s.group, s.groups);
    y = this.positionPoint(scales.y, s.group, s.groups);
    data = this.unNest(data.data);
    // get rid of wrong elements if they exist.
    ggd3.tools.removeElements(sel, layerNum, this.geom());
    points = sel.select('.plot')
                .selectAll(this.geom() + '.geom.g' + layerNum)
                .data(data);
  } else {
    points = sel.selectAll(this.geom() + '.geom.g' + layerNum)
                .data(data);
    x = s.x;
    y = s.y;
  }

  var tt = ggd3.tooltip()
            .content(this.tooltip())
            .geom(this);


  points.transition().call(this.drawGeom, x, y, s, layerNum)
    .each(function() {
      tt.tooltip(d3.select(this), s);
    });
  points.enter().append(this.geom())
    .call(this.drawGeom, x, y, s, layerNum)
    .each(function() {
      tt.tooltip(d3.select(this), s);
    });
  points.exit()
    .transition()
    .style('opacity', 0)
    .remove();
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
    .style({
      stroke: s.color,
      "stroke-width": 1,
      "fill-opacity": s.alpha
    });
};

ggd3.geoms.point = Point;
