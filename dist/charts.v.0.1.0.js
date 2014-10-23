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
          "xVar", "yVar", "colorVar", "facet", "lineWidth"]; 
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

        if(chart.grid()){
          if(!_.isUndefined(chart.x().scale.ticks)) {
            var grid = new charts.geom.vline()
                          .vals(chart.x().scale.ticks())
                          .chart(chart)
                          .xVar(chart.xVar())
                          .yVar(chart.yVar())
                          .grid(true)
            chart.svgs.each(function() {
              d3.select(this).call(grid.draw)
            })
          } else {
            chart.svgs.each(function() {
              d3.select(this).selectAll('.geom-grid-vert')
                .transition().duration(chart.transitionTime())
                .style('opacity', 0)
                .remove()
            })
          }
          if(!_.isUndefined(chart.y().scale.ticks)) {
            var grid = new charts.geom.hline()
                          .vals(chart.y().scale.ticks())
                          .chart(chart)
                          .xVar(chart.xVar())
                          .yVar(chart.yVar())
                          .grid(true)
            chart.svgs.each(function() {
              d3.select(this).call(grid.draw)
            })
          } else {
            chart.svgs.each(function() {
              d3.select(this).selectAll('.geom-grid-horiz')
                .transition().duration(chart.transitionTime())
                .style('opacity', 0)
                .remove()
            })
          }
        }
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

  var id = chart.id(),
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
  function setup(svg, d){
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
    defs.select('rect')
      .attr('width', plotDim.width)
      .attr('height', plotDim.height);
    defs.enter()
      .append('defs')
      .append('clipPath')
      .attr('id', function() {
        return d + "-" + "clip";
      })
      .append('rect')
      .attr('width', plotDim.width + 2)
      .attr('height', plotDim.height + 1);
    gch
      .attr('class', 'chart')
      .attr('transform', 'translate(' + 
            plotDim.translate + ")")
      .attr('clip-path', function() {
        return 'url(#' + d + "-clip)";
      });
    gch.enter().append('g')
      .attr('class', 'chart')
      .attr('transform', 'translate(' + 
            plotDim.translate + ")")
      .attr('clip-path', function() {
        return 'url(#' + d + "-clip)";
      });
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
        .call(setup, d);
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
        .call(setup, d);
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
    lineWidth: 2,
    color: d3.scale.category10(),
    colorVar: null,
    colorFree: false,
    groupVar: null, // arbitrary groups, not necessarily color
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
    yints: null,
    xints: null,
    slopes: null,
    singleColor: "grey"
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
      selector += '-vert';
    } else if (geom.orient() === 'horizontal'){
      selector += '-horiz';
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
      case "ab":
        if(!_.isUndefined(geom.chart().x().scale.rangeBand) | 
           !_.isUndefined(geom.chart().y().scale.rangeBand)){
          console.error("both x and y must be continuous")
          return true;
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
    var plotDim = geom.chart().plotDim(geom.chart().attributes);
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
        if(hasRangeBand & !geom.grid()){
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
          o1[p2] = s2.range()[0];
          o2 = _.clone(o1);
          o2[v2] = s2.domain()[1];
          o2[p2] = s2.range()[1];
          if(geom.grid() & !_.isUndefined(s2.rangeExtent)) {
            o1[p2] = orient!="x" ? s2.rangeExtent()[0]:s2.rangeExtent()[1];
            o2[p2] = orient=="x" ? s2.rangeExtent()[0]:s2.rangeExtent()[1];
          }
          data.push([o1, o2]);

        }
      })
      usingFacet=false;
    } else if(_.all(_.map(arr, _.isObject))){
      // they are objects
      _.map(arr, function(d) {
        if(hasRangeBand & !geom.grid()){
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
    geom.lineData = data;
  }
  geom.prepData = function() {
    // nest to group the colors and groups and aggregate
    // needs refactoring, too hungover.
    // needs to handle array of intercepts,
    // array of objects w/ agg function
    // and array of objects no agg function
    geom.lineData = [];
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
        // yints or xints and slopes
        if(!_.isNull(geom.xints()) & !_.isNull(geom.yints())){
          throw "specifying both yints and xints is not allowed"
        }
        // we don't want to use main color scale
        if(geom.chart().color() == geom.color()){
          geom.color(d3.functor(geom.singleColor()))
        }
        var intercepts = _.isNull(geom.xints()) ? geom.yints(): geom.xints(),
            intName = _.isNull(geom.xints()) ? "ypos": "xpos",
            otherName = !_.isNull(geom.xints()) ? "ypos": "xpos",
            scale = _.isNull(geom.xints()) ? geom.x().scale: geom.y().scale,
            scale2 = !_.isNull(geom.xints()) ? geom.x().scale: geom.y().scale,
            domain = scale.domain();
        if(intercepts.length !== geom.slopes().length){
          throw "intercepts must be the same length as slopes"
        }

        var points = _.zip(intercepts,
                           geom.slopes());
        var data = _.map(points, function(p) {
          return _.map(domain, function(d) {
            return _.zipObject([intName, otherName], 
                    [scale2(d*p[1] + p[0]), scale(d)])
            })
        });
        geom.lineData = data;

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
    var plotDim = geom.chart().plotDim(geom.chart().attributes);
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
    paths = paths.selectAll("path." + selector.replace(" ", "."))
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
    lineWidth: 5,
    groupVar: null,
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



charts.geom.hline = function() {
  var h = new charts.geom.abLine()
                  .orient('horizontal')
                  .stat('mean');
  return h;
}

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
  
charts.geom.smooth = function() {
  var v = new charts.geom.abLine()
                  .orient('vertical')
  // overwrite prepData
  // to deliver linear or loess curves
  // with optional SE area.
  return v;
}


charts.geom.vline = function() {
  var v = new charts.geom.abLine()
                  .orient('vertical')
                  .stat('mean')
  return v;
}

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
