// geom hline will only make sense on charts with continuous
// y axes(date or numeric), so check that at the start and throw an 
// error 
charts.geom.abLine = function(specs) {
  // add attributes to basic chart or reset defaults
  // stat calculates a statistic for each group
  // y just draws a line at that y intercept
  var attributes = {
    lineWidth: d3.scale.linear(),
    lineWidthRange: [2,5],
    lineOpacity: 0.5,
    lineWidthVar: null,
    stat: 'mean',
    yVals: null,
    xVals: null,
    grid: false, // use this geom to make gridlines
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
  // function that returns an object containing relevent
  // data points for the chart. Accepts aggregator function
  // which takes a single array of numbers
  function aggregator(fun) {
    function agg(arr) {
      var out = {};
      if(arr.length > 0){
        if(!_.isNull(geom.colorVar())){
          out[geom.colorVar()] = arr[0][geom.colorVar()]
        }
        if(!_.isNull(geom.group())){
          out[geom.group()] = arr[0][geom.group()]
        }
        if(geom.x().scale.rangeBands){
          out[geom.xVar()] = arr[0][geom.xVar()]
        }
        out[geom.yVar()] = fun(_.map(arr, function(d) {
          return d[geom.yVar()];
        }))
        return [out]
      }
    }
    return agg
  }
  // function to recurse output of agg function and return
  // bottom leaf
  // leaf will always contain an object with yVar
  function aggGetter(d){
    if(_.contains(_.keys(d), geom.yVar())){
      return d;
    } else {
      return _.flatten(_.map(d.values, function(v) {
          return aggGetter(v)
      }));
    }
  }
  var stats = {mean: aggregator(d3.mean),
    median: aggregator(d3.median),
    max: aggregator(d3.max),
    min: aggregator(d3.min)
  }

  // allows a single number to be entered as size
  geom.lineWidth()
    .range(d3.extent(_.flatten([geom.lineWidthRange()])))
  function getSize(d) {
    if(_.isNull(geom.lineWidthVar())){
      return 1;
    }
    return d[geom.lineWidthVar()];
  }


  // use area generators for lines
  // allowing variables to set the width if desired
  // y0 and y1 flank the center position by the 
  // width of the line/2
  // width for ordinal x axis doesn't make sense
  var areaOrd = d3.svg.area()
                  .x0(function(d) { 
                    console.log(d);
                    return (geom.x().scale(d[geom.xVar()]) + 
                           geom.x().scale.rangeBand()/4)})
                  .x1(function(d) { 
                    return (geom.x().scale(d[geom.xVar()]) + 
                                        geom.x().scale.rangeBand()*3/4)})
                  .y0(function(d) {
                    return geom.y().scale(d[geom.yVar()])
                  })
                  .y1(function(d) {
                    return geom.y().scale(d[geom.yVar()])
                  })
  // generator for continuous x axis
  var area = d3.svg.area()
      .x0(function(d) { 
        return 0; })
      .x1(function(d) { 
        return chart.plotDim(chart.attributes).width; })
      .y0(function(d) { 
        return (geom.y().scale(d[geom.yVar()])); })
      .y1(function(d) { 
        return (geom.y().scale(d[geom.yVar()])); })

  geom.draw = function(sel) {
    // throw an error if y-axis is not continuous
    if(!_.isUndefined(geom.chart().y().scale.rangeBand)){
      console.error("you are trying to draw a horizontal line on an ordinal y axis.")
      sel.select('.chart').selectAll('path.geom-hline')
        .transition().duration(geom.transitionTime())
        .style('opacity', 0)
        .remove()
      return
    }
    geom.prepAxes(sel);
    // nest to group the colors and groups and aggregate
    // needs refactoring, too hungover.
    if(!_.isNull(geom.yVals())){
      if(_.isArray(geom.yVals())){
        if(_.all(_.map(geom.yVals(), _.isObject))){
          // user passed an array of objects for data
          var data = geom.yVals()
        } else {
          // if it's an array of y-intercepts, all
          // that is needed is to add the 
          if(geom.x().scale.rangeBand){
            var xes = _.unique(_.map(geom.data()[0].values,
                           function(d) {
                            return d[geom.xVar()];
                           })),
            data = _.flatten(_.map(geom.yVals(), function(y) {
              return _.map(xes, function(x) {
                var out = {};
                out[geom.xVar()] = x;
                out[geom.yVar()] = y
                return out
              })
            }))
          } else {
            var data = _.map(geom.yVals(), function(y) {
              var out = {};
              out[geom.yVar()] = y;
              return out
            })
          }
        }
      }
    } else {
      var nest = d3.nest()
      if(!_.isNull(geom.group())){
        nest.key(function(d) { return d[geom.group()]})
      }
      if(!_.isNull(geom.colorVar())){
        nest.key(function(d) { return d[geom.colorVar()];})
      }
      if(geom.x().scale.rangeBand){
        nest.key(function(d) { return d[geom.xVar()]; })
      }
      nest.rollup(stats[geom.stat()]);
      var data = nest
              .entries(geom.data()[0].values)
      data = _.flatten(_.map(data, aggGetter))
    }
    // do this because we want to append a line per
    // entry in data. the generators expect arrays
    data = _.map(data, function(d) {
      return [d]
    })
    if(geom.x().scale.rangeBand){
      var generator = areaOrd;
    } else {
      var generator = area;
    }
    var selector = geom.grid() ? "geom-grid":"geom-hline"
    selector += " order-" + geom.order()
    var paths = sel.select('.chart')
                  .selectAll("path." + selector)
                  .data(data);
    paths
      .transition().duration(geom.transitionTime())
      .attr('d', generator)
      .attr('stroke', function(d) {
      return geom.color()(d[0][geom.colorVar()])
        });
    paths.enter().append('path')
      .style('opacity', 0)
      .attr('class', selector)
      .attr('d', function(d) {
        return generator(d)})
      .attr('stroke', function(d) {
      return geom.color()(d[0][geom.colorVar()])
        })
      .transition().duration(geom.transitionTime())
      .style('opacity', 1)
    paths.exit()
      .transition().duration(geom.transitionTime())
      .style(geom.transitionStyle())
      .remove();

  };
  return geom;
};
  