
charts.geom.hline = function() {
  var h = new charts.geom.abLine()
                  .orient('horizontal')
                  .stat('mean');
  return h;
}
