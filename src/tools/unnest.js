// generic nesting function
<<<<<<< HEAD
Nest = function(data) {
  if(data === null) { return data; }
=======
function Nest(data) {
  if(_.isNull(data)) { return data; }
>>>>>>> lodash
  var isLayer = (this instanceof ggd3.layer),
      nest = d3.nest(),
      that = this,
      facet = isLayer ? this.plot().facet(): this.facet();
  if(facet && (facet.x() !== null)){
    nest.key(function(d) { return d[facet.x()]; });
  }
  if(facet && (facet.y() !== null)){
    nest.key(function(d) { return d[facet.y()]; });
  }
  if(facet && (facet.by() !== null)){
    nest.key(function(d) { return d[facet.by()]; });
  }
  data = nest.entries(data);
  return data; 
}

function unNest(data, nestedArray) {
  // recurse and flatten nested dataset
  // this means no dataset can have a 'values' column
  if(!data || data.length === 0){ 
    return data;
  }
  var branch = all(data.map(function(d){
    return d.hasOwnProperty('values');
  }));
  if(!branch) {
    if(nestedArray === true){
      return [data];
    }
    return data; 
  }
  var vals = flatten(
              data.map(function(d) { return d.values; }), false
             );
  return this.unNest(vals);
}


// accepts single nested object
function recurseNest(data) {
  if(!data.values) { return data; }
  return data.values.map(function(d) {
                  return recurseNest(d);
                });
}

