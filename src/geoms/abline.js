
function Abline(spec) {
  if(!(this instanceof Geom)){
    return new Hline(spec);
  }
  Line.apply(this);
  var attributes = {
    name: "hline",
    direction: "x",
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Abline.prototype = new Line();

Abline.prototype.constructor = Abline;

Abline.prototype.domain = function(data, a) {
  console.log(data);
  return data;
};


Abline.prototype.generator = function(s) {

  return d3.svg.line()
          .x(function(d) { return x(d[s.aes.x]); })
          .y(function(d) { return y(d[s.aes.y]); })
          .interpolate(this.interpolate());
};

Abline.prototype.prepareData = function(data, s, scales) {
  if(!_.contains(_.keys(s.aes), "yint")){
    throw "geom abline requires aesthetic 'yint' and an optional slope.";
  }
  if(!_.contains(linearScales, scales.x.scaleType() )){
    throw "use geom hline or vline to draw lines on an ordinal x axis y yaxis";
  }
  if(!s.aes.slope){
    s.aes.slope = 0;
  }
  console.log(data);
  console.log(s);


  return data;
};

ggd3.geoms.abline = Abline;