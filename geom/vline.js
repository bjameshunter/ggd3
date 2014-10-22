charts.geom.vline = function() {
  var v = new charts.geom.abLine()
                  .orient('vertical')
                  .stat('mean')
  return v;
}
