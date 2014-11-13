function Scale(opts) {
  // allow setting of orient, position, scaleType, 
  // scale and axis settings, etc.
  var attributes = {
    type: null,
    domain: null,
    range: null,
    position: null, // left right top bottom none
    orient: null, // left right top bottom
    plot: null,
    scaleType: "linear", // linear, log, ordinal, time, category, 
    // maybe radial, etc.
    scale: null,
    axis: null
  };
  this.opts = opts;
  this.attributes = attributes;
  var getSet = ["type", "plot", "orient", "position"];
  for(var attr in this.attributes){
    if(!this[attr] && _.contains(getSet, attr) ){
      this[attr] = createAccessor(attr);
    }
  }
}

Scale.prototype.scaleType = function(scaleType) {
  if(!arguments.length) { return this.attributes.scaleType; }
  var that = this;
  switch(scaleType) {
    case 'linear':
      that.attributes.scale = d3.scale.linear();
      break;
    case 'log':
      that.attributes.scale = d3.scale.log();
      break;
    case 'ordinal':
      that.attributes.scale = d3.scale.ordinal();
      break;
    case 'time':
      that.attributes.scale = d3.time.scale();
      break;
    case "category10":
      that.attributes.scale = d3.scale.category10();
      break;
    case "category20":
      that.attributes.scale = d3.scale.category20();
      break;
    case "category20b":
      that.attributes.scale = d3.scale.category20b();
      break;
    case "category20c":
      that.attributes.scale = d3.scale.category20c();
      break;
  }
  return this;
};

Scale.prototype.axis = function(settings) {
  if(!arguments.length) { return this.attributes.axis; }
  if(!_.contains(['x', 'y'], this.type())){
    return this;
  } else {
    if(!_.isNull(this.axis())){
      this.attributes.axis = d3.svg.axis();
    }
  }
  for(var s in settings){
    if(this.attributes.axis.hasOwnProperty(s)){
      this.attributes.axis[s](settings[s]);
    }
  }
  return this;
};

Scale.prototype.scale = function(settings){
  if(!arguments.length) { return this.attributes.scale; }
  for(var s in settings){
    if(this.attributes.scale.hasOwnProperty(s)){
      this.attributes.scale[s](settings[s]);
    }
  }
  return this;
};

Scale.prototype.range = function(range) {
  if(!arguments.length) { return this.attributes.range; }
  this.attributes.scale.range(range);
  return this;
};

Scale.prototype.domain = function(domain) {
  if(!arguments.length) { return this.attributes.domain; }
  this.attributes.scale.domain(domain);

  return this;
};

ggd3.scale = Scale;