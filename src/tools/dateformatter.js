ggd3.tools.dateFormatter = function(v, format) {
  if(format === "%Y" && v.constructor !== Date) {
    return new Date(v, 0, 1, 0);
  }
  return new Date(v);
};