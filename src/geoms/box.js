// 
function Boxplot(spec) {
  if(!(this instanceof Geom)){
    return new Boxplot(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "boxplot",
    stat: "boxplot",
    position: "jitter",
    upper: 0.95,
    lower: 0.05,
    tail: null,
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Boxplot.prototype = new Geom();


Boxplot.prototype.constructor = Boxplot;

Boxplot.prototype.determineOrdinal = function(s) {
  // this is dumb, this logic needs to happen when scales are created;
  if(s.plot.xScale().single.scaleType() === "ordinal"){
    return 'x';
  } else {
    return 'y';
  }
};

Boxplot.prototype.domain = function(data, a) {

  var s = this.setup(),
      factor = this.determineOrdinal(s),
      number = factor === 'x' ? 'y': 'x',
      domain,
      extent;
  if(a === factor) {
    domain = _.sortBy(_.map(data, function(d) {
      return _.unique(_.pluck(d.data, s.aes[a]));
    }));
  } else {
    domain = d3.extent(_.flatten(_.map(data, function(d) {
      return _.pluck(d.data, s.aes[a]);
    })));
    extent = domain[1] - domain[0];
    domain[0] -= extent*0.1;
    domain[1] += extent*0.1;
  }
  return domain;
};
Boxplot.prototype.positionOutlier = function() {

};

Boxplot.prototype.positionBar = function() {

};

Boxplot.prototype.draw = function(sel, data, i, layerNum) {
  var s = this.setup(),
      that = this,
      o, n, o2,
      size, width,
      scales = that.scalesAxes(sel, s, data.selector, layerNum,
                               this.drawX(), this.drawY()),
      vertical = scales.x.scaleType() === "ordinal",
      factor = vertical ? "x": "y",
      number = vertical ? "y": "x";

  ggd3.tools.removeElements(sel, layerNum, "geom-" + this.name());

  data = this.unNest(this.compute(data.data, s));

  if(vertical){
    // vertical boxes
    o = scales.x.scale();
    n = scales.y.scale();
    size = {s: "height", p: 'y', c: "cy"};
    width = {s: "width", p: 'x', c: "cx"};
  } else {
    // horizontal boxes
    o = scales.y.scale();
    n = scales.x.scale();
    size = {s: "width", p:'x', c: "cx"};
    width = {s:"height", p: 'y', c: "cy"};
  }
  if(s.grouped) {
    s.groups = _.flatten(_.map(data, function(d) {
      return _.pluck(d.data, s.group);
    }));
    o2 = d3.scale.ordinal()
            .range([0, o.rangeBand()])
            .domain(s.groups);
  } else {
    o2 = function() {
      return 0;
    };
  }



  function draw(box) {

    var d = box.datum(),
    rect = box.select('rect'),
    lines = box.selectAll('path'),
    points = box.selectAll('circle')
              .data(d.data);
    points.attr(size.c, function(d) {
        return n(d[s.aes[number]]);
      })
      .attr(width.c, function(d) {
        return o(d[s.aes[factor]]) + o2(d[s.group]);
      })
      .attr('r', s.size);
    points.enter().append('circle')
      .attr('class', 'outlier')
      .attr(size.c, function(d) {
        return n(d[s.aes[number]]);
      })
      .attr(width.c, function(d) {
        return o(d[s.aes[factor]]) + o2(d[s.group]);
      })
      .attr('r', s.size);

  }
  var boxes = sel.select('.plot')
                .selectAll('.geom g' + layerNum)
                .data(data);

  boxes.each(function(d) {
    d3.select(this).call(draw);
  });
  boxes.enter().append('g').each(function(d) {
    var b = d3.select(this);
    b.attr('class', 'geom g' + layerNum + ' geom-' + that.name());
    b.append('rect').attr('class', 'quantile-box');
    b.append('path').attr('class', 'upper');
    b.append('path').attr('class', 'lower');
    b.append('path').attr('class', 'median');
    b.call(draw);
  });
  boxes.exit().transition()
    .style("opacity", 0)
    .remove();
};

ggd3.geoms.boxplot = Boxplot;