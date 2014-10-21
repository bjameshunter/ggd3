charts.tools.round = function(x) {
  return Math.round(x*100)/100;
};
charts.tools.zeroDomain = function(range, zero) {
  if(zero){
    range[0] = 0;
  }
  return range;
};
charts.tools.makeZoomRect = function(sel, chart, classId,
                                       width, height, trans) {
  var adj = sel.selectAll('rect.' + classId)
                .data([1]);
  adj.attr('width', width)
      .attr('height', height)
      .attr('transform', "translate(" + 
        trans + ")");
  adj.enter().append('rect')
      .attr('class', classId)
      .attr('width', width)
      .attr('height', height)
      .attr('transform', "translate(" + 
        trans + ")");
}
// function to allow extending domain 10% in either 
// direction and setting min (or max) to zero
charts.tools.domain = function(data, expand, 
                               left, right, zero,
                               variable) {
  if(_.isUndefined(variable)){
    var extent = d3.extent(data);
  } else {
    var extent = d3.extent(_.map(data, function(d) {
      return d[variable];
    }));
  }
  if(!_.isUndefined(expand)){
    var range = Math.abs(extent[1] - extent[0])
    if(!_.isUndefined(left)){
      extent[0] = extent[0] - 0.1 * range;
    }
    if(!_.isUndefined(right)){
      extent[1] = extent[1] + 0.1 * range;
    }
  }
  return extent
}
charts.tools.prepAxes = function(obj){
  // the geom, second time around, will not listen if the
  // chart's variables are changed. Maybe this is a good thing.
  var out = {xExtent: [],
        yExtent: [],
        cExtent: [],
        sExtent: []},
        data = obj.chart ? obj.data()[0].values: 
          _.flatten(_.map(obj.data(), function(d){
            return d.values;})),
        chart = obj.chart ? obj.chart(): obj,
        dtypes = chart.dtypes();

  data.forEach(function(d) {
    out.xExtent.push(d[obj.xVar()])
    out.yExtent.push(d[obj.yVar()])
    if(!_.isNull(obj.sizeVar())){
      out.sExtent.push(d[obj.sizeVar()])
    }
    if(!_.isNull(obj.colorVar())){
      out.cExtent.push(d[obj.colorVar()])
    };
  });

  return out;
}
charts.tools.defineAxis = function(varName, obj){
    var chart = obj.chart ? obj.chart(): obj,
        dtype = chart.dtypes()[varName],
        t;
    if(dtype[0] === "number"  & dtype[1] === "many"){
      t = 'linear';
    } else {
      t = "ordinal";
    }
    return {type: t}
  }

