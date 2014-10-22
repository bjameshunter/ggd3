charts.geom.BaseGeom = function (specs){
  // geom should inherit from the chart it lives in.
  var attributes = {
    data: null,
    width: null,
    height: null,
    chart: null,
    xFormat: null,
    yFormat: null,
    xVar: null,
    yVar:null,
    x: null,
    y: null,
    size: d3.scale.linear(),
    sizeVar: null,
    sizeRange: null,
    colorVar: null,
    color: d3.scale.category10(),
    lineWidth: 5,
    groupVar: null,
    facet: null,
    toolTitle: function(d) {
      if(chart.facet()){
        return "<h4>" + d[chart.facet()] + "</h4>";
      }else if(chart.colorVar()){
        return "<h4>" + d[chart.nestVar()] + "</h4>";
      }
    },
    toolContent: function(d) {
      return chart.nestVar() + ": " + d[chart.nestVar()] +
      "<br>" + chart.xVar() + ": " + charts.tools.round(d[chart.xVar()]) + 
      "<br>" + chart.yVar() + ": " + charts.tools.round(d[chart.yVar()]);
    },
    legendSize: 12,
    transitionTime: 500,
    transitionStyle: {opacity: 0},
    newData: true,
    geom: null, // just add more geoms!?
    first: false,
    order: 0
  };
  // overwrite or add new elements to default settings.
  if(typeof specs === "object"){
    for(var attr in specs){
      attributes[attr] = specs[attr];
    }
    delete attr;
  }
  for(var attr in attributes){
    if((!this[attr] && attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  // prepAxes is an overloaded name, present in tools
  // and chart as well. It gets the chart and geom-level
  // data extents/domains and applies them to axes.
  this.prepAxes = function(sel) {
    // need to solidify conditions under which
    // top-level axes get overridden by geom level data
    // for the time being, they are below

    var chart = this.chart(),
        size = chart.sizeFree(),
        x = chart.xFree(),
        y = chart.yFree(),
        color = chart.colorFree(),
        specs;
    if(_.any([x, y, color, size])){
      var ex = charts.tools.prepAxes(this)
    }
    if(size){
      // size is always a continuous variable
      this.size().domain(ex.sExtent.length > 0 ? 
                          d3.extent(ex.sExtent):
                          d3.extent([1]))
                .range(d3.extent(_.flatten(
                         [this.sizeRange()])));
    } else {
      this.size(chart.size())
    }
    if(x){
      specs = charts.tools.defineAxis(this.xVar(), this)
      // zooming on ordinal axis doesn't make sense, yet
      // so remove xadjust or yadjust if it exists
      if(specs.type=='ordinal'){
        sel.select('.xadjust').remove();
      }
      this.x(new charts.tools.Axis('x', this, 
             ex.xExtent, specs));

    } else {
      this.x(chart.x())
    }
    if(y){
      specs = charts.tools.defineAxis(this.yVar(), this)
      if(specs.type=='ordinal'){
        sel.select('.yadjust').remove();
      }
      this.y(new charts.tools.Axis('y', this, 
             ex.yExtent, specs));
    } else {
      this.y(chart.y())
    }
    if(color){
      // use existing colorscale on default geom obj
    } else {
      this.color(chart.color())
    }
  }
  // make custom data accessor to do 
  // recalculations when necessary
  this.reCalculate = function() {

  }
  this.attributes = attributes;
  this.data = function(data){
      if(!arguments.length){ return this.attributes.data; }
      this.attributes.data = data;
      this.newData(true);
      // is geom going to have it's own recalculate function?
      this.reCalculate();
      this.newData(false);
      return this;
  }
  return this;
}

