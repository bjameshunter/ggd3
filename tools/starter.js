charts.util.BaseChart = function (newAttributes) {
  var attributes = {
    width: 600,
    height: 400,
    margin: {top:40, bottom:40, left:50, right:50},
    id: 'chart_id',
    legend: true,
    facet: null,
    facets: null,
    legendPosition: 'bottom',
    legendId: function() {
      return chart.id() + "-legend";
    },
    x: null,
    xVar: null,
    xZero: false,
    xFree: false,
    xAdjust: false,
    xTitle: null,
    y: null,
    yVar: null,
    yZero: false,
    yFree: false,
    yAdjust: false,
    yTitle: null,
    size: d3.scale.linear(),
    sizeVar: null,
    sizeRange: [3, 10],
    sizeFree: false,
    lineWidth: 3,
    color: null,
    colorVar: null,
    colorFree: false,
    groupVar: null, // arbitrary groups, not necessarily color
    toolTitle: null,
    toolContent: null,
    brush: true,
    dtypes: {},
    newData: true,
    transitionTime: 500,
    transitioning: false,
    axesOrient: ['bottom', 'left'],
    axesPosition: ["bottom", 'left']
  };
  // overwrite or add new elements to default settings.
  if(typeof newAttributes === "object"){
    for(var attr in newAttributes){
      attributes[attr] = newAttributes[attr];
    }
    delete attr;
  }
  this.attributes = attributes;
  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
};

// calculate shape of actual plot area within svg.
charts.util.BaseChart.prototype.plotDim = function(attributes) {
    return {
    width: (attributes.width - attributes.margin.left - 
            attributes.margin.right),
    height: (attributes.height - attributes.margin.top - 
             attributes.margin.bottom),
    translate: [attributes.margin.left, 
                  attributes.margin.top]
    };
  };
// data getter/setter to 
// recalculate when data is set.
charts.util.BaseChart.prototype.data = function(data){
      if(!arguments.length){ return this.attributes.data; }
      this.attributes.data = data;
      this.newData(true);
      this.reCalculate();
      this.newData(false);
      return this;
  };

// function returning whether we're constructing
// any top level scales
charts.util.BaseChart.prototype.scales = function() {
      return _.any([!this.xFree(), !this.yFree(),
                   !this.sizeFree(), !this.colorFree()])
    }
