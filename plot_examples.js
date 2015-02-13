!function() {
  var plots = {};

  plots.verticalExpandedBar = function(layers, facet, 
                                       aes) {

    var ch = ggd3.plot()
              .facet(facet)
              .width(300)
              .height(800)
              .color('white')
              .rangeBand(0)
              .rangePadding(0)
              .subRangePadding(0.2)
              .layers(layers)
              .yGrid(false)
              .xGrid(false)
              .margins({right: 50, top:0})
              .xScale({axis: {ticks:4, position: 'top',
                              orient:'top'},
                              offset:45})
              .yScale({axis:{position:"right",
                            orient: "right"},
                            offset:45})
              .aes(aes)
              .facet(facet);
    return ch;
  };
  if(typeof module === "object" && module.exports){
    // package loaded as node module
    this._ = require('lodash');
    this.d3 = require('d3');
    module.exports = plots;
  } else {
    // file is loaded in browser.
    console.log('loaded in browser')
    this._ = require('lodash');
    this.d3 = require('d3');
    this.plots = plots;
  }
}();