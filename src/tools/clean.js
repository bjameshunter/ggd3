  function getRandomSubarray(arr, size) {
      var shuffled = arr.slice(0), i = arr.length, min = i - size, temp, index;
      while (i-- > min) {
          index = Math.floor((i + 1) * Math.random());
          temp = shuffled[index];
          shuffled[index] = shuffled[i];
          shuffled[i] = temp;
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
      console.log('determining data type');
      var start = new Date().getTime();
      vars[v] = dtype(pluck(getRandomSubarray(data , n), v)); //[]; 
      var end = new Date().getTime(); 
      console.log(end - start);
    }
  });
  // for(var i=0;i<data.length;i++){
  //   for(var v in vars){
  //     vars[v].push(data[i][v]);
  //   }
  // }
  // data.forEach(function(d) {
  // });
  // for(v in vars){
  //   vars[v] = dtype(vars[v]);
  // }

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
  return {data: data, dtypes: dtypes};
}

ggd3.tools.clean = Clean;