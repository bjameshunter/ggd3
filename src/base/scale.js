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
  if(!(this instanceof Scale)){
    return new Scale(opts);
  }
  // allow setting of orient, position, type, 
  // scale and axis settings, etc.
  var attributes = {
    aesthetic: null,
    domain: null,
    range: null,
    plot: null,
    type: null, // linear, log, ordinal, time, category, 
    // maybe radial, etc.
    scale: null,
    rangeBands: [0.1, 0.1],
    opts: {},
    label: null,
    labelPosition: [0.5, 0.5],
    offset: 55,
  };
  // store passed object
  this.attributes = attributes;
  var getSet = ["aesthetic", "plot", 
                "rangeBands", "label"];
  for(var attr in this.attributes){
    if(!this[attr] && contains(getSet, attr) ){
      this[attr] = createAccessor(attr);
    }
  }
  this._userOpts = {};
  if(opts !== undefined){
    // opts may be updated by later functions
    // _userOpts stays fixed on initiation.
    this._userOpts = clone(opts, true);
    this.opts(opts);
    opts = this.opts();
    ['type', 'scale', 'label', 'offset'].forEach(function(o){
      if(opts.hasOwnProperty(o)){
        this[o](opts[o]);
      }
    }, this);
  }
}

Scale.prototype.opts = function(o) {
  if(!(arguments.length)) { return this.attributes.opts; }
  this.attributes.opts = o;
  return this;
};

Scale.prototype.type = function(type) {
  if(!arguments.length) { return this.attributes.type; }
  this.attributes.type = type;
  switch(type) {
    case 'linear':
      this.attributes.scale = d3.scale.linear().nice();
      break;
    case 'log':
      this.attributes.scale = d3.scale.log().nice();
      break;
    case 'ordinal':
      this.attributes.scale = d3.scale.ordinal();
      break;
    case 'time':
      this.attributes.scale = d3.time.scale().nice();
      break;
    case 'date':
      this.attributes.scale = d3.time.scale().nice();
      break;
    case "category10":
      this.attributes.scale = d3.scale.category10();
      break;
    case "category20":
      this.attributes.scale = d3.scale.category20();
      break;
    case "category20b":
      this.attributes.scale = d3.scale.category20b();
      break;
    case "category20c":
      this.attributes.scale = d3.scale.category20c();
    break;
  }
  return this;
};

Scale.prototype.style = function(sel) {
  var styles = ['text', 'style'],
      axis = this.opts().axis;
  styles.forEach(function(s) {
    if(axis.hasOwnProperty(s)){
      sel.call(axis[s]);
    }
  }, this);
};

Scale.prototype.scale = function(settings){
  if(!arguments.length) { return this.attributes.scale; }
  for(var s in settings){
    if(this.attributes.scale && 
       this.attributes.scale.hasOwnProperty(s)){
      this.attributes.scale[s](settings[s]);
    }
  }
  return this;
};

Scale.prototype.range = function(range, rb) {
  if(!arguments.length) { return this.attributes.range; }
  if(this.type() === "ordinal"){
    if(rb === undefined) { 
      rb = this.rangeBands(); 
    }
    this.attributes.scale
        .rangeRoundBands(range, rb[0], rb[1]);
  } else {
    this.attributes.scale.range(range);
  }
  this.attributes.range = range;
  return this;
};

Scale.prototype.domain = function(domain) {
  if(!arguments.length) { return this.attributes.domain; }
  domain = domain.filter(function(d) {
    return d !== undefined && d !== null && d !== "";
  });
  if(this.type() ==="log"){
    if(!all(domain, function(d) { return d > 0;}) ){
      console.warn("domain must be greater than 0 for log scale." +
      " Scale " + this.aesthetic() + " has requested domain " +
      domain[0] + " - " + domain[1] + ". Setting lower " +
      "bound to 1. Try setting them manually." );
      domain[0] = 1;
    }
  }
  if(this.domain() === null){ 
    this.attributes.domain = domain.filter(function(d) {
                              return d !== null && d !== undefined && d !== "";
                                });
    } else {
    var d = this.attributes.domain;
    if(contains(linearScales, this.type())){
      if(domain[0] < d[0]) { this.attributes.domain[0] = domain[0];}
      if(domain[1] > d[1]) { this.attributes.domain[1] = domain[1];}
      this.attributes.domain = ggd3.tools
                                .numericDomain(this.attributes.domain);
    } else {
      var newDomain = [];
      flatten([d, domain]).map(function(d) {
        if(!contains(newDomain, d)){
          newDomain.push(d);
        }
      });
      newDomain.sort();
      this.attributes.domain = newDomain.filter(function(d) {
        return d !== null && d !== undefined && d !== "";
      });
    }
  }
  if(this.scale() !== null){
    this.scale().domain(this.attributes.domain);
  }
  return this;
};

Scale.prototype.offset = function(o) {
  if(!arguments.length) { return this.attributes.offset; }
  this.attributes.offset = o;
  return this;
};

Scale.prototype.axisLabel = function(o) {
  var l = this.label();
  if(o instanceof d3.selection){
    var pd = this.plot().plotDim(),
        tr, offset,
        r = 90;
    if(this.aesthetic() === "y"){
      offset = this.opts().axis.position === "left" ? -this.offset():this.offset();
      tr = "translate(" + offset + "," + pd.y + ")rotate(" + -r + ")";
    } else {
      offset = this.opts().axis.position === "top" ? -this.offset():this.offset();
      tr = "translate(0," + offset + ")";
    }

    var label = o.selectAll('.label').data([0]);
    label
      .attr('width', pd[this.aesthetic()])
      .attr('height', "23")
      .attr('transform', tr)
      .each(function() {
        d3.select(this).select('p').text(l);
      })
      .select('body')
      .style('position', 'inherit');
    label.enter().append('foreignObject')
      .attr('width', pd[this.aesthetic()])
      .attr('height', "23")
      .attr('transform', tr)
      .attr('class', 'label')
      .append('xhtml:body')
      .style('position', 'inherit')
      .append('div')
      .append('p')
      .text(l);
  }
};

Scale.prototype.positionAxis = function(rowNum, colNum) {
  var facetDims = this.plot().facet().svgDims(rowNum, colNum),
      x = facetDims.px,
      y = facetDims.py;
  if(this.aesthetic() === "x"){
    if(this.opts().axis.position === "bottom"){
      y += facetDims.plotY;
    } else if(this.opts().axis.orient === "top"){
      
    }
  }
  if(this.aesthetic() === "y"){
    if(this.opts().axis.position === "right"){
      x += facetDims.plotX;
    }
  }
  return [x, y];
};

ggd3.scale = Scale;