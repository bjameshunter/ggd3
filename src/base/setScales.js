// only required by plot, no need to pass plot in.
// geom will already have it's scale available to it,
// regardless of whether it's layer has own data.
// probably no need to pass data in either.
// Plot knows it's facet, data and aes, therefore with 
// dataList, can get a list of facet ids and relevent data
// with which to make scales per facet if needed.
// if an aes mapping or facet mapping does exist in data
// throw error.
var measureScales = ['x', 'y', 'color','size', 'fill' ,'alpha'],
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
      data = this.dataList(this.data()),
      dtype,
      settings,
      // gather user defined settings in opts object
      opts = _.zipObject(measureScales, 
        _.map(measureScales, function(a) {
        // there is a scale "single" that holds the 
        // user defined opts and the fixed scale domain
        return that[a + "Scale"]().single._userOpts;
      }));

  function makeScale(d, i, a) {
    if(_.contains(measureScales, a)){
      // user is not specifying a scale.
      if(!(that[a + "Scale"]() instanceof ggd3.scale)){
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
        that[a + "Scale"]()[d.selector] = scale;
        if(i === 0) {
          that[a + "Scale"]().single = scale;
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
      that[a + "Scale"]().single._userOpts = _.cloneDeep(opts[a]);
    }
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
  // consider the stat calculated on the data,
  // be it nested, or not.
  // Initial layer should have all relevant scale info
  // granted, that doesn't make a lot of sense.
  // rather, better idea to keep track of what aesthetics
  // have a scale set for it, and pass over if so.
  var aes = this.aes(),
      that = this,
      facet = this.facet(),
      layer = this.layers()[0],
      nest = layer.geomNest(), 
      stat = layer.stat(),
      geom = layer.geom(),
      domain,
      data = that.dataList(that.data()),
      scale;

  that.globalScales = globalScales.filter(function(s) {
    return _.contains(_.keys(aes), s);
  });
  that.freeScales = [];
  _.each(['x', 'y'], function(s) {
    if(!_.contains(['free', 'free_' + s], facet.scales()) ){
      that.globalScales.push(s);
    } else {
      that.freeScales.push(s);
    }
  });
  nest.rollup(function(d) {
    return stat.compute(d);
  });
  // each facet's data rolled up according to stat
  data = _.map(data, function(d) {
      d.data = ggd3.tools.unNest(nest.entries(d.data) );
      return d;
  });

  // free scales
  if(!_.isEmpty(that.freeScales)){
    _.map(data, function(d) {
      // data is now nested by facet and by geomNest
      _.map(that.freeScales, function(k){
        scale = that[k+ "Scale"]()[d.selector];
        if(_.contains(linearScales, 
           scale.scaleType()) ){
          scale.domain(geom.domain(d.data, k));
        } else {
          // gotta find a way to sort these.
          scale.domain(_.unique(_.pluck(d.data, aes[k])));
        }
      });
    });
  } else {
  }
  function first(d) {
    return d[0];
  }
  function second(d) {
    return d[1];
  }
  // calculate global scales
  _.map(that.globalScales, function(g){
    scale = that[g + "Scale"]().single;
    if(_.contains(linearScales, scale.scaleType())) {
      if(_.contains(globalScales, g)){
        // scale is fill, color, alpha, etc.
        // with no padding on either side of domain.
        domain = ggd3.tools.linearDomain(
                    _.flatten(
                      _.map(data, function(d) {
                        return d.data;
                      })), aes[g]);
        scale.domain(domain);
        if(_.contains(linearScales, scale.scaleType()) ){
          scale.range(that[g + 'Range']());
        }
      } else {
        // data must be delivered to geom's domain as faceted,
        // otherwise aggregates will be calculated on whole dataset
        // rather than facet. Here we're looking for max facet domains.
        domain = _.map(data, function(d) {
          return geom.domain(d.data, g);
        });
        domain = [_.min(_.map(domain, first)) ,
        _.max(_.map(domain, second))];
        scale.domain(domain);
      }
    } else {
      scale.domain(
              _.unique(
                _.pluck(
                  _.flatten(
                    _.map(data, 'data')), aes[g])));
    }
    for(var s in scale._userOpts.scale){
      if(scale.scale().hasOwnProperty(s)){
        scale.scale()[s](scale._userOpts.scale[s]);
      }
    }
    if(_.contains(globalScales, g)) {
      var aesScale = _.bind(function(d) {
        return this.scale()(d[aes[g]]);
      }, scale);
      that[g](aesScale);
    }
  });
};

Plot.prototype.setScales = SetScales;
