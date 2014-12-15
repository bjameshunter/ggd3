function Annotate(spec) {
  if(!(this instanceof Annotate)){
    return new Annotate(spec);
  }
  // annotations are divs or foreignObjects that contain a div to be placed in an svg or g element.
  // used to label plots and axes. They can also be fed a selection
  // of geoms and draw a line to that geom to display more info about
  // the data it contains. They will live in the rightmost or leftmost
  // margin of the plot
  var attributes = {
    content: "",
    class: "annotation",
    orient: "horizontal",
  };
  for(var attr in attributes){
    if(!this[attr]){
      this[attr] = createAccessor(attr);
    }
  }
}

Annotate.prototype.selection = function(sel) {
  

};

ggd3.annotate = Annotate;