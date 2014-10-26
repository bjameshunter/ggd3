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
          // when using same geom object across different
          // charts and datasets, everything needs to be reset.
          // this doesn't do that.
          // always update chart and facet.
          var geom = chart.geom()[i]
                        .chart(chart)
                        .facet(chart.facet())
          // with abLine, perhaps other geoms, 
          // important attributes should be reset.
          if(geom.newData()){
            inherit.forEach(function(d) {
              if(geom.hasOwnProperty(d)){
                geom[d](chart[d]());
              }
            })
          } else {
            inherit.forEach(function(d) {
              if(geom.hasOwnProperty(d) & _.isNull(geom[d]())){
                geom[d](chart[d]());
              }
            })
          }
        }
        geom.order(i);
        geoms[i] = geom;
        if (i == 0){
          chart.xVar(geoms[0].xVar());
          chart.yVar(geoms[0].yVar());
          chart.color(geoms[0].color());
          chart.x(geoms[0].x());
          chart.y(geoms[0].y());
        }
      }
      // always set chart x and y to first geoms x and y
      // the geom will decide which to use based on 
      // xFree and yFree
      geoms[0].first(true);
      chart.geom(geoms);
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
      specs = charts.tools.defineAxis(chart.xVar(), chart);
      if(specs.type == 'ordinal'){
        sel.selectAll('.xadjust').remove();
      }
      chart.x(new charts.tools.Axis('x', chart, 
              ex.xExtent, specs))
      specs = charts.tools.defineAxis(chart.yVar(), chart);
      if(specs.type == 'ordinal'){
        sel.selectAll('.yadjust').remove();
      }
      chart.y(new charts.tools.Axis('y', chart, 
              ex.yExtent, specs))
      chart.size().domain(ex.sExtent.length > 0 ? 
                          d3.extent(ex.sExtent):
                          d3.extent([1]))
                  .range(d3.extent(_.flatten(
                         [chart.sizeRange()])))
      // add setting color here      
    }
    // zoom should be called on the first geom's axis
    // if it is continuous and requested by user
    var makeZoom = function() {
      var zoomer = d3.behavior.zoom()[axis](scale)
      geom.svgs.each(function() {


      })

    }
    // do I add a chart.prepareChart method to 
    // set stuff up after adding all the settings?
    // chart.prepareChart() {
    //     chart.setGeoms();
    //     chart.prepAxes(sel);
    //     chart.makeZoome();
    // etc.

    // }
    chart.draw = function(sel, facet) {
      // sel is the topmost level element
      // div on which chart.draw is called.
      sel.each(function() {

        var data = chart.data();

        charts.util.Frame(sel, chart);
        if(!_.isUndefined(facet)) {
          chart.svgs = chart.svgs.filter(function(d) {
            return d == facet;
          })
        }
        // first set chart-level axes if we want them
        // if we don't, the first geom will set them
        chart.setGeoms();
        chart.prepAxes(sel);

        if(chart.grid()){
          if(!_.isUndefined(chart.x().scale.ticks)) {

            var xGrid = new charts.geom.vline()
                          .chart(chart)
                          .xVar(chart.xVar())
                          .yVar(chart.yVar())
                          .grid(true)
          }
          if(!_.isUndefined(chart.y().scale.ticks)) {
            var yGrid = new charts.geom.hline()
                          .chart(chart)
                          .xVar(chart.xVar())
                          .yVar(chart.yVar())
                          .grid(true)
          }
        }

        var geoms = chart.geom();
        chart.svgs
          .each(function(d, i) {
            var s = d3.select(this);
            // by now, chart.x and chart. y
            // should know whether they are free or not
            if(!_.isUndefined(chart.x().scale.ticks)){
              xGrid.vals(chart.x().scale.ticks())
                .data(data.filter(function(e) {
                return e.key == d;
              }))
              s.call(xGrid.draw)
            } else {
              s.selectAll(".geom-grid-vert")
                .transition().duration(chart.transitionTime())
                .style('opacity', 0)
                .remove()
            }
            if(!_.isUndefined(chart.y().scale.ticks)){
              yGrid.vals(chart.y().scale.ticks())
                .data(data.filter(function(e) {
                return e.key == d;
              }))
              s.call(yGrid.draw)
            } else {
              s.selectAll(".geom-grid-horiz")
                .transition().duration(chart.transitionTime())
                .style('opacity', 0)
                .remove()
            }
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
