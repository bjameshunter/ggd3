charts.geom.smooth = function() {
  var v = new charts.geom.abLine()
                  .orient('vertical')
  // overwrite prepData
  // to deliver linear or loess curves
  // with optional SE area.
  return v;
}
