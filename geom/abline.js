// geom abline is a base for hline, vline, and smooth
// to draw arbitrary intercept/slope
// needs to handle drawing 
charts.geom.abLine = function(specs) {
  // add attributes to basic chart or reset defaults
  // stat calculates a statistic for each group
  // y just draws a line at that y intercept
  var attributes = {
    lineWidth: null,
    lineOpacity: 0.8,
    stat: null,
    vals: [null],
    // vals: [null],
    grid: false, // use this geom to make gridlines
    orient: "ab",
    yint: null,
    xint: null,
    slope: null,
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
        // these data will be nested, so just get
        // info from the first one
        _.mapValues(arr[0], function(v, k){
          out[k] = v;
        })
        var v = geom.orient() == 'horizontal' ? geom.yVar():geom.xVar();
        out[v] = fun(_.map(arr, function(d) {
          return d[v];
        }))
        return [out]
      }
    }
    return agg
  }
  // function to recurse output of agg function and return
  // bottom leaf
  // leaf will always contain an object with yVar or xVar
  function recurseNest(d){
    var v = geom.orient() == 'horizontal' ? geom.yVar():geom.xVar();
    if(_.contains(_.keys(d), v)){
      return d;
    } else {
      return _.flatten(_.map(d.values, function(val) {
          return recurseNest(val)
      }));
    }
  }
  var stats = {mean: aggregator(d3.mean),
    median: aggregator(d3.median),
    max: aggregator(d3.max),
    min: aggregator(d3.min)
  }

  // use area generators for lines
  // allowing variables to set the width if desired
  // y0 and y1 flank the center position by the 
  // width of the line/2
  // width for ordinal x axis doesn't make sense
  geom.selector = function() {
    var selector = geom.grid() ? "geom-grid":"geom-"
    if(geom.orient() == 'vertical') {
      selector += 'vert';
    } else if (geom.orient() === 'horizontal'){
      selector += 'horiz';
    } else if (geom.orient() === "ab"){
      selector += "ab";
    }
    selector += " order-" + geom.order()
    return selector;
  }

  geom.checkErrors = function(sel) {
    switch(geom.orient()){
      case "horizontal":
        if(!_.isUndefined(geom.chart().y().scale.rangeBand)){
          console.error("you are trying to draw a horizontal line on an ordinal y axis.")
          return true
        }
        break;
      case "vertical":
        if(!_.isUndefined(geom.chart().x().scale.rangeBand)){
          console.error("you are trying to draw a vertical line on an ordinal x axis.")
          return true
        }
        break;
      default:
        return false;
    }
  }
  geom.line = d3.svg.line()
                .x(function(d) { 
                  return d['xpos'];})
                .y(function(d) { 
                    return d['ypos'];});
  var usingFacet = false;
  function generateLineData(arr, orient) {
    var s1 = orient == "x" ? geom.x().scale: geom.y().scale,
        s2 = orient == "x" ? geom.y().scale: geom.x().scale,
        v1 = orient == "x" ? geom.xVar(): geom.yVar(),
        v2 = orient == "x" ? geom.yVar(): geom.xVar(),
        p1 = orient == "x" ? 'xpos': "ypos",
        p2 = orient == "x" ? "ypos": "xpos",
        data = [],
        hasRangeBand = !_.isUndefined(s2.rangeBand);
    if(_.all(_.map(arr, _.isNumber))){
      // array is a list of intercepts with no
      // color or group variables of interest
      // set color to something neutral
      if(geom.chart().color() == geom.color()){
        geom.color(d3.functor("gray"))
      }
      _.map(arr, function(d) {
        if(hasRangeBand){
          _.map(s2.domain(), function(oppAxisVal) {
            var o1 = {};
            o1[v1] = d;
            o1[v2] = oppAxisVal;
            o1[p1] = s1(d);
            o1[p2] = s2(oppAxisVal) + s2.rangeBand()/4;
            o2 = _.cloneDeep(o1);
            o2[p2] = s2(oppAxisVal) + s2.rangeBand()*3/4;
            data.push([o1,o2]);
          });
        } else {
          o1 = {};
          o1[v1] = d
          o1[v2] = s2.domain()[0];
          o1[p1] = s1(d);
          o1[p2] = s2(s2.domain()[0]);
          o2 = _.clone(o1);
          o2[v2] = s2.domain()[1];
          o2[p2] = s2(s2.domain()[1]);
          data.push([o1, o2]);
        }
      })
      usingFacet=false;
    } else if(_.all(_.map(arr, _.isObject))){
      _.map(arr, function(d) {
        if(hasRangeBand){
          var o1 = _.clone(d);
          o1[p1] = s1(d[v1]);
          o1[p2] = s2(d[v2]) + s2.rangeBand()/4;
          o2 = _.clone(o1);
          o2[p2] = s2(d[v2]) + s2.rangeBand()*3/4;
          data.push([o1,o2]);
        } else {
          var o1 = _.clone(d);
          o1[p1] = s1(d[v1]);
          o1[p2] = s2(s2.domain()[0]);
          o2 = _.clone(o1);
          o2[v2] = s2.domain()[1];
          o2[p2] = s2(s2.domain()[1]);
          data.push([o1, o2]);
        }
      })
      usingFacet = true
    } else {
      // vals is null
      // use data passed to geom to nest on relevent
      // groupings and draw line based on geom.stat()
      var nest = d3.nest()
                  .rollup(stats[geom.stat()])
      if(!_.isNull(geom.colorVar())){
        nest.key(function(d) { return d[geom.colorVar()]});
      }
      if(!_.isNull(geom.groupVar())){
        nest.key(function(d) { return d[geom.groupVar()]});
      }
      if(hasRangeBand){
        nest.key(function(d) { return d[v2]});
      }
      var tmp = _.flatten(_.map(nest.entries(geom.data()[0].values), 
                       recurseNest));
      _.map(tmp, function(o1) {
        if(hasRangeBand){
            o1[p2] = s2(o1[v2]) + s2.rangeBand()/4;
            o1[p1] = s1(o1[v1]);
            var o2 = _.clone(o1);
            o2[p2] = s2(o2[v2]) + s2.rangeBand()*3/4;
        } else {
          o1[p1] = s1(o1[v1]);
          o1[p2] = s2(s2.domain()[0]);
          var o2 = _.clone(o1);
          o2[p2] = s2(s2.domain()[1]);
        }
        data.push([o1, o2]);
      })
      usingFacet = true;
    }
    console.log(data)
    geom.lineData = data;
  }
  geom.prepData = function() {
    // nest to group the colors and groups and aggregate
    // needs refactoring, too hungover.
    // needs to handle array of intercepts,
    // array of objects w/ agg function
    // and array of objects no agg function
    geom.lineData = [];
    var plotDim = geom.chart().plotDim(geom.chart().attributes);
    switch(geom.orient()){
      case "horizontal":
        generateLineData(geom.vals(), "y")
          // data to be nested by all relevent variables
          // and aggregated according to geom.stat()
        break;
      case "vertical":
        generateLineData(geom.vals(), "x")
        break;
      case "ab":

        break;
      }
    }


  geom.draw = function(sel) {
    // throw an error if y-axis is not continuous
    var selector = geom.selector()
    // remove the paths if the geom isn't appropriate
    if(geom.checkErrors()) {
      sel.select('.chart').selectAll('path.' + selector.replace(" ", "."))
        .transition().duration(geom.transitionTime())
        .style('opacity', 0)
        .remove()
      return
    }
    geom.prepAxes(sel);
    geom.prepData();
    if(usingFacet){
      if(!_.isNull(geom.facet())){
        geom.lineData = _.filter(geom.lineData, function(d) {
          return (d[0][geom.facet()] + '-' + geom.chart().id()) == sel.attr('id')
        })
      }
    }
    // do this because we want to append a line per
    // entry in data. the generators expect arrays

    var paths = sel.select('.chart')
                  .selectAll("path." + selector.replace(" ", "."))
                  .data(geom.lineData);
    paths
      .transition().duration(geom.transitionTime())
      .attr('d', geom.line)
      .attr('stroke', function(d) {
      return geom.color()(d[0][geom.colorVar()])
        });
    paths.enter().append('path')
      .style('opacity', 0)
      .attr('class', selector)
      .attr('d', geom.line)
      .attr('stroke', function(d) {
      return geom.color()(d[0][geom.colorVar()])
        })
      .transition().duration(geom.transitionTime())
      .style('opacity', geom.lineOpacity())
      .style('stroke-width', geom.lineWidth())
    paths.exit()
      .transition().duration(geom.transitionTime())
      .style(geom.transitionStyle())
      .remove();

  };
  return geom;
};
  