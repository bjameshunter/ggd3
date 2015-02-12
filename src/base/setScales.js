// only required by plot, no need to pass plot in.
// geom will already have it's scale available to it,
// regardless of whether it's layer has own data.
// probably no need to pass data in either.
// Plot knows it's facet, data and aes, therefore with 
// dataList, can get a list of facet ids and relevent data
// with which to make scales per facet if needed.
// if an aes mapping or facet mapping does exist in data
// throw error.
var measureScales = ['x', 'y', 'color','size', 'fill' ,'alpha', 'size'],
    linearScales = ['log', 'linear', 'time', 'date'],
    globalScales = ['alpha','fill', 'color', 'size', 'shape'];

// make or update a scale based on new info from layers
function setScale(selector, aes) {
  // gather user defined settings in opts object
  var opts = {},
      // user defined opts and the fixed scale domain
      scales = intersection(measureScales, 
                            ['x', 'y'].concat(Object.keys(aes)));
  scales.map(function(a) {
    // there is a scale "single" that holds the 
    opts[a] = this[a + "Scale"]().single._userOpts;
  }, this);

  // must reset this if aes changes
  scales.forEach(function(a) {
    if(this[a + "Scale"]()[selector] === undefined ||
      this[a + "Scale"]()[selector].scale() === null){
      this.makeScale(selector, a, opts[a], aes[a]);
    }
  }, this);
  scales.forEach(function(a) {
    // give user-specified scale settings to single facet
    this[a + "Scale"]().single._userOpts = clone(opts[a], true);
  }, this);
}

function makeScale(selector, a, opts, vname) {
  var dtype, settings;
  if(contains(measureScales, a)){
    // get plot level options set for scale.
    // if a dtype is not found, it's because it's x or y and 
    // has not been declared. It will be some numerical aggregation.
    dtype = this.dtypes()[vname] || ['number', 'many'];
    settings = merge(ggd3.tools.defaultScaleSettings(dtype, a),
                       opts);
    var scale = ggd3.scale(settings)
                        .plot(this)
                        .aesthetic(a);
    if(contains(['x', 'y'], a)){
      if(a === "x"){
        scale.range([0, this.plotDim().x], 
                    [this.rangeBand(), this.rangePadding()]);
      }
      if(a === "y") {
        scale.range([this.plotDim().y, 0],
                    [this.rangeBand(), this.rangePadding()]);
      }
      if((scale.label() === null) && this.axisLabels()){
        scale.label(vname);
      }
      scale.axis = d3.svg.axis().scale(scale.scale());
      for(var ax in settings.axis){
        if(scale.axis.hasOwnProperty(ax)){
          if(!Array.isArray(settings.axis[ax])){
            scale.axis[ax](settings.axis[ax]);
          } else {
            var x = settings.axis[ax];
            scale.axis[ax](x[0], x[1]); 
          }
        }
      }
    }
    for(var s in settings.scale){
      if(scale.scale().hasOwnProperty(s)){
        scale.scale()[s](settings.scale[s]);
      }
    }
    this[a + "Scale"]()[selector] = scale;
  }
}

function setDomain(data, layer) {
  if(any(data.data.map(function(d) {
    // pass holds aesthetics that shouldn't factor into scale training.
    var pass = ['yintercept', 'xintercept', 'slope'];
    return intersection(pass, Object.keys(d)).length > 0;
  }))){
    console.log("unnecessary data, skipping setDomain");
    return data;
  }
  var geom = layer.geom(),
      s = geom.setup(),
      domain,
      scale;

  this.globalScales = globalScales.filter(function(sc) {
    return contains(Object.keys(s.aes), sc);
  });

  this.freeScales = [];

  ['x', 'y'].forEach(function(a) {
    // do not cycle through scales declared null.
    if(s.aes[a] !== null){
      if(!contains(['free', 'free_' + a], s.facet.scales()) ){
        this.globalScales.push(a);
      } else {
        this.freeScales.push(a);
      }
    }
  }, this);

  // each facet's data rolled up according to stat
  // unnested - an array of observations.
  data.data = this.unNest(geom.compute(data.data, s));

  // free scales
  if(this.freeScales.length > 0){
    this.freeScales.forEach(function(k){
      var minmax;
      if(contains(['xmin', 'ymin', 'xmax', 'ymax'], k)){
        // must do soemthing different for mins and maxes
        // if a min or max is requested, send it to domain
        // this is getting ugly...
        minmax = k;
        k = k[0];
      }
      scale = this[k+ "Scale"]()[data.selector];
      scale.domain(geom.domain(data.data, k, minmax));
      if(contains(linearScales, scale.type())){
        scale.scale().nice();
      }
    }, this);
  }
  function first(d) {
    return d[0];
  }
  function second(d) {
    return d[1];
  }
  // calculate global scales
  this.globalScales.forEach(function(g){
    if(s.aes[g] !== null){
      if(contains(globalScales, g)){
        // if(_.contains(['xmin', 'ymin', 'xmax', 'ymax'], g)){
        //   g = g[0];
        // }
        scale = this[g + "Scale"]().single;
        // scale is fill, color, alpha, etc.
        // with no padding on either side of domain.
        if(contains(linearScales, scale.type())){
          domain = ggd3.tools.numericDomain(data.data, s.aes[g]);
          scale.range(this[g + 'Range']());
          scale.scale().nice();
        } else {
          if(scale.domain() === null){
            domain = unique(ggd3.tools.categoryDomain(data.data, s.aes[g]));
          } else {
            domain = scale.domain();
          }
          domain = compact(domain);
        }
        scale.domain(domain);
      } else {
        scale = this[g + "Scale"]()[data.selector];
        if((scale._userOpts.scale !== undefined) &&
           (scale._userOpts.scale.domain !== undefined)){
          domain = scale._userOpts.scale.domain;
        }else {
          domain = geom.domain(data.data, g);
        }
        if(!contains(linearScales, scale.type())){
          domain = unique(domain);
          domain.sort();
        }
        scale.domain(domain);
      }
      this[g + "Scale"]()[data.selector] = scale;
      // user-supplied scale parameters
      for(var sc in scale._userOpts.scale){
        if(scale.scale().hasOwnProperty(sc)){
          scale.scale()[sc](scale._userOpts.scale[sc]);
        }
      }
      if(contains(linearScales, scale.type())){
        scale.scale().nice();
      }
      // weird wrapper for legend aesthetic functions
      if(contains(globalScales, g)) {
        var aesScale = _.bind(function(d) {
          // if a plot doesn't use a particular
          // aesthetic, it will trip up here, 
          // test if it exists.
          if(d[s.aes[g]] !== undefined){
            return this.scale()(d[s.aes[g]]);
          }
        }, scale);
        this[g](aesScale);
      }
    }
  }, this);

  return data;
}

Plot.prototype.setScale = setScale;

Plot.prototype.makeScale = makeScale;

Plot.prototype.setDomain = setDomain;