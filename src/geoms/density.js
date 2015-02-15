// 
function Density(spec) {
  if(!(this instanceof Geom)){
    return new Density(spec);
  }
  Geom.apply(this, spec);
  var attributes = {
    name: "density",
    stat: "density",
    kernel: "epanechnikovKernel",
    geom: "path",
    smooth: 6,
    nPoints: 100,
    fill: false, // fill with same color?
    alpha: 0.8,
    lineType: null,
    lineWidth: null
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Density.prototype = new Geom();
  
Density.prototype.constructor = Density;

Density.prototype.kde = function(kernel, x) {
  return function(sample) {
    return x.map(function(x) {
      return [x, d3.mean(sample, function(v) { return kernel(x-v); })];
    });
  };
};

Density.prototype.gaussianKernel = function(scale) {
  var pi = 3.14159265359,
      sqrt2 = Math.sqrt(2);
  return function(u){
    return 1/(sqrt2*pi) * Math.exp(-1/2 * Math.pow(u*scale, 2));
  };
};
Density.prototype.epanechnikovKernel = function(scale) {
  return function(u) {
    return Math.abs(u /= scale) <= 1 ? 0.75 * (1 - u * u) / scale : 0;
  };
};

Density.prototype.draw = function(sel, data, i, layerNum){

  var s     = this.setup(),
      that  = this;

  function drawDensity(path){

    path.attr('class', 'geom g' + layerNum + " geom-density")
        .attr('d', function(d) {
            return line(d.values);
        })
        .attr('stroke-width', that.lineWidth())
        .attr('stroke-dasharray', that.lineType())
        .attr('stroke', function(d) {
          return s.color(d.values[1]); 
        })
        .attr('stroke-opacity', that.alpha());
    if(that.fill()){
      path
        .style('fill', function(d) {
          return s.color(d.key);
        })
        .style('fill-opacity', that.alpha());
    }
  }
  var scales = that.scalesAxes(sel, s, data.selector, layerNum,
                               true, true);

  var n, d;
  if(s.aes.y === "density") {
    n = 'x';
    d = 'y';
  } else {
    n = 'y';
    d = 'x';
  }
  // nest, but don't compute
  data = s.nest.rollup(function(d) { return d; })
          .entries(data.data);

  // if data are not grouped, it will not be nested
  // so we have to manually nest to pass to drawDensity
  if(!data[0].key && !data[0].values){
    data = [{key:'key', values: data}];
  }
  var line = d3.svg.line();
  line[n](function(v) { return scales[n].scale()(v[s.aes[n]]); } );
  line[d](function(v) { return scales[d].scale()(v[s.aes[d]]); } );
  // need to calculate the densities to draw proper domains.
  this.removeElements(sel, layerNum, this.geom());
  var path = sel.selectAll('.geom.g' + layerNum)
                .data(data);
  var update = s.transition ? path.transition(): path;
  update.call(drawDensity);
  path.enter().append(this.geom()).call(drawDensity);
  var exit = s.transition ? path.exit().transition(): path.exit();
  exit.style('opacity', 0)
    .remove();
};

ggd3.geoms.density = Density;