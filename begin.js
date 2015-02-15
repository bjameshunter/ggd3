(function(context, ggd3){
  "use strict";
  if(typeof module === "object" && module.exports){
    // package loaded as node module
    console.log('loaded as module');
    module.exports = ggd3(require('d3'), require('lodash'));
  } else {
    // file is loaded in browser.
    console.log('loaded in browser')
    context.ggd3 = ggd3(context.d3, context._);
  }
}(this, function(d3, _){
    "use strict";

    var ggd3 = {version: "0.1.0",
                  tools: {},
                  geoms: {},
                  stats: {},
                  };
    function createAccessor(attr){
      function accessor(value){
        if(!arguments.length){ return this.attributes[attr];}
          this.attributes[attr] = value;
        return this;
      }
      return accessor;
    }