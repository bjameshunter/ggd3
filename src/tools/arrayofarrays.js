ggd3.tools.arrayOfArrays = function(data) {
  // first level are all arrays
  if(all(flatten(data, false).map(function(d) {
    var obj = d.constructor === Object;
    var prim = contains(['string', 'boolean', 'number'], typeof d);
    return obj || prim;
  }))) {
    // we shouldn't be here.
    return data;
  }
  var l1 = flatten(data, false),
      l1arrays = all(l1.map(Array.isArray));
  // second level
  var l2 = flatten(l1, false),
      l2obs = all(flatten(l2.map(function(d) { 
        return d.constructor === Object; 
      })));
  if(l1arrays && l2obs) { return l1; }
  return ggd3.tools.arrayOfArrays(l1);
};