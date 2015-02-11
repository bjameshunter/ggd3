!function() {
  var ggd3 = {version: "0.1.0",
                tools: {},
                geoms: {},
                stats: {},
                };
  function createAccessor(attr){
    function accessor(value){
      if(!arguments.length){ return this.attributes[attr];}
        this.attributes[attr] = value;
      return this;
    }
    return accessor;
  }

  function merge(o1, o2) {
    if(!o1) { o1 = {}; }
    if(!o2) { o2 = {}; }
    Object.keys(o2).forEach(function(d) {
      if(o2[d] && o2[d].constructor == Object){
        o1[d] = merge(o1[d], o2[d]);
      } else {
        o1[d] = o2[d];
      }
    })
    return o1;
  }

  function contains(a, b) {
    return a.indexOf(b) >= 0;
  }

  function clone(o, deep) {
    var o2 = {};
    Object.keys(o).forEach(function(d) {
      if(typeof o[d] === 'object' && deep){
        if(Array.isArray(o[d])){
          o2[d] = o[d].map(identity);
        } else {
          o2[d] =  clone(o[d], true);
        }
      } else {
        o2[d] = o[d];
      }
    })
    return o2;
  }

  function all(a, f) {
    for(var i = 0; i < a.length; i++){
      if(f){
        var res = f(a[i]);
        if (res === undefined || res === null || res === false){
          return false;
        }
      } else {
        if(!a[i]){
          return false;
        }
      }
    }
    return true;
  }

  function any(a, f) {
    if(f !== undefined) {
      for(var i = 0; i < a.length; i++){
        var res = f(a[i]);
        if (res === true){
          return true;
        }
      }
      return false;
    } else {
      // it's an array of booleans
      for(var i = 0; i < a.length; i++){
        if(a[i]){
          return true;
        }
      }
    }
  }

  function flatten(list, deep) {
    if(arguments.length < 2){ deep = true; }
    return list.reduce(function (acc, val) {
      var traverse = (val.constructor === Array) && deep;
      return acc.concat(traverse ? flatten(val, deep) : val);
    }, []);
  }

  function getItem(property){
    return function(item){
      return item[property];
    }
  }

  function identity(d) {
    return d;
  }

  function pluck(arr, f){
    if(typeof f === "string"){
      return arr.map(function(d) {
        return d[f];
      })
    }
    if(f === undefined) { return arr; }
    return arr.map(f)
  }

  function unique(arr, v) {
    var a = [], o;
    if(typeof v === 'function'){
      o = pluck(arr, v);
    } else if(typeof v === 'string'){
      o = pluck(arr, getItem(v));
    } else {
      o = arr;
    }
    o.forEach(function(d) {
      if(!contains(a, d)){
        a.push(d);
      }
    });
    return a;
  }

  function intersection(a1, a2){
    return unique(a1).filter(function(d) {
      return contains(unique(a2), d);
    })
  }

  function difference(arr, arr2) {
    return arr.filter(function(d) {
      return !contains(arr2, d);
    })
  }

  function compact(arr, zero) {
    return arr.filter(function(d) {
      var ret = d !== undefined && d !== null;
      return zero ? ret && (d !== 0): ret;
    })
  }
  function cleanName(s) {
    return s.replace(/[ \.]/g, '-');
  }

  function sortBy(v) {
    return function sort(a, b) {
      if (a[v] === b[v])
        return a.position - b.position;
      if (a[v] < b[v])
        return -1;
      return 1;
    };
  }
  function _merge(left, right, arr, v) {
    var a = 0;
    if(v === undefined) {
      while (left.length && right.length)
        arr[a++] = right[0] < left[0] ? right.shift() : left.shift();
      while (left.length) arr[a++] = left.shift();
      while (right.length) arr[a++] = right.shift();
    } else {
      while (left.length && right.length)
        arr[a++] = right[0][v] < left[0][v] ? right.shift() : left.shift();
      while (left.length) arr[a++] = left.shift();
      while (right.length) arr[a++] = right.shift();
    }
    return arr;
  }
  function mSort(arr, tmp, len, v) {
    if (len == 1) return;
    var   m = Math.floor(len / 2),
      tmp_l = tmp.slice(0, m),
      tmp_r = tmp.slice(m);
    mSort(tmp_l, arr.slice(0, m), m, v);
    mSort(tmp_r, arr.slice(m), len - m, v);
    return _merge(tmp_l, tmp_r, arr, v);
  }
  function merge_sort(arr, v) {
    return mSort(arr, arr.slice(), arr.length, v);
  }