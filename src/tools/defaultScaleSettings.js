ggd3.tools.defaultScaleSettings = function(dtype, aesthetic) {
  var defaultAxis = {tickSize:[6,0]};
  function xyScale() {
    if(dtype[0] === "number") {
      if(dtype[1] === "many"){
        return {type: 'linear',
                  axis: defaultAxis,
                  scale: {}};
      } else {
        return {type: 'ordinal',
                  axis: defaultAxis,
                  scale: {}};
      }
    }
    if(dtype[0] === "date"){
        return {type: 'time',
                  axis: defaultAxis,
                  scale: {}};
    }
    if(dtype[0] === "string"){
        return {type: 'ordinal',
                  axis: defaultAxis,
                  scale: {}};
    }
  }
  function legendScale() {
    if(dtype[0] === "number" || dtype[0] === "date") {
      if(dtype[1] === "many") {
        return {type: 'linear',
                axis: {position:'none'},
                scale: {}};
      } else {
        return {type: 'category10',
                axis: {position: 'none'},
                scale: {}};
      }
    }
    if(dtype[0] === "string") {
      if(dtype[1] === "many") {
        return {type:"category20",
                axis: {position: 'none'},
                scale: {}};
      } else {
        return {type:"category10",
                axis: {position: 'none'},
                scale: {}};
      }
    }
  }
  var s;
  switch(aesthetic) {
    case "x":
      s = xyScale();
      s.axis.position = "bottom";
      s.axis.orient = "bottom";
      return s;
    case "y":
      s = xyScale();
      s.axis.position = "left";
      s.axis.orient = "left";
      return s;
    case "color":
      return legendScale();
    case "fill":
      return legendScale();
    case "shape":
      return {type:"shape", 
            axis: {position:'none'},
            scale: {}};
    case "size":
      return {type: 'linear', 
             axis: {position:'none'},
             scale: {}};
    case "alpha":
      return {type: 'linear', 
             axis: {position:'none'},
             scale: {}};
  }
};
