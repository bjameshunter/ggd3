// 
function Histogram(spec) {
  if(!(this instanceof Geom)){
    return new Histogram(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "histogram",
    stat: "bin",
    nbins: 30
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Histogram.prototype = new Geom();
  
Histogram.prototype.constructor = Histogram;

Histogram.prototype.domain = function(data, a) {
  var layer   = this.layer(),
      plot    = layer.plot(),
      aes     = layer.aes(),
      extent  = d3.extent(_.pluck(data, aes[a])),
      range   = extent[1] - extent[0];

  // histogram always extends both ways
  if(range === 0){
    extent[0] -= 1;
    extent[1] += 1;
  }
  extent[0] -= 0.1 * range;
  extent[1] += 0.1 * range;
  return extent;
};


Histogram.prototype.draw = function(){

  var s     = this.setup(),
      that  = this;

  function draw(sel, data, i, layerNum) {

    var scales = that.scalesAxes(sel, s, data.selector, layerNum,
                                 true, true);

    var n, d;
    if(s.aes.x) {
      n = 'x';
      d = 'y';
    } else {
      n = 'y';
      d = 'x';
    }
    data = s.nest
            .rollup(function(d) {
              out = {};
              _.map(['color', 'group'], function(a) {
                if(s.aes[a]){
                  out[s.aes[a]] = d[0][s.aes[a]];
                }
              });
              out.data = _.pluck(d, s.aes.x || s.aes.y);
              return out;
            })
            .entries(data.data);
    

    var max = _.max(_.map(data, function(d) {
      return _.max(_.map(d.data, function(v) { return v[1]; }));
    }));

    scales[d].scale().domain([-max*0.05, max*1.1]).nice();

    ggd3.tools.removeElements(sel, layerNum, "rect");

  }
  return draw;
};

ggd3.geoms.histogram = Histogram;