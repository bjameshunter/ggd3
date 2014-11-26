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
    shape: null,
    stat: "identity",
    position: "identity",
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    // if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    // }
  }
}
Point.prototype = new Geom();

Point.prototype.domain = function(data, a) {
  var layer = this.layer(),
      plot = layer.plot(),
      aes = layer.aes(),
      extent = d3.extent(_.pluck(data, aes[a])),
      range = extent[1] - extent[0];

  // done if date
  if(_.contains(["date", "time"], plot.dtypes()[aes[a]][0]) ){
    return extent;
  }
  // point always extends both ways
  if(range === 0){
    extent[0] -= 1;
    extent[1] += 1;
  }
  extent[0] -= 0.1 * range;
  extent[1] += 0.1 * range;
  return extent;
};
// Point.prototype.constructor = Point;
Point.prototype.draw = function() {

  var layer     = this.layer(),
      position  = layer.position(),
      plot      = layer.plot(),
      stat      = layer.stat(),
      facet     = plot.facet(),
      margins   = plot.margins(),
      aes       = layer.aes(),
      fill      = d3.functor(this.fill() || plot.fill()),
      size      = d3.functor(this.size() || plot.size()),
      shape     = d3.functor(this.shape() || plot.shape()),
      alpha     = d3.functor(this.alpha() || plot.alpha()),
      color     = d3.functor(this.color() || plot.color()),
      that      = this,
      geom      = d3.superformula()
               .segments(20)
               .type(shape)
               .size(size),
      grouped   = false,
      group,
      groups;
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
      if(group === aes.x || group === aes.y) {
        // uninteresting grouping, get rid of it.
        grouped = false;
        group = null;
        groups = null;
      }

  function draw(sel, data, i, layerNum) {

    var x, y;
    // choosing scales based on facet rule,
    // factor out.
    if(!_.contains(["free", "free_x"], facet.scales()) || 
       _.isUndefined(plot.xScale()[data.selector])){
      x = plot.xScale().single;
      xfree = false;
    } else {
      x = plot.xScale()[data.selector];
      xfree = true;
    }
    if(!_.contains(["free", "free_y"], facet.scales()) || 
       _.isUndefined(plot.xScale()[data.selector])){
      y = plot.yScale().single;
      yfree = false;
    } else {
      y = plot.yScale()[data.selector];
      yfree = true;
    }
    // drawing and positioning axes probably shouldn't be on
    // the geom
    // but here, we're drawing
    // here set scales according to fixed/free/grid
    if(layerNum === 0 && x && y){
      sel.select('.x.axis')
        .attr("transform", "translate(" + x.positionAxis() + ")")
        .transition().call(x.axis);
      sel.select('.y.axis')
        .attr("transform", "translate(" + y.positionAxis() + ")")
        .transition().call(y.axis);
    }
    // get rid of wrong elements if they exist.
    function position(a) {
      var s = a === "x" ? x : y,
          sub,
          rb = 0;
      if(s.scaleType() === "ordinal" && grouped){
        sub = d3.scale.ordinal()
                    .rangeRoundBands([0, s.scale().rangeBand()], 0.05, 0.05)
                    .domain(groups);
        rb = sub.rangeBand();
      } else if(s.scaleType() === "ordinal") {
        sub = function() { return s.scale().rangeBand() / 2; };
        rb = s.scale().rangeBand()/2;
      } else {
        sub = function() { return 0;};
      }
      return function(d) {
        return s.scale()(d[aes[a]]) + 
          sub(d[group]) + 
          (d._noise || 0) * rb;

      };
    }
    ggd3.tools.removeElements(sel, layerNum, "path");
    var points = sel.select('.plot')
                  .selectAll('path.geom.g' + layerNum)
                  .data(stat.compute(data.data));
    // add canvas and svg functions.

    function drawPoint(point) {
      point
        .attr('class', 'geom g' + layerNum + " geom-point")
        .attr('d', geom)
        .attr('transform', function(d) { 
          return "translate(" + position('x')(d) + "," +
           position('y')(d) + ")"; } )
        .attr('fill', fill)
        .style('stroke', color)
        .style('stroke-width', 1)
        .style('fill-opacity', alpha);
    }

    points.transition().call(drawPoint);
    points.enter().append('path').call(drawPoint);
    // sel is svg, data is array of objects
    points.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }
  return draw;
};

ggd3.geoms.point = Point;
