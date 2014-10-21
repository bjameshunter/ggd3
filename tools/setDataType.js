charts.tools.setDataTypes = function(obj) {
  // returns dataset coerced according to chart.dtypes()
  // or some logic.
  // also adds jitter if necessary
  // add an object on chart that allows tooltip summaries
  // of arbitrary numeric values.
  var vars = {},
      dtypeDict = {"number": parseFloat, "integer": parseInt,
          "date": Date, "string": String},
      chart = obj.chart ? obj.chart(): obj,
      data = obj.data(),
      dtypes = chart.dtypes(),
      keys = _.keys(dtypes),
      dkeys = _.keys(data[0]),
      yVars = _.map(chart.geom(), function(g) {
        return g.yVar();
      }),
      xVars = _.map(chart.geom(), function(g) {
        return g.xVar();
      });

  // is the data already in a nested structure ?
  // if so, skip all

  dkeys.forEach(function(v){
    if(!_.contains(keys, v)) vars[v] = [];
  });
  data.forEach(function(d) {
    _.mapValues(vars, function(v,k) {
      return vars[k].push(d[k])
    })
  });
  _.mapValues(vars, function(v,k) {
    vars[k] = dtype(v);
  })
  dtypes = _.merge(dtypes, vars);

  data.forEach(function(d) {
    _.mapValues(dtypes, function(v,k) {
      if(dtypeDict[dtypes[k][0]] === "date"){
        d[k] = new Date(d[k]);
      } else {
        d[k] = dtypeDict[dtypes[k][0]](d[k]);
      }
      if(_.contains(xVars, k)){
        d['jitter-x'] = _.random(-1,1,true);
      }
      if(_.contains(yVars, k)){
        d['jitter-y'] = _.random(-1,1,true);
      }
    })
  });
  function dtype(arr) {
    var numProp = [],
        dateProp = [];
    // for now, looking at random 1000 obs.
    _.map(_.sample(arr, arr.length > 1000 ? 1000:arr.length), 
          function(d) {
      numProp.push(!_.isNaN(parseFloat(d)));
    })
    numProp = numProp.reduce(function(p,v) { 
      return p + v; }) / (arr.length > 1000 ? 1000: arr.length);
    var lenUnique = _.unique(arr).length
    // handle floats v. ints and Dates.
    // if a number variable has fewer than 20 unique values
    // 
    if(numProp > 0.95 & lenUnique > 20){
      return ["number", "many"];
    } else if (numProp > 0.95) {
      return ['number', 'few'];
    } else if (lenUnique > 20) {
      return ["string", "many"];
    } else if (lenUnique < 20) {
      return ["string", "few"];
    }
  }
  return data;
};