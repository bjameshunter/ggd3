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
        fill: 'fillScale',
        shape: 'shapeScale',
        alpha: 'alphaScale',
      },
    measureScales = ['x', 'y', 'color','size', 'fill' ,'alpha'],
    linearScales = ['log', 'linear', 'time', 'date'],
    globalScales = ['alpha','fill', 'color', 'size', 'shape'];

function SetScales() {
  // do nothing if the object doesn't have aes, data and facet
  // if any of them get reset, the scales must be reset
  if(!this.data() || !this.aes() || !this.facet() ||
     _.isEmpty(this.layers()) ){
    return false;
  }
  // obj is a layer or main plot
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

  function makeScale(d, i, a) {
    if(_.contains(measureScales, a)){
      // user is not specifying a scale.
      if(!(that[aesMap[a]]() instanceof ggd3.scale)){
        // get plot level options set for scale.
        // if a dtype is not found, it's because it's x or y and 
        // has not been declared. It will be some numerical aggregation.
        dtype = that.dtypes()[aes[a]] || ['number', 'many'];
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
  _.each(_.union(['x', 'y'], _.keys(aes)), function(a) {
    return _.map(data, function(d,i) {return makeScale(d, i, a);});
  });
  for(var a in aes) {
    if(_.contains(measureScales, a)){
    // give user-specified scale settings to single facet
      that[aesMap[a]]().single._userOpts = _.cloneDeep(opts[a]);
    }
  }

}

ggd3.tools.defaultScaleSettings = function(dtype, aesthetic) {
  function xyScale() {
    if(dtype[0] === "number") {
      if(dtype[1] === "many"){
        return {type: 'linear',
                  axis: {tickFormat: d3.format(",.2f")},
                  scale: {}};
      } else {
        return {type: 'ordinal',
                  axis: {},
                  scale: {}};
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
  function legendScale() {
    if(dtype[0] === "number" || dtype[0] === "date") {
      if(dtype[1] === "many") {
        return {type: 'linear',
                axis: {position:'none'},
                scale: {}};
      } else {
        return {type: 'category10',
                axis: {position: 'none'},
                scale: {}};
      }
    }
    if(dtype[0] === "string") {
      if(dtype[1] === "many") {
        return {type:"category20",
                axis: {position: 'none'},
                scale: {}};
      } else {
        return {type:"category10",
                axis: {position: 'none'},
                scale: {}};
      }
    }
  }
  var s;
  switch(aesthetic) {
    case "x":
      s = xyScale();
      s.axis.position = "bottom";
      s.axis.orient = "bottom";
      return s;
    case "y":
      s = xyScale();
      s.axis.position = "left";
      s.axis.orient = "left";
      return s;
    case "color":
      return legendScale();
    case "fill":
      return legendScale();
    case "shape":
      return {type:"shape", 
            axis: {position:'none'},
            scale: {}};
    case "size":
      return {type: 'linear', 
             axis: {position:'none'},
             scale: {}};
    case "alpha":
      return {type: 'linear', 
             axis: {position:'none'},
             scale: {}};
  }
};

Plot.prototype.setDomains = function() {
  // when setting domain, this function must
  // consider the stat calculated on the data
  // nested, or not.
  // Initial layer should have all relevant scale info
  // 
  var aes = this.aes(),
      that = this,
      facet = this.facet(),
      layer = this.layers()[0], 
      stat = layer.stat().aes(layer.aes()),
      geom = layer.geom(),
      domain,
      data;
  _.each(_.union(['x', 'y'], _.keys(aes)), function(a) {
    if(_.contains(measureScales, a)) {
      var scales = that[aesMap[a]](),
          scale,
          nest = layer.geomNest()
                    .rollup(_.bind(stat.compute,stat)),
          data = that.dataList();
      // the aggregated values for fixed axes need to be 
      // calculated on faceted data. Confusing.
      if(facet.scales() !== "free_" + a &&
         facet.scales() !== "free" || (_.contains(globalScales, a)) ){
        data = _.flatten(_.map(data, function(d) {
          // this is a convoluted way to get an array of 
          // calculated values;
          // does nothing for text and point, groups 
          // and calcs for bars/boxes, etc.
          return ggd3.tools.unNest(nest.entries(d.data));
        }));

        if(_.contains(linearScales, scales.single.scaleType() )){
          domain = geom.domain(data, a);
        } else {
          // include warning about large numbers of colors for
          // color scales.
          domain = _.unique(_.pluck(data, aes[a]));
        }
        // is this what I'm supposed to do with log scales?
        for(scale in scales) {
          if(scales[scale].scaleType() === "log" && domain[0] <= 0){
            domain[0] = 1;
          }
          scales[scale].domain(domain);
        }
        // I guess I'm doing this mess in case, for some
        // stupid reason, I want free scales across
        // color, size, alpha, fill and shape
        if(_.contains(globalScales, a)) {
          if(_.contains(linearScales, 
                        that[aesMap[a]]().single.scaleType()) ){
            that[aesMap[a]]().single.range(that[a + "Range"]());
          }
          that[a](function(d) {
            var aes = that.aes();
            return that[aesMap[a]]().single.scale()(d[aes[a]]);
          });
        }
      } else {
        // free calcs will need to be done in the geom, I think.
        // this is calculated twice, unnecessarily.
        // different layouts may manipulate scale domains, such as
        // stack layout for stacked bars.
        _.each(data, function(d) {
          var grouped = ggd3.tools.unNest(nest.entries(d.data));
          domain = geom.domain(grouped, a);
          scale = scales[d.selector];
          if(_.contains(linearScales, scales.single.scaleType() )){
            scale.domain(domain);
          } else {
            scale.domain(_.unique(_.pluck(grouped, aes[a])));
          }
        });
      }
    }
  });
};

Plot.prototype.setScales = SetScales;
