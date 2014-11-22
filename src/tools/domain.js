ggd3.tools.domain = function(data, rule, zero,
                             variable) {
  var extent, range;
  if(_.isUndefined(variable)){
    extent = d3.extent(data);
  } else {
    extent = d3.extent(_.pluck(data, variable));
  }
  if(!_.isUndefined(rule) && !_.isDate(extent[0]) ){
    if(rule === "left" || rule === "both"){
      // zeroing negative only domain
      if(zero) { extent[1] = 0; }
      range = Math.abs(extent[1] - extent[0]);
      extent[0] -=  0.1 * range;
    }
    if(rule === "right" || rule === "both"){
      // zeroing positive only domain such as counts
      if(zero) { extent[0] = 0; }
      range = Math.abs(extent[1] - extent[0]);
      extent[1] += 0.1 * range;
    }
  }
  return extent;
};
