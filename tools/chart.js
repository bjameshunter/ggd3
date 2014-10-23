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
