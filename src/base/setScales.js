// only required by plot, no need to pass plot in.
// geom will already have it's scale available to it,
// regardless of whether it's layer has own data.
// probably no need to pass data in either.
// Plot knows it's facet, data and aes, therefore with 
// dataList, can get a list of facet ids and relevent data
// with which to make scales per facet if needed.
// if an aes mapping or facet mapping does exist in data
// throw error.
var aesMap = {
        x: 'xScale',
        y: 'yScale',
        color: 'colorScale',
        size: 'sizeScale',
      },
    scales = ['x', 'y', 'color', 'size'];

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
      data = this.dataList(),
      dtype,
      settings,
      // gather user defined settings in opts object
      opts = _.mapValues(aesMap, function(v, k) {
        // there is a scale "single" that holds the 
        // user defined opts and the fixed scale domain
        return that[v]().single._userOpts;
      });

  function makeScale(d, i) {
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
            for(var ax in settings.axis){
              if(scale.axis.hasOwnProperty(ax)){
                scale.axis[ax](settings.axis[ax]);
              }
            }
          }
          for(var s in settings.scale){
            if(scale.scale().hasOwnProperty(s)){
              scale.scale()[s](settings.scale[s]);
            }
          }
          that[aesMap[a]]()[d.selector] = scale;
          if(i === 0) {
            that[aesMap[a]]().single = scale;
          }
        } else {
          // copy scale settings, merge with default info that wasn't
          // declared and create for each facet if needed.
        } 
      }
    }
  }
  _.map(data, function(d,i) {return makeScale(d, i);});
  for(var a in aes) {
    // give user-specified scale settings to single facet
    that[aesMap[a]]().single._userOpts = _.cloneDeep(opts[a]);
  }
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
ggd3.tools.domain = function(data, rule, zero,
                             variable) {
  var extent, range;
  if(_.isUndefined(variable)){
    extent = d3.extent(data);
  } else {
    extent = d3.extent(_.pluck(data, variable));
  }
  if(!_.isUndefined(rule) && !_.isDate(extent[0]) ){
    range = Math.abs(extent[1] - extent[0]);
    if(rule === "left" || rule === "both"){
      extent[0] +=  0.1 * range;
    }
    if(rule === "right" || rule === "both"){
      extent[1] += 0.1 * range;
    }
  }
  return extent;
};

Plot.prototype.setDomains = function() {
  var aes = this.aes(),
      that = this,
      facet = this.facet(),
      layer = this.layers()[0],
      stat = layer.stat(),
      linearScales = ['log', 'linear', 'time', 'date'],
      domain,
      data,
      scale;
  for(var a in aes) {
    var scales = this[aesMap[a]]();
    if(facet.scales() !== "free_" + a &&
       facet.scales() !== "free"){
      data = ggd3.tools.unNest(this.data());
      if(_.contains(linearScales, scales.single.opts().type)){
        domain = ggd3.tools.domain(data, 'both', false, aes[a]);
      } else {
        // nest according ordinal axes, group, and color
        domain = _.unique(_.pluck(data, aes[a]));
      }
      for(scale in scales) {
        scales[scale].domain(domain);
      }
    } else {
      data = this.dataList();
      for(var d in data) {
        scale = scales[data[d].selector];
        if(_.contains(linearScales, scales.single.opts().type)){
          scale.domain(ggd3.tools.domain(_.pluck(data[d].data, aes[a])));
        } else {
          scale.domain(_.unique(_.pluck(data[d].data, aes[a])));
        }

      }
    }
  }
};
Plot.prototype.setScales = SetScales;
