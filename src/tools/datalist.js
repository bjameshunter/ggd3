function DataList(data) {
  // needs to work for plots and layers.
  // takes nested data.

  // it's a layer and has it's own data
  var layer = (this instanceof ggd3.layer),
      facet = layer ? this.plot().facet(): this.facet(),
      x = facet.x(),
      y = facet.y(),
      by = facet.by(),
      selector,
      out;
  if((x && !y) || (y && !x)){
    selector = x ? x + "-": y + "-";
    return data.map(function(d) {
      return {selector: cleanName(selector + d.key),
        data: d.values};
    });

  } else if(x && y) {
    // loop through both levels
    out = [];
    data.forEach(function(l1) {
      var selectX = x + "-" + l1.key;
      l1.values.forEach(function(l2) {
        var s = cleanName(y + "-" + l2.key + "_" + selectX);
        out.push({selector:s, data: l2.values});
      });
    });
    return out;
  } else if(x && y && by){
    // nothing yet
  }
  if(!x && !y){
    return [{selector: 'single', data: this.data()}];
  }
}
