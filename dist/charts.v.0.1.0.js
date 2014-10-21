!function() {
  var charts = {version: "0.1.0",
                util: {}, 
                geom: {},
                tools: {},
                layouts: {},
                };
  function createAccessor(attr){
    function accessor(value){
      if(!arguments.length){ return this.attributes[attr];}
        this.attributes[attr] = value;
      return this;
    }
    return accessor;
  }


charts.tools.Axis = function(position, obj, data, specs) {
  var chart = obj.chart ? obj.chart(): obj,
      attributes = {
        orient: position == 'x' ? chart.axesPosition()[0]:
          chart.axesPosition()[1],
        type: 'linear'
      },
      plotDim = chart.plotDim(chart.attributes)
      dim = position == "x" ? [0, plotDim.width]:
                             [plotDim.height, 0];
  if(typeof specs === "object"){
    for(var attr in specs){
      attributes[attr] = specs[attr];
    }
  };

  this.attributes = attributes;
  for(var attr in attributes){
    if((!this[attr] && attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  };
  if(this.type() == "linear"){
    this.scale = d3.scale[this.type()]()
                  .range(dim)
                  .domain(charts.tools.domain(data,
                          true, true, true))
                  .nice();
  } else if (this.type() == "ordinal"){
    this.scale = d3.scale[this.type()]()
                  .rangeRoundBands(dim)
                  .domain(_.sortBy(_.unique(data)));
  }
  this.axis = d3.svg.axis()
              .orient(attributes.orient)
              .scale(this.scale);
  return this;
};


// don't really know why this inherits from Starter
// may combine them
// need to mount a bunch of private variable info
// to see what needs to be updated within
// chart.draw
charts.chart = function(specs){
    var attributes = {
      xAdjust: true,
      yAdjust: true,
      brush: true,
      brushRange: null,
      grid: true,
      legend: true,
      geom: [],
      sizeFree: false,
      xFormat: d3.format("2,.1f"),
      yFormat: d3.format("2,.1f"),
    };

    if(typeof specs === "object"){
      for(var attr in specs){
        attributes[attr] = specs[attr];
      }
    }
    // pass defaults to Starter
    var chart = new charts.util.BaseChart(attributes);

    chart.setGeoms = function () {
      // geoms inherit attributes from chart if those 
      // attributes are not declared on the geom
      // when updating a chart, reset variables on the 
      // FIRST geom - those will be passed to the chart
      // object during this step.
      var geoms = chart.geom(),
          // array of features geoms inherit
          inherit = ["sizeVar", "sizeRange",
          "xVar", "yVar", "colorVar", "facet"]; 
      for(var i = 0; i < geoms.length; i++){
        if(typeof geoms[i] !== "object"){
          // default geom
          var geom = new charts.geom[chart.geom()[i]]()
                            .chart(chart);
          inherit.forEach(function(d) {
            if(geom.hasOwnProperty(d) & _.isNull(geom[d]())){
              geom[d](chart[d]());
            }
          })
        } else {
          // allow chart-level declarations
          // to pass to geom if not declared on geom
          var geom = chart.geom()[i]
                        .chart(chart);
          inherit.forEach(function(d) {
            if(geom.hasOwnProperty(d) & _.isNull(geom[d]())){
              geom[d](chart[d]());
            }
          })
        }
        geom.order(i);
        geoms[i] = geom;
        chart.xVar(geoms[0].xVar())
        chart.yVar(geoms[0].yVar())
        geoms[0].first(true);
        chart.geom(geoms);
      }
    };
    chart.reCalculate = function(){
      // iterates through dataset and 
      // sets dtype object on chart.
      // this is performed every time .data() is called
      // with an argument. Data must be the last thing
      // added to the chart because this step requires
      // knowing about the geoms
      chart.setGeoms();
      var data = charts.tools.setDataTypes(chart);
      if(!_.isNull(chart.facet())){
        chart.facets(_.unique(_.map(data, 
                      function(d) {
                        return d[chart.facet()];
                      })
                    )
        );
        chart.attributes.data = d3.nest()
                                .key(function(d) {
                                  return d[chart.facet()];
                                })
                                .entries(data)
      } else {
        chart.attributes.data = [{"key":"single", "values":data}];
      }
    }
    chart.prepAxes = function(sel) {
      // a lot of passing through the data
      // find a way to do it as little as possible
      // add switch to not calculate this
      // when zooming an axis.
      if(chart.scales()){
        // are any of the scales declared at chart level?
        // if so, just scan the dataset once and 
        // coerce and record all datatypes
        var ex = charts.tools.prepAxes(chart),
            dtypes = chart.dtypes(),
            specs;
      }
      // if x axis is fixed across facets
      if(!chart.xFree()){
        specs = charts.tools.defineAxis(chart.xVar(), chart);
        if(specs.type == 'ordinal'){
          sel.selectAll('.xadjust').remove();
        }
        chart.x(new charts.tools.Axis('x', chart, 
                ex.xExtent, specs))
      }
      // if y axis is fixed across facets
      if(!chart.yFree()){
        specs = charts.tools.defineAxis(chart.yVar(), chart);
        if(specs.type == 'ordinal'){
          sel.selectAll('.yadjust').remove();
        }
        chart.y(new charts.tools.Axis('y', chart, 
                ex.yExtent, specs))
      }
      // always set sizeVar
      chart.size().domain(ex.sExtent.length > 0 ? 
                          d3.extent(ex.sExtent):
                          d3.extent([1]))
                  .range(d3.extent(_.flatten(
                         [chart.sizeRange()])))
      // add setting color here      
    }
    chart.draw = function(sel) {
      sel.each(function() {
        // get x and y domains
        // if not xFree and yFree, set chart-level axes;
        var data = chart.data();
        charts.util.Frame(sel, chart);
        chart.svgs = sel.selectAll('svg.plot')
        // first set chart-level axes if we want them
        // if we don't, the first geom will set them
        chart.setGeoms();
        chart.prepAxes(sel);
        // doing all the data stuff before drawing
        // would allow cool things like ggplot free_space
        // each geom makes its own axis
        // only the first in the series gets drawn.
        // subsequent geoms will inherit first axes
        var geoms = chart.geom();
        chart.svgs
          .each(function(d, i) {
            var s = d3.select(this);
            geoms.forEach(function(geom){
              // reset data
              geom = geom.data(data.filter(function(e) {
                return e.key == d;
              }));
              s.call(geom.draw);
            });
            // only call axes for first geom
            s.select('.x-axis')
              .transition().duration(chart.transitionTime())
              .call(geoms[0].x().axis);
            s.select('.y-axis')
              .transition().duration(chart.transitionTime())
              .call(geoms[0].y().axis);
          });

      });

    };
    return chart;
  };

charts.util.Frame = function Frame(selection, chart) {
  // returns a array of svg selections or a single svg
  // each with a clipPath with id set to "<facet>-clip"

  var id = selection.attr('id'),
      div = selection.selectAll('div.outer')
              .data([1]),
      facet = chart.facets(),
      plotDim = chart.plotDim(chart.attributes),
      margin = chart.margin();
  div.attr('id', 'frame-' + id)
     .attr('class', 'outer');
  div.enter().append('div')
     .attr('class', 'outer')
     .attr('id', 'frame-' + id)
     .each(function(d) {
      d3.select(this).insert('div', "*")
       .attr('id', 'legend-' + id)
       .call(legend);
     });
  div.exit().remove();
  // not to be kept here
  function legend(div){
    div.style('width', 50)
      .style('height', 50)
      .append('svg')
      .append('rect')
      .attr('width', 50)
      .attr('height', 50)
      .attr('fill', 'orange');
  $(div.node()).draggable({containment: "parent"});
  }
  function setup(svg){
    var defs = svg.selectAll('defs')
                .data([1]),
        gch = svg.selectAll('g.chart')
                .data([1]),
        gx = svg.selectAll('g.x-axis')
                .data([1]),
        gy = svg.selectAll('g.y-axis')
                .data([1]),
        axesPosition = chart.axesPosition(),
        gxTranslate = axesPosition[0] == "bottom" ? 
          [margin.left, margin.top + plotDim.height]:
          [margin.left, margin.top],
        gyTranslate = axesPosition[1] == "left" ?
          [margin.left, margin.top]:
          [margin.left + plotDim.width, margin.top];

    defs.select('rect')
      .attr('width', plotDim.width)
      .attr('height', plotDim.height);
    defs.enter()
      .append('defs')
      .append('clipPath')
      .attr('id', function(d) {
        return d + "-" + "clip";
      })
      .append('rect')
      .attr('width', plotDim.width + 1)
      .attr('height', plotDim.height + 1);
    gch
      .attr('class', 'chart')
      .attr('transform', 'translate(' + 
            plotDim.translate + ")")
      .attr('clip-path', function(d) {
        return 'url(#' + d + "-clip)";
      });
    gch.enter().append('g')
      .attr('class', 'chart')
      .attr('transform', 'translate(' + 
            plotDim.translate + ")")
      .attr('clip-path', function(d) {
        return 'url(#' + d + "-clip)";
      });
    gy.attr('transform', "translate(" + 
            gyTranslate + ")");
    gy.enter().append('g')
      .attr('class', 'y-axis')
      .attr('transform', "translate(" + 
            gyTranslate + ")");
    gx.attr('transform', "translate(" + 
            gxTranslate + ")");
    gx.enter().append('g')
      .attr('class', 'x-axis')
      .attr('transform', "translate(" + 
            gxTranslate + ")");
    if(chart.xAdjust()){
      if(axesPosition[0]=="top"){
        gxTranslate[1] = gxTranslate[1] - margin.top;
      }
      charts.tools.makeZoomRect(svg, chart, 'xadjust',
                               plotDim.width, margin.bottom,
                               gxTranslate)
    }
    if(chart.yAdjust()){
      if(axesPosition[1] == "left"){
        gyTranslate[0] -= margin.left;
      }
      charts.tools.makeZoomRect(svg, chart, 'yadjust',
                               margin.left, plotDim.height,
                               gyTranslate)
    }
    if(chart.brush()){
      var br = svg.select('.chart')
                  .selectAll('rect.brushframe').data([1]);
      br.attr('width', plotDim.width)
        .attr('height', plotDim.height);
      br.enter().append('rect')
          .attr('class', 'brushframe')
          .attr('width', plotDim.width)
          .attr('height', plotDim.height);
    }
  }
  var svg = div.selectAll('svg.plot')
        .data(facet ? facet:['single'], _.identity);
  svg
    .each(function(d) {
      d3.select(this)
        .attr({width:chart.width(), height:chart.height()})
        .call(setup);
    });
  svg.enter()
    .append('svg')
    .attr({width:0, height:0, 'fill-opacity':0})
    .each(function(d) {
      d3.select(this)
        .attr('class', 'plot')
        .attr({width:chart.width(), height:chart.height(), 'fill-opacity':1})
        .attr('id', function(d) {
          return d + '-' + id;
        })
        .call(setup);
    });
  // transitioning through different datasets presents
  // a headache I don't want right now.
  svg.exit()
    // .transition().duration(500)
    // .style('opacity', 0)
    .remove();

};


charts.tools.setDataTypes = function(obj) {
  // returns dataset coerced according to chart.dtypes()
  // or some logic.
  // also adds jitter if necessary
  // add an object on chart that allows tooltip summaries
  // of arbitrary numeric values.
  var vars = {},
      dtypeDict = {"number": parseFloat, "integer": parseInt,
          "date": Date, "string": String},
      chart = obj.chart ? obj.chart(): obj,
      data = obj.data(),
      dtypes = chart.dtypes(),
      keys = _.keys(dtypes),
      dkeys = _.keys(data[0]),
      yVars = _.map(chart.geom(), function(g) {
        return g.yVar();
      }),
      xVars = _.map(chart.geom(), function(g) {
        return g.xVar();
      });

  // is the data already in a nested structure ?
  // if so, skip all

  dkeys.forEach(function(v){
    if(!_.contains(keys, v)) vars[v] = [];
  });
  data.forEach(function(d) {
    _.mapValues(vars, function(v,k) {
      return vars[k].push(d[k])
    })
  });
  _.mapValues(vars, function(v,k) {
    vars[k] = dtype(v);
  })
  dtypes = _.merge(dtypes, vars);

  data.forEach(function(d) {
    _.mapValues(dtypes, function(v,k) {
      if(dtypeDict[dtypes[k][0]] === "date"){
        d[k] = new Date(d[k]);
      } else {
        d[k] = dtypeDict[dtypes[k][0]](d[k]);
      }
      if(_.contains(xVars, k)){
        d['jitter-x'] = _.random(-1,1,true);
      }
      if(_.contains(yVars, k)){
        d['jitter-y'] = _.random(-1,1,true);
      }
    })
  });
  function dtype(arr) {
    var numProp = [],
        dateProp = [];
    // for now, looking at random 1000 obs.
    _.map(_.sample(arr, arr.length > 1000 ? 1000:arr.length), 
          function(d) {
      numProp.push(!_.isNaN(parseFloat(d)));
    })
    numProp = numProp.reduce(function(p,v) { 
      return p + v; }) / (arr.length > 1000 ? 1000: arr.length);
    var lenUnique = _.unique(arr).length
    // handle floats v. ints and Dates.
    // if a number variable has fewer than 20 unique values
    // 
    if(numProp > 0.95 & lenUnique > 20){
      return ["number", "many"];
    } else if (numProp > 0.95) {
      return ['number', 'few'];
    } else if (lenUnique > 20) {
      return ["string", "many"];
    } else if (lenUnique < 20) {
      return ["string", "few"];
    }
  }
  return data;
};
charts.util.BaseChart = function (newAttributes) {
  var attributes = {
    width: 600,
    height: 400,
    margin: {top:40, bottom:40, left:40, right:40},
    id: 'chart_id',
    legend: true,
    facet: null,
    facets: null,
    legendPosition: 'bottom',
    legendId: function() {
      return chart.id() + "-legend";
    },
    x: null,
    xVar: null,
    xZero: false,
    xFree: false,
    xAdjust: false,
    xTitle: null,
    y: null,
    yVar: null,
    yZero: false,
    yFree: false,
    yAdjust: false,
    yTitle: null,
    size: d3.scale.linear(),
    sizeVar: null,
    sizeRange: [3, 10],
    sizeFree: false,
    color: d3.scale.category10(),
    colorVar: null,
    colorFree: false,
    group: null, // arbitrary groups, not necessarily color
    toolTitle: null,
    toolContent: null,
    brush: true,
    dtypes: {},
    newData: true,
    transitionTime: 500,
    transitioning: false,
    axesOrient: ['bottom', 'left'],
    axesPosition: ["bottom", 'left']
  };
  // overwrite or add new elements to default settings.
  if(typeof newAttributes === "object"){
    for(var attr in newAttributes){
      attributes[attr] = newAttributes[attr];
    }
    delete attr;
  }
  this.attributes = attributes;
  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
};

// calculate shape of actual plot area within svg.
charts.util.BaseChart.prototype.plotDim = function(attributes) {
    return {
    width: (attributes.width - attributes.margin.left - 
            attributes.margin.right),
    height: (attributes.height - attributes.margin.top - 
             attributes.margin.bottom),
    translate: [attributes.margin.left, 
                  attributes.margin.top]
    };
  };
// data getter/setter to 
// recalculate when data is set.
charts.util.BaseChart.prototype.data = function(data){
      if(!arguments.length){ return this.attributes.data; }
      this.attributes.data = data;
      this.reCalculate();
      this.newData(false);
      return this;
  };

// function returning whether we're constructing
// any top level scales
charts.util.BaseChart.prototype.scales = function() {
      return _.any([!this.xFree(), !this.yFree(),
                   !this.sizeFree(), !this.colorFree()])
    }

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
  

charts.geom.BaseGeom = function (specs){
  // geom should inherit from the chart it lives in.
  var attributes = {
    data: null,
    width: null,
    height: null,
    chart: null,
    xFormat: null,
    yFormat: null,
    xVar: null,
    yVar:null,
    x: null,
    y: null,
    size: d3.scale.linear(),
    sizeVar: null,
    sizeRange: null,
    colorVar: null,
    color: d3.scale.category10(),
    group: null,
    facet: null,
    toolTitle: function(d) {
      if(chart.facet()){
        return "<h4>" + d[chart.facet()] + "</h4>";
      }else if(chart.colorVar()){
        return "<h4>" + d[chart.nestVar()] + "</h4>";
      }
    },
    toolContent: function(d) {
      return chart.nestVar() + ": " + d[chart.nestVar()] +
      "<br>" + chart.xVar() + ": " + charts.tools.round(d[chart.xVar()]) + 
      "<br>" + chart.yVar() + ": " + charts.tools.round(d[chart.yVar()]);
    },
    legendSize: 12,
    transitionTime: 500,
    transitionStyle: {opacity: 0},
    newData: true,
    geom: null, // just add more geoms!?
    // sure - check if it has parent geoms, take their
    // width/height, if not, use chart width / height
    // can also declare a null geom on which we mount
    // other geoms.
    first: false,
    order: 0
  };
  // overwrite or add new elements to default settings.
  if(typeof specs === "object"){
    for(var attr in specs){
      attributes[attr] = specs[attr];
    }
    delete attr;
  }
  for(var attr in attributes){
    if((!this[attr] && attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  // prepAxes is an overloaded name, present in tools
  // and chart as well. It gets the chart and geom-level
  // data extents/domains and applies them to axes.
  this.prepAxes = function(sel) {
    // need to solidify conditions under which
    // top-level axes get overridden by geom level data
    // for the time being, they are below

    var chart = this.chart(),
        size = chart.sizeFree(),
        x = chart.xFree(),
        y = chart.yFree(),
        color = chart.colorFree(),
        specs;
    if(_.any([x, y, color, size])){
      var ex = charts.tools.prepAxes(this)
    }
    if(size){
      // size is always a continuous variable
      this.size().domain(ex.sExtent.length > 0 ? 
                          d3.extent(ex.sExtent):
                          d3.extent([1]))
                .range(d3.extent(_.flatten(
                         [this.sizeRange()])));
    } else {
      this.size(chart.size())
    }
    if(x){
      specs = charts.tools.defineAxis(this.xVar(), this)
      // zooming on ordinal axis doesn't make sense, yet
      // so remove xadjust or yadjust if it exists
      if(specs.type=='ordinal'){
        sel.select('.xadjust').remove();
      }
      this.x(new charts.tools.Axis('x', this, 
             ex.xExtent, specs));

    } else {
      this.x(chart.x())
    }
    if(y){
      specs = charts.tools.defineAxis(this.yVar(), this)
      if(specs.type=='ordinal'){
        sel.select('.yadjust').remove();
      }
      this.y(new charts.tools.Axis('y', this, 
             ex.yExtent, specs));
    } else {
      this.y(chart.y())
    }
    if(color){
      // use existing colorscale on default geom obj
    } else {
      this.color(chart.color())
    }
  }
  // make custom data accessor to do 
  // recalculations when necessary
  this.reCalculate = function() {

  }
  this.attributes = attributes;
  this.data = function(data){
      if(!arguments.length){ return this.attributes.data; }
      this.attributes.data = data;
      this.newData(true);
      // is geom going to have it's own recalculate function?
      this.reCalculate();
      this.newData(false);
      return this;
  }
  return this;
}


// geom hline will only make sense on charts with continuous
// y axes(date or numeric), so check that at the start and throw an 
// error 
charts.geom.hline = function() {
  return charts.geom.abLine
}()
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
  

charts.geom.vline = function() {
  return charts.geom.abline
}()
  if(typeof module === "object" && module.exports){
    // package loaded as node module
    // charts.chart.scatter = require('./scatter.js').scatter;
    this.charts = charts;
    module.exports = charts;
  } else {
    // file is loaded in browser.
    this.charts = charts;
  }
}();
