!function() {
  var charts = {version: "0.1.0",
                util: {}, 
                geom: {},
                tools: {},
                layouts: {},
                };
  function createAccessor(attr){
    function accessor(value){
      if(!arguments.length){ return this.attributes[attr];}
        this.attributes[attr] = value;
      return this;
    }
    return accessor;
  }
