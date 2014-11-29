// 
function Histogram(spec) {
  if(!(this instanceof ggd3.geom)){
    return new Histogram(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "histogram",
    stat: "bin",
    bins: 30,
    frequency: false,
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
    // histograms are not to draw more than one per plot,
    // so grouping by color/fill/group is not supported.
    if(s.grouped) {
      console.warn("Grouping within a plot for histogram doesn't really make sense. Not doing it.");
    }
    var scales = that.scalesAxes(sel, s, data.selector, layerNum,
                                 that.drawX(), that.drawY());
    data = s.stat.compute(data.data);
           
    var n, h, size, width;
    if(s.aes.y === "binHeight") {
      n = 'x';
      h = 'y';
      size = {p: 'y', s: 'height'};
      width = {p: 'x', s: 'width'};
    } else {
      n = 'y';
      h = 'x';
      size = {p: 'x', s: 'width'};
      width = {p: 'y', s: 'height'};
    }
    var barSize = (function() {
      if(size.p === 'y'){
        return function(d) {
          return  scales.y.scale()(0) - scales.y.scale()(d.binHeight);
        };
      }
      return function(d) {
        return scales.x.scale()(d.binHeight) - scales.x.scale()(0);
      };
    })();
    var barPosition = (function() {
      if(size.p === 'y'){
        return function(d) {
          return scales.y.scale()(d.binHeight);
        };
      }
      return function(d) {
        return scales.x.scale()(0);
      };
    })();
    var barWidthPlace = (function() {
      if(size.p === 'y'){
        return function(d) {
          return ggd3.tools.round(scales[n].scale()(d.x), 2) + 1;
        };
      }
      return function(d) {
        return (ggd3.tools.round(scales[n].scale()(d.x), 2) + 1 - 
                barWidth.rangeBand());
      };
    })();

    // dx is not returning the output I expect.
    // calculating bar width on my own
    var barWidth = d3.scale.ordinal()
                      .rangeRoundBands(scales[n].scale().range(), 0.3, 0.2)
                      .domain(_.range(that.bins()));
    ggd3.tools.removeElements(sel, layerNum, "rect");
    function drawHistogram(rect){
      rect.attr('class', 'geom g' + layerNum + ' geom-histogram')
        .attr(size.s, barSize)
        .attr(width.s, barWidth.rangeBand())
        .attr(width.p, barWidthPlace)
        .attr(size.p, barPosition)
        .attr('fill', function(d) {
          return s.fill(d[1]);
        })
        .attr('stroke-width', 1)
        .attr('fill-opacity', function(d) {
          return s.alpha(d[1]);
        })
        .attr('stroke', function(d) {
          return s.color(d[1]);
        });
    }
    var hist = sel.select('.plot')
                  .selectAll('rect.geom.g' + layerNum)
                  .data(data);
    hist.transition().call(drawHistogram);
    hist.enter().append('rect')
      .call(drawHistogram);
    hist.exit()
      .transition()
      .style('opacity', 0)
      .remove();


  }
  return draw;
};

ggd3.geoms.histogram = Histogram;