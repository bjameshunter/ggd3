
function Abline(spec) {
  if(!(this instanceof Geom)){
    return new Abline(spec);
  }
  Line.apply(this);
  var attributes = {
    name: "abline",
  };

  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Abline.prototype = new Line();

Abline.prototype.constructor = Abline;

Abline.prototype.domain = function(data, a) {
  // it is not getting called because slope and intercept
  // have no need to set a scales domain.
  // maybe...
  return data;
};

Abline.prototype.prepareData = function(d, s, scales) {

  if(!contains(Object.keys(s.aes), "yintercept")){
    throw "geom abline requires aesthetic 'yintercept' and an optional slope.";
  }
  if(!contains(linearScales, scales.x.type() )){
    throw "use geom hline or vline to draw lines on an ordinal x axis y yaxis";
  }
  if(!s.aes.slope){
    s.aes.slope = 0;
  }
  var xdomain = scales.x.scale().domain(),
      data;
  if(typeof s.aes.yintercept === 'number'){
    s.aes.yintercept = [s.aes.yintercept];
  }
  if(Array.isArray(s.aes.yintercept)){
    // yints and slopes are drawn on every facet.
    data = s.aes.yintercept.map(function(y) {
      return xdomain.map(function(x, i) {
        var o = {};
        o[s.aes.x] = x;
        o[s.aes.y] = y + s.aes.slope * x;
        return o;
      });
    });
  }
  if(typeof s.aes.yintercept === 'string'){
    data = [];
    d.data.forEach(function(row) {
      data.push(xdomain.map(function(x) {
        var o = {};
        o[s.aes.x] = x;
        o[s.aes.y] = row[s.aes.yintercept] + row[s.aes.slope] * x;
        o = merge(clone(row), o);
        return o;
      }));
    }); 
  }
  return data;
};


ggd3.geoms.abline = Abline;