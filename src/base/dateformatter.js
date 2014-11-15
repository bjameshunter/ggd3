ggd3.tools.dateFormatter = function(v, format) {
  if(format === "%Y") {
    return new Date(v, 0, 0, 0);
  } else {
    return new Date(v);
  }
};