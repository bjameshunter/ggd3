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
    shape: "circle",
    stat: "identity",
    position: "identity",
    size: 20,
    subRangeBand: 0.5,
    subRangePadding: 0.5,
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    // if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    // }
  }
}
Point.prototype = new Geom();

Point.prototype.constructor = Point;

Point.prototype.positionPoint = function(s, group, groups) {

  var sub,
      rb = 0,
      a = s.aesthetic(),
      aes = this.layer().aes();
  if(s.scaleType() === "ordinal" && groups){
    sub = d3.scale.ordinal()
                .rangeRoundBands([0, s.scale().rangeBand()], 
                                 this.subRangeBand(), 
                                 this.subRangePadding())
                .domain(groups);
    rb = sub.rangeBand();
  } else if(s.scaleType() === "ordinal") {
    sub = function() { 
      return s.scale().rangeBand() / 2; 
    };
    rb = s.scale().rangeBand()/2;
  } else {
    sub = function() { return 0;};
  }
  return function(d) {
    return s.scale()(d[aes[a]]) + 
      sub(d[group]) + 
      (d._jitter || 0) * rb;
  };
};

Point.prototype.draw = function() {

  var s     = this.setup(),
      that  = this,
      geom  = d3.superformula()
                .type(function(d) {
                  return d[aes.shape] || that.shape();
                })
                .size(function(d) {
                  return d[s.aes.size] || that.size();
                })
                .segments(10);
  function draw(sel, data, i, layerNum) {

    var scales = that.scalesAxes(sel, s, data.selector, layerNum,
                                 true, true);
    // get rid of wrong elements if they exist.
    ggd3.tools.removeElements(sel, layerNum, "path");
    var points = sel.select('.plot')
                  .selectAll('path.geom.g' + layerNum)
                  .data(s.stat.compute(data.data));
    

    // add canvas and svg functions.
    var positionX = that.positionPoint(scales.x, s.group, s.groups),
        positionY = that.positionPoint(scales.y, s.group, s.groups);

    function drawPoint(point) {

      point
        .attr('class', 'geom g' + layerNum + " geom-point")
        .attr('d', geom)
        .attr('transform', function(d) { 
          return "translate(" + positionX(d) + "," +
           positionY(d) + ")"; } )
        .attr('fill', s.fill)
        .style('stroke', s.color)
        .style('stroke-width', 1)
        .style('fill-opacity', s.alpha);
    }

    points.transition().call(drawPoint);
    points.enter().append('path').call(drawPoint);
    points.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }
  return draw;
};

ggd3.geoms.point = Point;
