
function Abline(spec) {
  if(!(this instanceof Geom)){
    return new Abline(spec);
  }
  Line.apply(this);
  var attributes = {
    name: "abline",
    // color: d3.functor("black")
  };

  this.attributes = _.merge(_.clone(this.attributes), attributes);

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

  if(!_.contains(_.keys(s.aes), "yintercept")){
    throw "geom abline requires aesthetic 'yintercept' and an optional slope.";
  }
  if(!_.contains(linearScales, scales.x.type() )){
    throw "use geom hline or vline to draw lines on an ordinal x axis y yaxis";
  }
  if(!s.aes.slope){
    s.aes.slope = 0;
  }
  var xdomain = scales.x.scale().domain(),
      data;
  if(_.isNumber(s.aes.yintercept)){
    s.aes.yintercept = [s.aes.yintercept];
  }
  if(_.isArray(s.aes.yintercept)){
    // yints and slopes are drawn on every facet.
    data = _.map(s.aes.yintercept, function(y) {
      return _.map(xdomain, function(x, i) {
        var o = {};
        o[s.aes.x] = x;
        o[s.aes.y] = y + s.aes.slope * x;
        return o;
      });
    });
  }
  if(_.isString(s.aes.yintercept)){
    data = [];
    _.each(d.data, function(row) {
      data.push(_.map(xdomain, function(x) {
        var o = {};
        o[s.aes.x] = x;
        o[s.aes.y] = row[s.aes.yintercept] + row[s.aes.slope] * x;
        o = _.merge(_.clone(row), o);
        return o;
      }));
    }); 
  }
  return data;
};


ggd3.geoms.abline = Abline;