  if(typeof module === "object" && module.exports){
    // package loaded as node module
    // charts.chart.scatter = require('./scatter.js').scatter;
    this.charts = charts;
    module.exports = charts;
  } else {
    // file is loaded in browser.
    this.charts = charts;
  }
}();
