ggd3.tools.fillEmptyStack = function(data) {
  // every object in data must have same length
  // array in its 'value' slot
  var keys = _.unique(_.map(data, function(d) {
    return _.map(d.values, function(v) {
      return v.key;
    });
  }));
  // get an example object and set it's values to null;
  var filler = _.clone(data[0].values[0].values[0]);
  _.mapValues(filler, function(v,k) {
    filler[k] = null;
  });
  _.each(data, function(d) {
    var dkey, missing;
    dkeys = _.map(d, function(e) { return e.key; });
    missing = _.filter(keys, function(k) {
      return !_.contains(dkeys, k);
    });
    if(missing.length) {
      _.each(missing, function(m) {
        d.values.push({key:m, values: [_.clone(filler)]});
      });
    }
  });
  return data;
};