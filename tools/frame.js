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
