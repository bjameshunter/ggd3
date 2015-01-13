ggd3.tools.arrayOfArrays = function(data) {
  // first level are all arrays
  if(_.all(_.map(_.flatten(data, true), _.isPlainObject))) {
    // we shouldn't be here.
    return data;
  }
  var l1 = _.flatten(data, true),
      l1arrays = _.all(_.map(l1, _.isArray));
  // second level
  var l2 = _.flatten(l1, true),
      l2obs = _.all(_.map(l2, _.isPlainObject));
  if(l1arrays && l2obs) { return l1; }
  return ggd3.tools.arrayOfArrays(l1);
};