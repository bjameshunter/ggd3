// opts looks like {scale: {}, 
              // axis: {}, 
              // type: <"linear", "ordinal", "time", etc... >,
              // orient: "",
              // position: ""};
// for scales not x or y, axis will reflect 
// settings for the legend (maybe)
// all scales will get passed through "setScales"
// but opts will override defaults
function Scale(opts) {

  // allow setting of orient, position, scaleType, 
  // scale and axis settings, etc.
  var attributes = {
    aesthetic: null,
    domain: null,
    range: null,
    position: null, // left right top bottom none
    orient: null, // left right top bottom
    plot: null,
    scaleType: null, // linear, log, ordinal, time, category, 
    // maybe radial, etc.
    scale: null,
  };
  this.opts = opts;
  this.attributes = attributes;
  this.scaleType(opts.type ? opts.type:null);
  var getSet = ["aesthetic", "plot", "orient", "position"];
  for(var attr in this.attributes){
    if(!this[attr] && _.contains(getSet, attr) ){
      this[attr] = createAccessor(attr);
    }
  }
}

Scale.prototype.scaleType = function(scaleType) {
  if(!arguments.length) { return this.attributes.scaleType; }
  var that = this;
  this.attributes.scaleType = scaleType;
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
    case 'date':
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
  if(this.scaleType() === "ordinal"){
    this.attributes.scale.rangeRoundBands(range, 0);
  } else {
    this.attributes.scale.range(range);
  }
  return this;
};

Scale.prototype.domain = function(domain) {
  if(!arguments.length) { return this.attributes.domain; }
  this.attributes.scale.domain(domain);

  return this;
};
Scale.prototype.positionAxis = function() {
  var margins = this.plot().margins(),
      dim = this.plot().plotDim(),
      aes = this.aesthetic(),
      opts = this.opts.axis;
  if(aes === "x"){
    if(opts.position === "bottom"){
      return [margins.left, margins.top + dim.y];
    }
    if(opts.position === "top"){
      return [margins.left, margins.top];
    }
  }
  if(aes === "y") {
    if(opts.position === "left"){
      return [margins.left, margins.top];
    }
    if(opts.position === "right"){
      return [margins.left + dim.x, margins.top];
    }
  }
};

ggd3.scale = Scale;