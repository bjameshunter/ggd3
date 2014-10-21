// geoms take optional data, the default is found 
// on the selection that calls them.
// geoms get put in a chart definition. If they are objects,
// the get called, if strings, they create a default
// object of that name.

charts.geom.point = function(specs) {
  // add attributes to basic chart or reset defaults
  var attributes = {
    sizeRange: null,
    pointOpacity: 0.5,
    // string or function indicating how to get point id
    dataPointId: null,
    // should brushing highlight ids or highlight scale domain?
    highlightId: null
  };
  // allow passing in of settings as an argument
  if(typeof specs === "object"){
    for(var attr in specs){
      attributes[attr] = specs[attr];
    }
  }
  
  var geom = new charts.geom.BaseGeom(attributes);

  for(var attr in geom.attributes){
    if((!geom[attr] && geom.attributes.hasOwnProperty(attr))){
      geom[attr] = createAccessor(attr);
    }
  }
  // allows a single number to be entered as size
  geom.size()
    .range(d3.extent(_.flatten(geom.sizeRange())))
  function getSize(d) {
    if(_.isNull(geom.sizeVar())){
      return 1;
    }
    return d[geom.sizeVar()];
  }
  // return function to position linear or ordinal
  function position(scale, xy) {
    if(scale.rangeRoundBands){
      var rb = scale.rangeBand()/2
      return function(d, name) {
        return scale(d[name]) + rb + rb/2 * d['jitter-' + xy];
      }
    } else {
      return function(d,name) {
        return scale(d[name])
      };
    }
  };


  function drawPoint() {

    return {cx: function(d) {return geom.positionX(d,geom.xVar())},
      cy: function(d) {return geom.positionY(d,geom.yVar())},
      r: function(d) {return d3.functor(geom.size())(getSize(d))},
      fill: function(d) {return d3.functor(geom.color())(d[geom.colorVar()])}
    }
  }
  // by now, the geom should have xVar and yVar
  // which means we can look them up in dtypes and 
  // make an axis/scale

  geom.draw = function(sel) {
    geom.prepAxes(sel)
    geom.positionX = position(geom.x().scale, 'x');
    geom.positionY = position(geom.y().scale, 'y');
    // better to nest data beforehand, pass it to geom
    // to be able to set axes free or fixed.
    var data = geom.data()[0].values,
    circles = sel.select(".chart")
                .selectAll('circle.geom-point')
                .data(data);
    circles.transition().duration(geom.transitionTime())
      .attr(drawPoint());
    circles.enter().append('circle')
      .attr('class', 'geom-point')
      .attr(drawPoint())
      .style('opacity', geom.pointOpacity());
    circles.exit()
      .transition().duration(geom.transitionTime())
      .style("opacity", 0)
      .attr("r", 0)
      .remove();
  };
  return geom;
};
  