// geom hline will only make sense on charts with continuous
// y axes(date or numeric), so check that at the start and throw an 
// error 
charts.geom.hline = function() {
  return charts.geom.abLine
}()