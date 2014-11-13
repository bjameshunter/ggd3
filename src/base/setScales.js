// only required by plot, no need to pass plot in.
// geom will already have it's scale available to it,
// regardless of whether it's layer has own data.
// probably no need to pass data in either.
// Plot knows it's facet, data and aes, therefore with 
// dataList, can get a list of facet ids and relevent data
// with which to make scales per facet if needed.
// if an aes mapping or facet mapping does exist in data
// throw error.
function SetScales() {

  // do nothing if the object doesn't have aes, data and facet
  // if any of them get reset, the scales must be reset
  if(!this.data() || !this.aes() || !this.facet()){
    console.log('not setting scales');
    return false;
  }
  // obj is a layer or main plot
  console.log('setting scales');
  var aes = this.aes(),
      that = this,
      facet = this.facet(),
      scales = ['x', 'y', 'color', 'size'],
      aesMap = {
        x: 'xScale',
        y: 'yScale',
        color: 'colorScale',
        size: 'sizeScale',
      },
      data = this.dataList(),
      dtype,
      settings;
  function makeScale(d, aesthetic) {
    // rescale all aesthetics
    // need to allow the scale settings from plot object to 
    // take precedence over this, if scale config is 
    // passed to xScale, yScale, colorScale or sizeScale
    for(var a in aes){
      if(_.contains(scales, a)){
        dtype = that.dtypes[aes[a]];
        settings = ggd3.tools.defaultScaleSettings(dtype, a);
        var scale = new ggd3.scale(settings.opts)
                            .type(a)
                            .scaleType(settings.type);
        that[aesMap[a]]()[d.selector] = scale;
      }
    }
  }
  for(var a in aes) {
    // reset all scales to empty object
    that[aesMap[a]]({});
  }
  _.map(data, function(d,i) {return makeScale(d);});
}
function xyScale(dtype) {
  if(dtype[0] === "number") {
    if(dtype[1] === "many"){
      return 'linear';
    } else {
      return 'ordinal';
    }
  }
  if(dtype[0] === "date"){
    return 'time';
  }
  if(dtype[0] === "string"){
    return 'ordinal';
  }
}
ggd3.tools.defaultScaleSettings = function(dtype, aesthetic) {
  switch(aesthetic) {
    case "x":
      var xOpts = {position: "bottom", 
                  orient: "bottom"};
      return {type: xyScale(dtype), opts: xOpts};
    case "y":
      var yOpts = {position: "left", 
                  orient: "left"};
      return {type: xyScale(dtype), opts: yOpts};
    case "color":
      return {type:"category10", opts: {position:'none'}};
    case "size":
      return {type: 'linear', opts: {position:'none'}};
  }
};
ggd3.tools.domain = function(data) {
  return d3.extent(data);
};
Plot.prototype.setScales = SetScales;
