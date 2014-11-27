// 
function Density(spec) {
  if(!(this instanceof Geom)){
    return new Density(spec);
  }
  Histogram.apply(this);
  var attributes = {
    name: "density",
    stat: "density",
    kernel: "epanechnikovKernel",
    smooth: 30,
    nPoints: 100,
    fill: false, // fill with same color?
    alpha: 0.4
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Density.prototype = new Histogram();
  
Density.prototype.constructor = Density;

Density.prototype.kde = function(kernel, x) {
  return function(sample) {
    return x.map(function(x) {
      return [x, d3.mean(sample, function(v) { return kernel(x - v); })];
    });
  };
};

Density.prototype.epanechnikovKernel = function(scale) {
  return function(u) {
    return Math.abs(u /= scale) <= 1 ? 0.75 * (1 - u * u) / scale : 0;
  };
};

Density.prototype.draw = function(){

  var s     = this.setup(),
      that  = this;

  function draw(sel, data, i, layerNum) {

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
    data = s.nest
            .rollup(function(d) {
              return s.stat.compute(d);
            })
            .entries(data.data);
    var line = d3.svg.line();
    line[n](function(v) { return scales[n].scale()(v[s.aes[n]]); } );
    line[d](function(v) { return scales[d].scale()(v[s.aes[d]]); } );
    // need to calculate the densities to draw proper domains.
    console.log(data);
    ggd3.tools.removeElements(sel, layerNum, "rect");
    var path = sel.select('.plot')
                  .selectAll('path.geom.g' + layerNum)
                  .data(data);
    path.transition()
        .attr('class', 'geom g' + layerNum + " geom-density")
        .attr('d', function(d) {
            return line(d.values);
        })
        .attr('stroke-width', that.lineWidth())
        .attr('stroke', function(d) {
          return s.color(d.values[0]); 
        });
    path.enter().append('path')
        .attr('class', 'geom g' + layerNum + " geom-density")
        .attr('d', function(d) {
            return line(d.values);
        })
        .attr('stroke-width', that.lineWidth())
        .attr('stroke', function(d) {
          return s.color(d.values[0]); 
        })
        .style('fill', function(d) {
          return s.color(d.values[0]);
        })
        .style('fill-opacity', that.alpha());
  }
  return draw;
};

ggd3.geoms.density = Density;