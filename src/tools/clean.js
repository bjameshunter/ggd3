<<<<<<< HEAD
  function getRandomSubarray(arr, size) {
      var shuffled = arr.slice(0), i = arr.length, min = i - size, temp, index;
      while (i-- > min) {
          index = Math.floor((i + 1) * Math.random());
          temp = shuffled[index];
          shuffled[index] = shuffled[i];
          shuffled[i] = temp;
=======
function Clean(data, obj) {
  // coerce each records data to reasonable
  // type and get domains for all scales in aes.
  if(!data) { return {data: null, dtypes:null}; }
  if(obj instanceof ggd3.layer && _.isEmpty(obj.dtypes())){
    return {data:data, dtypes:null};
  }
  var vars = {},
      aes = obj.aes(),
      dtypeDict = {"number": parseFloat, 
                  "integer": parseInt,
                  "string": String},
      dtypes = _.merge({}, obj.dtypes()),
      keys = _.keys(dtypes),
      // assume all records have same keys
      // dkeys = _.keys(data[0]);
      dkeys = _.flatten(_.map(aes, function(v, k) {
        if(v !== 'additional') {
          return v;
        } else {
          return k;
        }
      }));

  dkeys.forEach(function(v){
    // if a data type has been declared, don't 
    // bother testing what it is.
    // this is necessary for dates and such.
    if(!_.contains(keys, v)) { vars[v] = []; }
  });
  data.forEach(function(d) {
    _.mapValues(vars, function(v,k) {
      return vars[k].push(d[k]);
    });
  });
  _.mapValues(vars, function(v,k) {
    vars[k] = dtype(v);
  });
  dtypes = _.merge(vars, dtypes);

  data = _.map(data, function(d,i) {
    return _.map(dtypes, function(v,k) {
      if(v[0] === "date" || 
         v[0] === "time"){
        var format = v[2];
        d[k] = ggd3.tools.dateFormatter(d[k], format);
      } else {
        d[k] = dtypeDict[dtypes[k][0]](d[k]);
>>>>>>> lodash
      }
      return shuffled.slice(min);
  }

  function dtype(arr) {
    var numProp = [],
        dateProp = [];
    // for now, looking at random 1000 obs.
    arr.map(function(d) {
            numProp.push(!isNaN(parseFloat(d)));
          });
    numProp = numProp.reduce(function(p,v) { 
      return p + v; }) / arr.length;
    var lenUnique = unique(arr).length;
    // handle floats v. ints and Dates.
    // if a number variable has fewer than 20 unique values
    // I guess this will do...
    if(numProp > 0.8 && lenUnique > 20){
      return ["number", "many"];
    } else if (numProp > 0.95) {
      return ['number', 'few'];
    } else if (lenUnique > 20) {
      return ["string", "many"];
    } else if (lenUnique < 20) {
      return ["string", "few"];
    }
  }
<<<<<<< HEAD

function Clean(data, obj) {
  // coerce each records data to reasonable
  // type and get domains for all scales in aes.
  if(!data) { return {data: null, dtypes:null}; }
  var vars = {},
      n = (data.length > 1000 ? 1000: data.length),
      dtypeDict = {"number": parseFloat, 
                  "integer": parseInt,
                  "string": String},
      dtypes = merge({}, obj.dtypes()),
      keys = Object.keys(dtypes),
      aes = obj.aes(),
      // collect relevent data columns and convert
      dkeys = [],
      v;
  for(v in aes){
    if(v === 'additional'){
      for(var i = 0; i < aes.additional.length; i++){
        dkeys.push(aes.additional[i]);
      }
    } else {
      dkeys.push(aes[v]);
    }
  }
  dkeys.forEach(function(v){
    // if a data type has been declared, don't 
    // bother testing what it is.
    // this is necessary for dates.
    if(!contains(keys, v)) { 
      vars[v] = dtype(pluck(getRandomSubarray(data , n), v)); //[]; 
    }
  });

  dtypes = merge(vars, dtypes);

  data = data.map(function(d,i) {
    for(var k in dtypes){
      if(dtypes[k][0] === "date" || 
         dtypes[k][0] === "time"){
        var format = dtypes[k][2];
        d[k] = ggd3.tools.dateFormatter(d[k], format);
      } else {
        d[k] = dtypeDict[dtypes[k][0]](d[k]);
      }
    }
    return d;
  });
=======
  // always just tack on number dtypes for n.obs, density, and binHeight
  var specialDtypes = {
    "n. observations": ['number', 'many', ',.0d'],
    density: ['number', 'many', ',.3d'],
    binHeight: ['number', 'many', ',.3d']
  };
  dtypes = _.merge(specialDtypes, dtypes);
>>>>>>> lodash
  return {data: data, dtypes: dtypes};
}

ggd3.tools.clean = Clean;