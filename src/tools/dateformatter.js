ggd3.tools.dateFormatter = function(v, format) {
  if(format === "%Y" && !_.isDate(v)) {
    return new Date(v, 0, 1, 0);
  }
  return new Date(v);
};