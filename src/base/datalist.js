function DataList() {
  // needs to work for plots and layers.
  // I think this should be cheap enought to not 
  // worry about executing a few times per draw.
  // it's a layer and doesn't have it's own data
  if((this instanceof ggd3.layer) && !this.ownData()) {
    this.data(this.plot().data());
  }
  // it's a layer and has it's own data
  if((this instanceof ggd3.layer) && this.ownData()){
    this.attributes.data = this.plot().nest(this.data());
  }
  var facet = (this instanceof ggd3.layer) ? this.plot().facet(): this.facet(),
      x = facet.x(),
      y = facet.y(),
      by = facet.by(),
      selector;
  if((x && !y) || (y && !x)){
    selector = x ? x + "-": y + "-";
    return _.map(this.data(), function(d) {
      return {selector: selector + d.key,
        data: d};
    });

  } else if(x && y) {
    // loop through both levels
    data = [];
    _.each(this.data(), function(l1) {
      var selectX = x + "-" + l1.key;
      _.each(l1.values, function(l2) {
        var s = y + "-" + l2.key + "_" + selectX;
        data.push({selector:s, data: l2.values});
      });
    });
    return data;
  } else if(x && y && by){
    // nothing yet
  }
  if(!x && !y){
    console.log("neither x nor y");
    return [{selector: 'single', data: this.data()}];
  }
}
