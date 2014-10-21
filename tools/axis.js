
charts.tools.Axis = function(position, obj, data, specs) {
  var chart = obj.chart ? obj.chart(): obj,
      attributes = {
        orient: position == 'x' ? chart.axesPosition()[0]:
          chart.axesPosition()[1],
        type: 'linear'
      },
      plotDim = chart.plotDim(chart.attributes)
      dim = position == "x" ? [0, plotDim.width]:
                             [plotDim.height, 0];
  if(typeof specs === "object"){
    for(var attr in specs){
      attributes[attr] = specs[attr];
    }
  };

  this.attributes = attributes;
  for(var attr in attributes){
    if((!this[attr] && attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  };
  if(this.type() == "linear"){
    this.scale = d3.scale[this.type()]()
                  .range(dim)
                  .domain(charts.tools.domain(data,
                          true, true, true))
                  .nice();
  } else if (this.type() == "ordinal"){
    this.scale = d3.scale[this.type()]()
                  .rangeRoundBands(dim)
                  .domain(_.sortBy(_.unique(data)));
  }
  this.axis = d3.svg.axis()
              .orient(attributes.orient)
              .scale(this.scale);
  return this;
};

