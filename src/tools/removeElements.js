ggd3.tools.removeElements = function(sel, layerNum, element) {
  var remove = sel.select('.plot')
                    .selectAll('.geom.g' + layerNum)
                    .filter(function() {
                      return d3.select(this)[0][0].nodeName !== element;
                    });
  remove.transition().duration(1000)
    .style('opacity', 0)
    .remove();
};
