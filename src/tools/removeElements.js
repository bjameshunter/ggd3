ggd3.tools.removeElements = function(sel, layerNum, clss) {
  var remove = sel
                .select('.plot')
                .selectAll('.geom.g' + layerNum)
                .filter(function() {
                  return d3.select(this)[0][0].classList !== clss;
                });
  remove.transition()
    .style('opacity', 0)
    .remove();
};
