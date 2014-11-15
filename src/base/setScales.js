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
      settings,
      // gather user defined settings in opts object
      opts = _.mapValues(aesMap, function(v, k) {
        return that[v]();
      });
  console.log(opts);

  function makeScale(d, aesthetic) {
    // rescale all aesthetics
    // need to allow the scale settings from plot object to 
    // take precedence over this, if scale config is 
    // passed to xScale, yScale, colorScale or sizeScale
    for(var a in aes){
      if(_.contains(scales, a)){
        // user is not specifying a scale.
        if(!(that[aesMap[a]]() instanceof ggd3.scale)){
          // get plot level options set for scale.

          dtype = that.dtypes()[aes[a]];
          settings = _.merge(ggd3.tools.defaultScaleSettings(dtype, a),
                             opts[a]);
          var scale = new ggd3.scale(settings)
                              .plot(that)
                              .aesthetic(a);
          if(_.contains(['x', 'y'], a)){
            if(a === "x"){
              scale.range([0, that.plotDim().x]);
            }
            if(a === "y") {
              scale.range([that.plotDim().y, 0]);
            }
            scale.axis = d3.svg.axis().scale(scale.scale());
          }
          for(var ax in settings.axis){
            if(scale.axis.hasOwnProperty(ax)){
              scale.axis[ax](settings.axis[ax]);
            }
          }
          for(var sc in settings.scale){
            if(scale.scale.hasOwnProperty(sc)){
              scale.scale()[ax](settings.scale[sc]);
            }
          }
          if(_.contains(['linear', 'log', 'time'], settings.type)){
            if(facet.scales() === "free" || 
               facet.scales() === "free_" + a) {
              scale.domain(d3.extent(_.pluck(d.data, aes[a])));
            } else {
              scale.domain(d3.extent(
                              _.pluck(
                                ggd3.tools.unNest(that.data()), aes[a])));     
            }
          } else {
            // scale is ordinal
            if(facet.scales() === "free" || 
               facet.scales() === "free_" + a) {
              scale.domain(_.unique(_.pluck(d.data, aes[a])));
            } else {
              scale.domain(_.unique(
                              _.pluck(
                                ggd3.tools.unNest(that.data()), aes[a])));              
            }
          }
          that[aesMap[a]]()[d.selector] = scale;
        } else {
          // copy scale settings, merge with default info that wasn't
          // declared and create for each facet if needed.
        } 
      }
    }
  }
  // for(var a in aes) {
  //   // reset all scales to empty object
  //   that[aesMap[a]]({});
  // }
  _.map(data, function(d,i) {return makeScale(d);});
}

ggd3.tools.defaultScaleSettings = function(dtype, aesthetic) {
  function xyScale() {
    if(dtype[0] === "number") {
      if(dtype[1] === "many"){
        return {type: 'linear',
                  axis: {},
                  scale: {}};
      } else {
        return {type: 'ordinal',
                  axis: {},
                  scale: {rangeRoundBands: ""}};
      }
    }
    if(dtype[0] === "date"){
        return {type: 'time',
                  axis: {},
                  scale: {}};
    }
    if(dtype[0] === "string"){
        return {type: 'ordinal',
                  axis: {},
                  scale: {}};
    }
  }
  var s;
  switch(aesthetic) {
    case "x":
      s = xyScale(dtype);
      s.axis.position = "bottom";
      s.axis.orient = "bottom";
      return s;
    case "y":
      s = xyScale(dtype);
      s.axis.position = "left";
      s.axis.orient = "left";
      return s;
    case "color":
      return {type:"category10", 
            axis: {position:'none'},
            scale: {}};
    case "size":
      return {type: 'linear', 
             axis: {position:'none'},
             scale: {}};
  }
};
ggd3.tools.domain = function(data) {
  return d3.extent(data);
};
Plot.prototype.setScales = SetScales;
