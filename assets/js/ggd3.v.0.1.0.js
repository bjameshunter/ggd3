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
    var o = [];
    if(typeof f === "string"){
      for(i = 0; i<arr.length; i++){
        o.push(arr[i][f]);
      }
    } else if(f === undefined){
      o = arr;
    } else if(typeof f === 'function'){
      for(i = 0; i<arr.length;i++){
        o.push(f(arr[i]));
      }
    }
    return o;
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
  return {data: data, dtypes: dtypes};
}

ggd3.tools.clean = Clean;
function DataList(data) {
  // needs to work for plots and layers.
  // takes nested data.

  // it's a layer and has it's own data
  var layer = (this instanceof ggd3.layer),
      facet = layer ? this.plot().facet(): this.facet(),
      x = facet.x(),
      y = facet.y(),
      by = facet.by(),
      selector;
  if((x && !y) || (y && !x)){
    selector = x ? x + "-": y + "-";
    return data.map(function(d) {
      return {selector: cleanName(selector + d.key),
        data: d.values};
    });

  } else if(x && y) {
    // loop through both levels
    out = [];
    data.forEach(function(l1) {
      var selectX = x + "-" + l1.key;
      l1.values.forEach(function(l2) {
        var s = cleanName(y + "-" + l2.key + "_" + selectX);
        out.push({selector:s, data: l2.values});
      });
    });
    return out;
  } else if(x && y && by){
    // nothing yet
  }
  if(!x && !y){
    return [{selector: 'single', data: this.data()}];
  }
}

ggd3.tools.dateFormatter = function(v, format) {
  if(format === "%Y" && v.constructor !== Date) {
    return new Date(v, 0, 1, 0);
  }
  return new Date(v);
};
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


ggd3.tools.numericDomain = function(data, variable, rule, zero) {
  var extent = d3.extent(pluck(data, variable)),
      range = extent[1] - extent[0];
  if(rule === "left" || rule === "both"){
    extent[0] -= 0.1 * range;
    if(zero) {
      extent[1] = 0;
    }
  }
  if(rule === "right" || rule === "both"){
    extent[1] += 0.1 * range;
    if(zero) {
      extent[0] = 0;
    }
  }
  return extent;
};
ggd3.tools.categoryDomain = function(data, variable) {
  return compact(unique(pluck(data, variable))).sort();
};


ggd3.tools.round = function round(value, decimals) {
    return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
};

// generic nesting function
Nest = function(data) {
  if(data === null) { return data; }
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
};

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
function Facet(spec) {
  if(!(this instanceof Facet)){
    return new ggd3.facet(spec);
  }
  var attributes = {
    x: null,
    y: null,
    by: null, // add another 
    type: "wrap", // grid or wrap?
    scales: "fixed", // "free_x", "free_y"
    // not even close with free space.
    // space: "fixed", // eventually "free_x" and "free_y"
    plot: null, 
    nrows: null,
    ncols: null,
    margins: {x: 5, y:5}, 
    titleSize: [20, 20],
    textAnchorX: "middle",
    textAnchorY: "middle",
    // function to label facets.
    labels: null,
    // manual vertical shift downward of every facet
    // in case you want top-oriented top-position x-axis
    // maybe should be on plot object.
    vShift: 0, 
    // inherit from plot, but allow override
    // if scales are fixed, much smaller margins
    // because scales won't be drawn for inner plots.
  };
  // store number of facet svgs made to 
  // limit number to nFacets later
 this.nSVGs = 0;
  if(typeof spec === "object"){
    for(var s in spec) {
      attributes[s] = spec[s];
    }
  }
  this.attributes = attributes;
  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}


Facet.prototype.updateFacet = function(sel) {
  var that = this,
      data = this.plot().data(),
      nrows, ncols;
  this.xFacets = ["single"];
  this.yFacets = ["single"];
  // rules of faceting:
  // specify either x and y or an x or y with nrows or ncols
  if( this.x() ) {
    // x is always first nest
    this.xFacets = unique(data.map(function(d) {
      return d.key;
    }));
  }
  if( this.y() ){
    // if facet.y is specified, it might be the first or
    // second nest
    if(!this.x() ){
      this.yFacets = unique(data.map(function(d) {
        return d.key;
      }));
    } else {
      this.yFacets = unique(flatten(data.map(function(d) {
                            return d.values.map(function(v) {
                                return v.key;
                              });
                        })));
    }
  }

  this.nFacets = this.xFacets.length * this.yFacets.length;

  if( this.scales() !== "fixed" && this.type()==="grid"){
    throw ("facet type of 'grid' requires fixed scales." + 
            " You have facet scales set to: " + this.scales());
  }
  // if only x or y is set, user should input # rows or columns
  if( ( this.x() && this.y() ) && 
     ( this.ncols() || this.nrows() ) ){
    throw ('specifying x and y facets with ncols or nrows' +
                  " is not supported");
  }
  if( this.ncols() && this.nrows() ){
    throw ("specify only one of ncols or nrows");
  }
  if( (this.x() && !this.y()) || (this.y() && !this.x()) ){
    if(!this.ncols() && !this.nrows()){
      throw("specify one of ncols or nrows if setting only" +
            " one of facet.x() or facet.y()");
    }
    if(this.nrows() && !this.ncols()) {
      this._ncols = Math.ceil(this.nFacets/this.nrows()); 
      this._nrows = this.nrows();
    }
    if(this.ncols() && !this.nrows()) {
      this._nrows = Math.ceil(this.nFacets/this.ncols());
      this._ncols = this.ncols();
    }
  }
  if(!this.ncols() && !this.nrows() ) {
    this._nrows = this.yFacets.length;
    this._ncols = this.xFacets.length;
  }

  var rows = sel.selectAll('div.row')
              .data(d3.range(this._nrows));
  rows
    .attr('id', function(d) { return "row-" + d; })
    .each(function(d, i) {
      that.makeDIV(d3.select(this), d);
    });
  rows.enter()
    .append('div')
    .attr('class', 'row')
    .attr('id', function(d) { return "row-" + d; })
    .each(function(d, i) {
      that.makeDIV(d3.select(this), d);
    });
  rows.exit().remove();
};

// makes appropriate number of divs required by the row.
Facet.prototype.makeDIV = function(sel, rowNum) {
  var ncols = this._ncols,
      remainder = this.nFacets % ncols,
      that = this;
  row = sel.selectAll('div.plot-div')
           .data(d3.range((this.nFacets - this.nSVGs) > remainder ? 
                 ncols: remainder));
  row
    .each(function(colNum) {
      that.makeSVG(d3.select(this), rowNum, colNum);
    });
  row.enter().append('div')
    .attr('class', 'plot-div')
    .each(function(colNum) {
      d3.select(this).append('div')
        .attr('class', 'ggd3tip')
        .style('opacity', 0)
        .append('div').attr('class', 'tooltip-content');
      that.makeSVG(d3.select(this), rowNum, colNum);
    });
  row.exit().remove();
};

// makes SVG and calls makeTitle, makeCell and makeClip
Facet.prototype.makeSVG = function(sel, rowNum, colNum) {
  var that = this,
      plot = this.plot(),
      x = sel.data()[0], 
      dim = this.svgDims(rowNum, colNum),
      svg = sel.attr('id', function(d) {
                return that.id(d, rowNum);
               })
              .selectAll('svg.svg-wrap')
              .data([0]);

  svg
    .attr('width', dim.x)
    .attr('height', dim.y)
    .each(function(d) {
      that.makeTitle(d3.select(this), colNum, rowNum);
      var sel = d3.select(this).select('.plot-svg');
      sel.attr({col: colNum, row: rowNum});
      that.makeCell(sel, x, rowNum, that._ncols);
      that.makeClip(sel, x, rowNum);
    });
  svg.enter().append('svg')
    .attr('class', 'svg-wrap')
    .attr('width', dim.x)
    .attr('height', dim.y)
    .each(function(d) {
      that.makeTitle(d3.select(this), colNum, rowNum);
      var sel = d3.select(this).selectAll('.plot-svg')
                  .data([0]);
      sel
        .attr({col: colNum, row: rowNum});
      sel.enter().append('svg')
        .attr({col: colNum, row: rowNum})
        .attr('class', 'plot-svg');
      that.makeCell(sel, x, rowNum, that._ncols);
      that.makeClip(sel, x, rowNum);
    });
  svg.exit().remove();
  that.nSVGs += 1;
};

/* 
  decides how big the svg-wrap needs to be based on 
  rowNum and colNum. Grid style facet only needs additional 
  room on the left most column and bottom most row.
  Wrap style facets need each to be the same size.
*/
Facet.prototype.svgDims = function(rowNum, colNum) {
  var pd = this.plot().plotDim(),
      m = this.plot().margins(),
      fm = this.margins(),
      vShift = this.vShift(),
      dim = {
        // outer svg width and height
        x: pd.x,
        y: pd.y,
        // facet title shift left and down
        ftx: 0,
        fty: 0,
        // plot g elements shifts left and down
        px: 0,
        py: 0,
        // plot dimensions - straight from ggd3.plot()[width|height]()
        plotX: pd.x,
        plotY: pd.y,
      }, 
      ts = this.titleSize();
  if(this.type() === "grid"){
    if(colNum === 0){
      dim.x += m.left + fm.x; 
      dim.px += m.left;
      dim.ftx += m.left;
    } else {
      dim.x += fm.x;
    }
    if(colNum === (this._ncols - 1)){
      dim.x += ts[1] + m.right + fm.x;
    }
    if(rowNum === 0){
      // if titleSize[0] is zero, give a little room
      // for the y-axis to be visible.
      dim.y += (ts[0] + vShift) || 10;
      dim.py += (ts[0] + vShift) || 10;
      dim.fty += (ts[0] + vShift) || 10;
    } else {
      dim.y += fm.y + vShift;
      dim.py += fm.y + vShift;
      dim.fty += fm.y + vShift;
    }
    if(rowNum === (this._nrows - 1)){
      dim.y += m.bottom + fm.y + vShift; 
    }
  } else {
    dim.x += m.left + m.right;
    dim.y += ts[0] + m.top + m.bottom  + vShift;
    dim.ftx += m.left;
    dim.px += m.left;
    dim.py += (ts[0] + vShift) || 10;
  }
  return dim;
};

Facet.prototype.makeClip = function(selection, x, y) {
    // if either xAdjust or yAdjust are present
  var clip = selection.selectAll('defs')
              .data([0]),
      id = this.id(x, y) + this.plot().id() + "-clip",
      dim = this.plot().plotDim();
  clip.select('.clip')
      .attr('id', id)
      .select('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', dim.x)
      .attr('height', dim.y);
  clip.enter().insert('defs', "*")
      .append('svg:clipPath')
      .attr('class', 'clip')
      .attr('id', id)
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', dim.x)
      .attr('height', dim.y);
  selection.select('g.plot')
    .attr('clip-path', "url(#" + id + ")");
};

Facet.prototype.id = function(x, y) {
  var n;
  if(this.x() && this.y()) {
    n = this.y() + "-" + this.yFacets[y]  + '_' + 
    this.x() + "-" + this.xFacets[x];
  } else if(this.x()){
    n = this.x() + "-" + this.xFacets[this.nSVGs];
  } else if(this.y()){
    n = this.y() + "-" + this.yFacets[this.nSVGs];
  } else {
    n = 'single';
  }
  return cleanName(n);
};

Facet.prototype.makeCell = function(selection, colNum, rowNum, 
                                    ncols) {
  var margins = this.plot().margins(),
      dim = this.svgDims(rowNum, colNum),
      that = this,
      // are we on the last row?
      gridX = this.type() === "grid" && rowNum === (this._nrows -1),
      // are we on the first column?
      gridY = this.type() === "grid" && colNum === 0;

  this.makeG(selection, "xgrid", "")
    .attr("transform", "translate(" + [dim.px,dim.py] + ")");
  this.makeG(selection, "ygrid", "")
    .attr("transform", "translate(" + [dim.px,dim.py] + ")");

  var plot = selection.selectAll('g.plot')
                .data([0]);
  plot.transition()
    .attr("transform", "translate(" + [dim.px,dim.py] + ")")
    .select('rect.background')
    .attr({x: 0, y:0, 
      width: dim.plotX, height:dim.plotY});
  plot.enter().append('g')
    .attr('class', 'plot')
    .attr("transform", "translate(" + [dim.px,dim.py] + ")")
    .append('rect')
    .attr('class', 'background')
    .attr({x: 0, y:0, 
      width: dim.plotX, height:dim.plotY});
  plot.exit().remove();

  if(gridX){
    this.makeG(selection, "x axis", " grid")
    .attr("transform", "translate(" + [dim.px,dim.py] + ")");
  } else if(this.type() !== "grid") {
    this.makeG(selection, "x axis", "")
    .attr("transform", "translate(" + [dim.px,dim.py] + ")");
  }
  if(gridY){
    this.makeG(selection, "y axis", " grid")
    .attr("transform", "translate(" + [dim.px,dim.py] + ")");
  } else if(this.type() !== "grid"){
    this.makeG(selection, "y axis", "")
    .attr("transform", "translate(" + [dim.px,dim.py] + ")");
  }
};
// make a g element with the given classes
Facet.prototype.makeG = function (sel, cls, cls2) {
  var both = cls + cls2;
  var g = sel.selectAll('g.' + both.replace(/ /g, "."))
    .data([0]);
  g.enter().append('g')
    .attr('class', cls + cls2);
  g.exit().remove();
  return g;
};

Facet.prototype.makeTitle = function(sel, colNum, rowNum) {
  var that = this,
      ts = this.titleSize(),
      dim = this.svgDims(rowNum, colNum);
  var xlab = sel.selectAll('svg.facet-title-x')
              .data([that.x() + " - " + that.xFacets[colNum]]);
  var ylab = sel.selectAll('svg.facet-title-y')
              .data([that.y() + " - " + that.yFacets[rowNum]]);
  if(this.type() !== "grid" || rowNum === 0 && this.x()){
    xlab.enter().append('svg')
        .attr('class', 'facet-title-x')
        .attr({width: dim.x - dim.ftx, x:dim.ftx,
          height: ts[0]})
        .each(function() {
          d3.select(this).append('rect')
            .attr('class', 'facet-label-x')
            .attr({width: dim.plotX, //x: dim.ftx,
              height: ts[0]});
          d3.select(this).append('text');
        });
    xlab.select('text')
        .attr({fill: 'black',
          opacity: 1,
          x: (dim.x - dim.ftx)/2,
          y: ts[0] * 0.8,
          "text-anchor": that.textAnchorX()})
        .text(identity);
  }
  if(that.type() === "grid" && colNum === (this._ncols - 1) && this.y()){
    ylab.enter().append('svg')
        .attr('class', 'facet-title-y')
        .each(function() {
          d3.select(this).append('rect')
            .attr('class', 'facet-label-y');
          d3.select(this).append('text');
        });
    ylab
      .attr({width: ts[1],
          height: dim.plotY,
          x: (that._ncols === 1) ? dim.plotX + dim.ftx:dim.plotX,
          y: dim.fty})
      .select('rect')
      .attr({width: ts[1], 
        height: dim.plotY});
    ylab.select('text')
        .attr({fill: 'black',
            opacity: 1,
            x: dim.plotY/2,
            y: -ts[1]*0.25,
            "text-anchor": that.textAnchorY(),
            transform: "rotate(90)"})
        .text(identity);
  }
  // add labels to wrap-style faceting.
  if(this.type() === "wrap"){
    xlab.select('text')
        .text(that.wrapLabel(rowNum, colNum));
    sel.select('.facet-title-y')
      .remove();
  }
};

Facet.prototype.wrapLabel = function(row, col) {
  var that = this;
  if(this.x() && !this.y()){
    return this.x() + " - " + this.xFacets[this.nSVGs];
  }
  if(this.y() && !this.x()){
    return this.y() + " - " + this.yFacets[this.nSVGs];
  }
  if(this.x() && this.y()){
    return this.yFacets[row] + "~" + this.xFacets[col];
  }
};

ggd3.facet = Facet;


function Layer(aes) {
  if(!(this instanceof Layer)){
    return new Layer(aes);
  }
  var attributes = {
    plot:     null,
    data:     null,
    dtypes:   null,
    geom:     null,
    stat:     null, // identity, sum, mean, percentile, etc.
    position: null, // jitter, dodge, stack, etc.
    aes:      {},
    ownData:  false,
  };
  // grouping will occur on x and y axes if they are ordinal
  // and an optional array, "group"
  // some summary will be computed on legend aesthetics if
  // they are numeric, otherwise that legend aesthetic will
  // not apply to the grouping if it has more than one
  // unique character element, or it's unique character element
  // will have the scale applied to it.
  this.attributes = attributes;
  var getSet = ["plot", "ownData", 'dtypes', "aggFunctions"];
  for(var attr in this.attributes){
    if(!this[attr] && contains(getSet, attr) ){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
}

Layer.prototype.plot = function(plot) {
  if(!arguments.length) { return this.attributes.plot; }
  this.attributes.plot = plot;
  return this;
};

Layer.prototype.position = function(position){
  if(!arguments.length) { return this.attributes.position; }
  if(this.geom()){
    this.geom().position(position);
  }
  this.attributes.position = position;
  return this;
};

Layer.prototype.updateGeom = function() {
  if(this.geom()) {
    this.geom().layer(this);
  }
};

Layer.prototype.aes = function(aes) {
  if(!arguments.length) { return this.attributes.aes; }
  this.attributes.aes = merge(this.attributes.aes, aes);
  this.updateGeom();
  return this;
};

Layer.prototype.geom = function(geom) {
  if(!arguments.length) { return this.attributes.geom; }
  if(typeof geom === 'string'){
    geom = ggd3.geoms[geom]();
  }
  geom.layer(this);
  this.attributes.geom = geom;
  if(this.stat() === null){
    this.stat(geom.stat());
  }
  if(!this.position()){
    // geoms have a default position
    this.position(geom.position());
  }
  return this;
};

Layer.prototype.stat = function(obj) {
  if(!arguments.length) { return this.attributes.stat; }
  var stat;
  // the "stats" object concept is falling pretty flat.
  if(obj instanceof ggd3.stats){
    stat = obj;
  } else {
    stat = ggd3.stats(obj);
  }
  this.attributes.stat = stat.layer(this);
  return this;
};

Layer.prototype.setStat = function() {
  // Set stats not declared when layer initiated
  var aes = this.aes(),
      dtypes = this.dtypes(),
      stat = this.stat(),
      plot = this.plot(),
      scaleType, dtype, diff;

  diff = Object.keys(aes).filter(function(d) {
    return !contains(stat.exclude, d);
  });
  diff.forEach(function(a) {
    dtype = dtypes[aes[a]];
    if(!stat[a]() && contains(measureScales, a)){
      scaleType = plot[a + "Scale"]().single.type();
      if(contains(linearScales, scaleType) && 
         contains(['x', 'y'], a)){
        if(this.geom() instanceof ggd3.geoms.hline){
          stat[a]('range');
        } else {
          stat[a](stat.linearAgg());
        }
      } else {
        if(this.geom() instanceof ggd3.geoms.hline){
          stat[a]('unique');
        } else {
          stat[a](dtype);
        }
      }
    }
    if(a === "group") {
      // group always get's the "first" function
      stat[a]('first');
    }
  }, this);
  // if a stat has not been set, it is x or y
  // and should be set
  ['x', 'y'].forEach(function(a) {
    if(!stat[a]() ){
      stat[a](stat.linearAgg());
      if(stat.linearAgg() === "bin"){
        aes[a] = "binHeight";
      } else if(stat.linearAgg() === "count") {
        aes[a] = "n. observations";
      } else if(stat.linearAgg() === "density"){
        aes[a] = "density";
      }
      this.aes(aes);
    }
  }, this);
};

Layer.prototype.data = function(data, fromPlot) {
  if(!arguments.length) { return this.attributes.data; }
  if(fromPlot){
    // what?
    this.attributes.data = data;
  } else {
    data = this.unNest(data);
    data = ggd3.tools.clean(data, this);
    this.attributes.dtypes = merge(this.attributes.dtypes, data.dtypes);
    this.attributes.data = data.data;
  }
  return this;
};

Layer.prototype.compute = function(sel) {
  this.setStat();
  var plot = this.plot(),
      dlist;
  if(this.ownData()) {
    dlist = this.dataList(this.nest(this.data()));
  } else {
    dlist = plot.dataList(plot.data());
  } 
  var divs = [];
  // reset geom's data array if geom wasn't given it's own data;
  if(!this.geom().ownData()){
    this.geom().data([]);
  }
  sel.selectAll('.plot-div')
    .each(function(d) {
      divs.push(d3.select(this).attr('id'));
    });
  divs.forEach(function(id, i){
    // cycle through all divs, drawing data if it exists.
    var s = sel.select("#" + id),
        d = dlist.filter(function(d) {
          return d.selector === id;
        })[0];
    // don't bother looking at scales if drawing grid.
    if(d && !(this.geom().grid && this.geom().grid())) {
      plot.setScale(d.selector, this.aes());
      // add a jitter if not present
      if(this.position() === "jitter" && 
         !plot.hasJitter) {
        for(var j = 0; j < d.data.length; j++){
          d.data[j]._jitter = Math.random() * (Math.random()<0.5 ? -1:1);
        }
      }
      d = plot.setDomain(d, this);
    }
    if(d === undefined || Object.keys(d).length === 0) { 
      d = {selector: id, data: []}; 
    }
    if(!this.geom().ownData()){
      this.geom().data().push(d);
    }
  }, this);
};
// the only thing update doesn't do is removeElements.
Layer.prototype.draw = function(sel, layerNum) {
  var divs = [],
      g;
  sel.selectAll('.plot-div')
    .each(function(d) {
      divs.push(d3.select(this).attr('id'));
    });
  divs.forEach(function(id, i){
    // cycle through all divs, drawing data if it exists.
    var selection = sel.select("#" + id),
        data;
    if(!this.geom().ownData()){
        data = this.geom().data().filter(function(d) {
          return d.selector === id;
        })[0];
    } else {
      data = this.geom().data();
    }
    if(layerNum !== undefined){
      if(selection.select('.plot g.g' + layerNum).empty()) {
        g = selection.select('.plot')[this.geom().gPlacement()]('g', 'g')
              .attr('class', 'g g' + layerNum);
      } else {
        g = selection.select('g.g.g' + layerNum);
      }
    } else {
      // if it's a grid, just pass first g to it
      // the geom will get the proper vgrid or hgrid selection
      g = selection.select('g');
    }
    this.geom().removeElements(g, layerNum, "geom-" + 
                               this.geom().name());
    this.geom().draw(g, data, i, layerNum);
  }, this);
};

// same as on plot, for when Layer has it's own data
// accepts output of Nest and returns an array of 
// {selector: [string], data: [array]} objects
Layer.prototype.dataList = DataList;

// same as on plot, for when Layer has it's own data
// Nests according to facets
Layer.prototype.nest = Nest;
Layer.prototype.unNest = unNest;
Layer.prototype.recurseNest = recurseNest;

ggd3.layer = Layer;

// 2. Label facets better and provide option to label with function.
// 3. Better details on boxplot tooltip
// 4. Make annotation object
// 5. Delete relevant scale when aes changes so they'll be recreated.
// 6. Sorting method for ordinal domains -- currently works manually
      // could be better
// 7. Add 5 number option to boxplot
// 8. update numeric scale domains, they get bigger but not smaller.
      // - resetting a scale with null also works
// 11. figure out scale label offsets and foreign object height
// 12. Allow top x-axis labeling/annotation.
// 13. Function placing tooltip wrt border of plot
// 14. Function to position tooltip that does not follow mouse.
// for much later:
// Zoom behaviors: fixed scales get global zoom on linear axes
    // free scales get their own zoom;
// A single context brush should be mountable as a seperate object
// somewhere close to the plot


function Plot() {
  if(!(this instanceof Plot)){
    return new Plot();
  }
  var attributes = {
    data: null,
    dtypes: {},
    layers: [],
    aes: {},
    legends: null, // strings corresponding to scales
    // that need legends or legend objects
    facet: ggd3.facet().plot(this),
    width: 400,
    height: 400,
    margins: {left:20, right:20, top:20, bottom:20},
    xScale: {single: ggd3.scale()}, 
    yScale: {single: ggd3.scale()},
    xDomain: null,
    yDomain: null,
    fillScale: {single: ggd3.scale()},
    colorScale: {single: ggd3.scale()},
    alphaScale: {single: ggd3.scale()},
    sizeScale: {single: ggd3.scale()},
    shapeScale: {single: ggd3.scale()},
    strokeScale: {single: ggd3.scale()},
    subScale: {single:  ggd3.scale()},
    subRangeBand: 0.1,
    subRangePadding: 0.1,
    rangeBand: 0.1,
    rangePadding: 0.1,
    subDomain: null,
    alpha: d3.functor(0.7),
    fill: d3.functor('steelblue'),
    color: d3.functor('black'),
    size: d3.functor(3), 
    shape: d3.functor('circle'),
    lineType: d3.functor('2,2'),
    lineWidth: d3.functor(2),
    xAdjust: false,
    yAdjust: false,
    xGrid: true,
    yGrid: true,
    highlightXZero: true,
    highlightYZero: true,
    gridLineType: "1,1",
    alphaRange: [0.1, 1],
    sizeRange: [3, 20],
    fillRange: ["blue", "red"],
    colorRange: ["white", "black"],
    shapeRange: d3.superformulaTypes,
    opts: {},
    axisLabels: false,
    theme: "ggd3",
    // currently just used to ensure clip-paths are unique
    // on pages with more than one single faceted plot.
    id: parseInt(Math.random(0, 1, true)*10000)
  };

  this.attributes = attributes;
  this.gridsAdded = false;
  this.timesCleaned = 0;
  // if the data method has been handed a new dataset, 
  // newData will be true, after the plot is drawn the
  // first time, newData is set to false
  this.newData = true;
  // flag to set true when random noise is 
  // added to each data point for jittering
  this.hasJitter = false;
  // when cycling through data, need to know if 
  // data are nested or not.
  // this.nested = false;
  this.hgrid = ggd3.layer()
                .plot(this);
  this.vgrid = ggd3.layer()
                .plot(this); 
  // explicitly declare which attributes get a basic
  // getter/setter
  var getSet = ["opts", "theme", "id",
    "width", "height", "xAdjust", "yAdjust", 
    "xDomain", "yDomain", 
    'colorRange', 'sizeRange',
    'fillRange', "lineType", "subScale",
    'rangeBand', 'rangePadding', 
    'subRangeBand', 'subRangePadding', 'subDomain',
    "alphaRange", "lineWidth",
    "xGrid", "yGrid", "gridLineType",
    "highlightXZero", "highlightYZero",
    "axisLabels"];

  for(var attr in attributes){
    if((!this[attr] && 
       contains(getSet, attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

function setGlobalScale(scale) {
  function globalScale(obj) {
    if(!arguments.length) { return this.attributes[scale]; }
    // if function, string, or number is passed,
    // set it as new scale function.
    if(typeof obj === "object"){
      return this.attributes[scale](obj);
    }
    this.attributes[scale] = d3.functor(obj);
    return this;
  }
  return globalScale;
}

function scaleConfig(type) {
  var scale = type + "Scale";
  function scaleGetter(obj){
    if(!arguments.length) {
      return this.attributes[scale];
    }
    // reset to user specified entire scale object
    if(obj instanceof ggd3.scale){
      this.attributes[scale] = {};
      this.attributes[scale].single = obj;
      return this;
    }
    // pass null to reset scales entirely;
    if(obj === null){
      this.attributes[scale] = {single: ggd3.scale() };
      return this;
    }
    if(obj !== undefined) {
      // merge additional options with old options
      if(this.attributes[scale].single instanceof ggd3.scale){
        // scale must have type to be initiated.
        obj = merge(this.attributes[scale].single._userOpts,
                           obj);
      }
      this.attributes[scale].single = ggd3.scale(obj).plot(this);
      return this;
    }
  }
  return scaleGetter;
}


Plot.prototype.alpha = setGlobalScale('alpha');

Plot.prototype.fill = setGlobalScale('fill');

Plot.prototype.color = setGlobalScale('color');

Plot.prototype.size = setGlobalScale('size');

Plot.prototype.shape = setGlobalScale('shape');

Plot.prototype.xScale = scaleConfig('x');

Plot.prototype.yScale = scaleConfig('y');

Plot.prototype.colorScale = scaleConfig('color');

Plot.prototype.sizeScale = scaleConfig('size');

Plot.prototype.strokeScale = scaleConfig('stroke');

Plot.prototype.shapeScale = scaleConfig('shape');

Plot.prototype.fillScale = scaleConfig('fill');

Plot.prototype.alphaScale = scaleConfig('alpha');

Plot.prototype.margins = function(margins) {
  if(!arguments.length) { return this.attributes.margins; }
  this.attributes.margins = merge(this.attributes.margins, margins);
  return this;
};

Plot.prototype.layers = function(layers) {
  if(!arguments.length) { return this.attributes.layers; }
  var aes,
      origAes = clone(this.aes());
  if(Array.isArray(layers)) {
    // allow reseting of layers by passing empty array
    if(layers.length === 0){
      this.attributes.layers = layers;
      return this;
    }
    var layer;
    layers.forEach(function(l) {
      if(typeof l === 'string'){
        // passed string to get geom with default settings
        l = ggd3.layer()
              .aes(clone(origAes))
              .data(this.data(), true)
              .geom(l);
      } else if ( l instanceof ggd3.layer ){
        // user specified layer
        aes = clone(l.aes());
        if(!l.data()) { 
          l.data(this.data(), true); 
        } else {
          l.ownData(true);
        }
        // inherit plot level aesthetics and override 
        // w/ explicitly declared aesthetics.
        l.aes(merge(clone(origAes), clone(aes)));
      } else if (l instanceof ggd3.geom){

        var g = l;
        l = ggd3.layer()
                .aes(clone(origAes))
                .data(this.data(), true)
                .geom(g);
      }
      l.plot(this).dtypes(this.dtypes());
      this.attributes.layers.push(l);
      // this.aes(merge(clone(l.aes()), clone(origAes)));
    }, this);
  } else if (layers instanceof ggd3.layer) {
    if(!layers.data()) { 
      layers.data(this.data(), true); 
    } else {
      layers.ownData(true);
    }
    aes = clone(layers.aes());
    layers.aes(merge(clone(origAes), clone(aes)))
      .dtypes(this.dtypes())
      .plot(this);
    this.attributes.layers.push(layers);
    // this.aes(merge(clone(aes), clone(origAes)));
  } 
  return this;
};

Plot.prototype.dtypes = function(dtypes) {
  if(!arguments.length) { return this.attributes.dtypes; }
  this.attributes.dtypes = merge(this.attributes.dtypes, dtypes);
  this.data(this.data());
  this.updateLayers();
  return this;
};

Plot.prototype.data = function(data) {
  if(!arguments.length || data === null) { return this.attributes.data; }
  // if passing 'dtypes', must be done before
  // let's just always nest and unNest
  this.hasJitter = false;
  data = this.unNest(data);
  data = ggd3.tools.clean(data, this);
  this.timesCleaned += 1;
  // after data is declared, nest it according to facets.
  this.attributes.data = this.nest(data.data);
  this.attributes.dtypes = merge(this.attributes.dtypes, data.dtypes);
  this.updateLayers();
  this.nested = data.data ? true:false;
  this.newData = data.data ? false:true;
  return this;
};

Plot.prototype.updateLayers = function() {

  this.layers().forEach(function(l) {
    l.dtypes(this.dtypes());
    if(!l.ownData()) { 
      l.data(this.data(), true); }
    // plot level aes never override layer level.
    l.aes(merge(clone(this.aes()), l.aes()));
  }, this);
};

Plot.prototype.facet = function(spec) {
  // everytime a facet is passed
  // data nesting must be done again
  if(!arguments.length) { return this.attributes.facet; }
  if(spec instanceof ggd3.facet){
    this.attributes.facet = spec.plot(this);
  } else {
    this.attributes.facet = new ggd3.facet(spec)
                                    .plot(this);
  }
  this.data(this.data());
  return this;
};

Plot.prototype.aes = function(aes) {
  if(!arguments.length) { return this.attributes.aes; }
  // all layers need aesthetics
  aes = merge(this.attributes.aes, clone(aes));
  this.attributes.aes = clone(aes);
  this.updateLayers();
  return this;
};

Plot.prototype.setFixedScale = function(a) {
  var scale = this[a + "Scale"]().single;
  var domain = [];
  // don't bother if no facets.
  if(Object.keys(this[a + "Scale"]()).length === 1) { return scale; }
  var min, max, lower, upper;
  if(contains(linearScales, scale.type())){
    for(var k in this[a + "Scale"]()){
      if(k === "single") { continue; }
      if(this[a + "Scale"]().hasOwnProperty(k)){
        lower = this[a + "Scale"]()[k].domain()[0];
        upper = this[a + "Scale"]()[k].domain()[1];
        min = (min === undefined || min > lower) ? lower: min;
        max = (max === undefined || max < upper) ? upper: max;
      }
    }
    domain[0] = min;
    domain[1] = max;
  } else {
    if((scale._userOpts.scale !== undefined) &&
       (scale._userOpts.scale.domain !== undefined)){
      domain = scale._userOpts.scale.domain;
      return scale.domain(domain);
    }
    for(var k2 in this[a + "Scale"]()){
      if(k2 === "single") { continue; }
      if(this[a + "Scale"]().hasOwnProperty(k2)){
        var nd = this[a + "Scale"]()[k2].domain();
        for(var i = 0; i < nd.length; i++){
          if(!contains(domain, nd[i])){
            domain.push(nd[i]);
          }
        }
        domain.sort();
      }
    }
    domain = domain.filter(function(d) {
      return d !== undefined && d !== null && d !== "";
    });
  }
  scale.scale().domain(domain);
  scale.domain(domain);
};

Plot.prototype.plotDim = function() {
  var margins = this.margins();
  return {x: this.width(),
   y: this.height()};
};

// subScale holds default settings, but
// geoms just copy those settings and make an 
// entirely new scale.
Plot.prototype.setSubScale = function(order) {
  // do nuthin if no ordinal
  var xord = this.xScale().single.type(),
      ord,
      direction, 
      domain;
  // histogram needs subscales, too.
  if(xord === "ordinal"){
    ord = this.xScale().single.scale();
    direction = 'x';
  } else if(this.yScale().single.type() === "ordinal"){
    ord = this.yScale().single.scale();
    direction = 'y';
  } else {
    return false;
  }
  // the first layer is special, it should be the layer with all
  // relevent categorical info. Subsequent layers should only, 
  // if necessary, expand numerical scales.
  domain = this.layers()[0].geom().collectGroups() || [];
  this.subDomain(domain);
  if(!domain.length){
    this.subScale({single: ggd3.scale({type:'ordinal'})
                              .scale({domain:[1]})
                              .range([0, ord.rangeBand()], [0,0])});
  }else {
    this.subScale({single: ggd3.scale({type:'ordinal'})
                                .scale({domain: domain})
                                .range([0, ord.rangeBand()],
                                       [this.subRangeBand(), 
                                        this.subRangePadding()])});

  }
};


Plot.prototype.draw = function(sel) {
  // draw/update facets
  this.facet().updateFacet(sel);
  
  // reset nSVGs after they're drawn.
  this.facet().nSVGs = 0;
  // get the layer classes that should
  // be present in the plot to remove 
  // layers that no longer exist.
  var classes = d3.range(this.layers().length).map(function(n) {
                    return "g" + n;
                  }, this);

  this.setScale('single', this.aes());

  this.layers().forEach(function(l) {
    l.compute(sel);
  });
  // make global scales
  this.setFixedScale('x'); 
  this.setFixedScale('y'); 
  this.setFixedScale('alpha'); 
  this.setFixedScale('size'); 
  this.setFixedScale('stroke'); 
  this.setFixedScale('fill'); 
  this.setFixedScale('color');
  // should set a global sub scale to start
  // at this point, all layers are computed
  // and all groups should be known.
  this.setSubScale();
  this.layers().forEach(function(l, layerNum) {
    l.draw(sel, layerNum);
  });
  sel.selectAll('g.geom')
    .filter(function() {
      var cl = d3.select(this).attr('class').split(' ');
      return contains(classes, cl[1]) === false;
    })
    .transition() // add custom remove function here.
    .style('opacity', 0)
    .remove();
  // if any of the layers had a jitter, it has
  // been added to each facet's dataset
  if(any(this.layers(), function(l) {
    return l.position() === "jitter";
  })) { 
    this.hasJitter = true; 
  }

  // drawing grids last, after all
  // facet scales are calculated.
  // if you're drawing something with more than
  // 30 layers, you can tweak this yourself.
  if(this.yGrid()) { 
    this.hgrid
      .geom(ggd3.geoms.hline().grid(true)
        .lineType(this.gridLineType())
        .highlightZero(this.highlightYZero()));
    this.hgrid.compute(sel);
    this.hgrid.draw(sel);}
  if(this.xGrid()) { 
    this.vgrid
      .geom(ggd3.geoms.vline().grid(true)
        .lineType(this.gridLineType())
        .highlightZero(this.highlightXZero()));
    this.vgrid.compute(sel);
    this.vgrid.draw(sel);
  }
  return this;
};

Plot.prototype.nest = Nest;
// returns array of faceted objects {selector: s, data: data} 
Plot.prototype.dataList = DataList;

Plot.prototype.unNest = unNest;
Plot.prototype.recurseNest = recurseNest;

// update method for actions requiring redrawing plot
Plot.prototype.update = function() {

};

ggd3.plot = Plot;
// opts looks like {scale: {}, 
              // axis: {}, 
              // type: <"linear", "ordinal", "time", etc... >,
              // orient: "",
              // position: ""};
// for scales not x or y, axis will reflect 
// settings for the legend (maybe)
// all scales will get passed through "setScales"
// but opts will override defaults
function Scale(opts) {
  if(!(this instanceof Scale)){
    return new Scale(opts);
  }
  // allow setting of orient, position, type, 
  // scale and axis settings, etc.
  var attributes = {
    aesthetic: null,
    domain: null,
    range: null,
    plot: null,
    type: null, // linear, log, ordinal, time, category, 
    // maybe radial, etc.
    scale: null,
    rangeBands: [0.1, 0.1],
    opts: {},
    label: null,
    labelPosition: [0.5, 0.5],
    offset: 55,
  };
  // store passed object
  this.attributes = attributes;
  var getSet = ["aesthetic", "plot", 
                "rangeBands", "label"];
  for(var attr in this.attributes){
    if(!this[attr] && contains(getSet, attr) ){
      this[attr] = createAccessor(attr);
    }
  }
  this._userOpts = {};
  if(opts !== undefined){
    // opts may be updated by later functions
    // _userOpts stays fixed on initiation.
    this._userOpts = clone(opts, true);
    this.opts(opts);
    opts = this.opts();
    ['type', 'scale', 'label', 'offset'].forEach(function(o){
      if(opts.hasOwnProperty(o)){
        this[o](opts[o]);
      }
    }, this);
  }
}

Scale.prototype.opts = function(o) {
  if(!(arguments.length)) { return this.attributes.opts; }
  this.attributes.opts = o;
  return this;
};

Scale.prototype.type = function(type) {
  if(!arguments.length) { return this.attributes.type; }
  this.attributes.type = type;
  switch(type) {
    case 'linear':
      this.attributes.scale = d3.scale.linear().nice();
      break;
    case 'log':
      this.attributes.scale = d3.scale.log().nice();
      break;
    case 'ordinal':
      this.attributes.scale = d3.scale.ordinal();
      break;
    case 'time':
      this.attributes.scale = d3.time.scale().nice();
      break;
    case 'date':
      this.attributes.scale = d3.time.scale().nice();
      break;
    case "category10":
      this.attributes.scale = d3.scale.category10();
      break;
    case "category20":
      this.attributes.scale = d3.scale.category20();
      break;
    case "category20b":
      this.attributes.scale = d3.scale.category20b();
      break;
    case "category20c":
      this.attributes.scale = d3.scale.category20c();
    break;
  }
  return this;
};

Scale.prototype.style = function(sel) {
  var styles = ['text', 'style'],
      axis = this.opts().axis;

  for(var i = 0; i < styles.length; i++){
    if(axis.hasOwnProperty(styles[i]) ){
      sel.call(axis[styles[i]]);
    }
  }
};

Scale.prototype.scale = function(settings){
  if(!arguments.length) { return this.attributes.scale; }
  for(var s in settings){
    if(this.attributes.scale && 
       this.attributes.scale.hasOwnProperty(s)){
      this.attributes.scale[s](settings[s]);
    }
  }
  return this;
};

Scale.prototype.range = function(range, rb) {
  if(!arguments.length) { return this.attributes.range; }
  if(this.type() === "ordinal"){
    if(rb === undefined) { 
      rb = this.rangeBands(); 
    }
    this.attributes.scale
        .rangeRoundBands(range, rb[0], rb[1]);
  } else {
    this.attributes.scale.range(range);
  }
  this.attributes.range = range;
  return this;
};

Scale.prototype.domain = function(domain) {
  if(!arguments.length) { return this.attributes.domain; }
  domain = domain.filter(function(d) {
    return d !== undefined && d !== null && d !== "";
  });
  if(this.type() ==="log"){
    if(!all(domain, function(d) { return d > 0;}) ){
      console.warn("domain must be greater than 0 for log scale." +
      " Scale " + this.aesthetic() + " has requested domain " +
      domain[0] + " - " + domain[1] + ". Setting lower " +
      "bound to 1. Try setting them manually." );
      domain[0] = 1;
    }
  }
  if(this.domain() === null){ 
    this.attributes.domain = domain.filter(function(d) {
                              return d !== null && d !== undefined && d !== "";
                                });
    } else {
    var d = this.attributes.domain;
    if(contains(linearScales, this.type())){
      if(domain[0] < d[0]) { this.attributes.domain[0] = domain[0];}
      if(domain[1] > d[1]) { this.attributes.domain[1] = domain[1];}
      this.attributes.domain = ggd3.tools
                                .numericDomain(this.attributes.domain);
    } else {
      var newDomain = [];
      flatten([d, domain]).map(function(d) {
        if(!contains(newDomain, d)){
          newDomain.push(d);
        }
      });
      newDomain.sort();
      this.attributes.domain = newDomain.filter(function(d) {
        return d !== null && d !== undefined && d !== "";
      });
    }
  }
  if(this.scale() !== null){
    this.scale().domain(this.attributes.domain);
  }
  return this;
};

Scale.prototype.offset = function(o) {
  if(!arguments.length) { return this.attributes.offset; }
  this.attributes.offset = o;
  return this;
};

Scale.prototype.axisLabel = function(o) {
  var l = this.label();
  if(o instanceof d3.selection){
    var pd = this.plot().plotDim(),
        tr, offset,
        r = 90;
    if(this.aesthetic() === "y"){
      offset = this.opts().axis.position === "left" ? -this.offset():this.offset();
      tr = "translate(" + offset + "," + pd.y + ")rotate(" + -r + ")";
    } else {
      offset = this.opts().axis.position === "top" ? -this.offset():this.offset();
      tr = "translate(0," + offset + ")";
    }

    var label = o.selectAll('.label').data([0]);
    label
      .attr('width', pd[this.aesthetic()])
      .attr('height', "23")
      .attr('transform', tr)
      .each(function() {
        d3.select(this).select('p').text(l);
      })
      .select('body')
      .style('position', 'inherit');
    label.enter().append('foreignObject')
      .attr('width', pd[this.aesthetic()])
      .attr('height', "23")
      .attr('transform', tr)
      .attr('class', 'label')
      .append('xhtml:body')
      .style('position', 'inherit')
      .append('div')
      .append('p')
      .text(l);
  }
};

Scale.prototype.positionAxis = function(rowNum, colNum) {
  var facetDims = this.plot().facet().svgDims(rowNum, colNum),
      x = facetDims.px,
      y = facetDims.py;
  if(this.aesthetic() === "x"){
    if(this.opts().axis.position === "bottom"){
      y += facetDims.plotY;
    } else if(this.opts().axis.orient === "top"){
      
    }
  }
  if(this.aesthetic() === "y"){
    if(this.opts().axis.position === "right"){
      x += facetDims.plotX;
    }
  }
  return [x, y];
};

ggd3.scale = Scale;
// only required by plot, no need to pass plot in.
// geom will already have it's scale available to it,
// regardless of whether it's layer has own data.
// probably no need to pass data in either.
// Plot knows it's facet, data and aes, therefore with 
// dataList, can get a list of facet ids and relevent data
// with which to make scales per facet if needed.
// if an aes mapping or facet mapping does exist in data
// throw error.
var measureScales = ['x', 'y', 'color','size', 'fill' ,'alpha', 'size'],
    linearScales = ['log', 'linear', 'time', 'date'],
    globalScales = ['alpha','fill', 'color', 'size', 'shape'];

// make or update a scale based on new info from layers
function setScale(selector, aes) {
  // gather user defined settings in opts object
  var opts = {},
      // user defined opts and the fixed scale domain
      scales = intersection(measureScales, 
                            ['x', 'y'].concat(Object.keys(aes)));
  scales.map(function(a) {
    // there is a scale "single" that holds the 
    opts[a] = this[a + "Scale"]().single._userOpts;
  }, this);

  // must reset this if aes changes
  scales.forEach(function(a) {
    if(this[a + "Scale"]()[selector] === undefined ||
      this[a + "Scale"]()[selector].scale() === null){
      this.makeScale(selector, a, opts[a], aes[a]);
    }
  }, this);
  scales.forEach(function(a) {
    // give user-specified scale settings to single facet
    this[a + "Scale"]().single._userOpts = clone(opts[a], true);
  }, this);
}

function makeScale(selector, a, opts, vname) {
  var dtype, settings;
  if(contains(measureScales, a)){
    // get plot level options set for scale.
    // if a dtype is not found, it's because it's x or y and 
    // has not been declared. It will be some numerical aggregation.
    dtype = this.dtypes()[vname] || ['number', 'many'];
    settings = merge(ggd3.tools.defaultScaleSettings(dtype, a),
                       opts);
    var scale = ggd3.scale(settings)
                        .plot(this)
                        .aesthetic(a);
    if(contains(['x', 'y'], a)){
      if(a === "x"){
        scale.range([0, this.plotDim().x], 
                    [this.rangeBand(), this.rangePadding()]);
      }
      if(a === "y") {
        scale.range([this.plotDim().y, 0],
                    [this.rangeBand(), this.rangePadding()]);
      }
      if((scale.label() === null) && this.axisLabels()){
        scale.label(vname);
      }
      scale.axis = d3.svg.axis().scale(scale.scale());
      for(var ax in settings.axis){
        if(scale.axis.hasOwnProperty(ax)){
          if(!Array.isArray(settings.axis[ax])){
            scale.axis[ax](settings.axis[ax]);
          } else {
            var x = settings.axis[ax];
            scale.axis[ax](x[0], x[1]); 
          }
        }
      }
    }
    for(var s in settings.scale){
      if(scale.scale().hasOwnProperty(s)){
        scale.scale()[s](settings.scale[s]);
      }
    }
    this[a + "Scale"]()[selector] = scale;
  }
}

function setDomain(data, layer) {
  if(any(data.data.map(function(d) {
    // pass holds aesthetics that shouldn't factor into scale training.
    var pass = ['yintercept', 'xintercept', 'slope'];
    return intersection(pass, Object.keys(d)).length > 0;
  }))){
    console.log("unnecessary data, skipping setDomain");
    return data;
  }
  var geom = layer.geom(),
      s = geom.setup(),
      domain,
      scale;

  this.globalScales = globalScales.filter(function(sc) {
    return contains(Object.keys(s.aes), sc);
  });

  this.freeScales = [];

  ['x', 'y'].forEach(function(a) {
    // do not cycle through scales declared null.
    if(s.aes[a] !== null){
      if(!contains(['free', 'free_' + a], s.facet.scales()) ){
        this.globalScales.push(a);
      } else {
        this.freeScales.push(a);
      }
    }
  }, this);

  // each facet's data rolled up according to stat
  // unnested - an array of observations.
  data.data = this.unNest(geom.compute(data.data, s));

  // free scales
  if(this.freeScales.length > 0){
    this.freeScales.forEach(function(k){
      var minmax;
      if(contains(['xmin', 'ymin', 'xmax', 'ymax'], k)){
        // must do soemthing different for mins and maxes
        // if a min or max is requested, send it to domain
        // this is getting ugly...
        minmax = k;
        k = k[0];
      }
      scale = this[k+ "Scale"]()[data.selector];
      scale.domain(geom.domain(data.data, k, minmax));
      if(contains(linearScales, scale.type())){
        scale.scale().nice();
      }
    }, this);
  }
  function first(d) {
    return d[0];
  }
  function second(d) {
    return d[1];
  }
  // calculate global scales
  this.globalScales.forEach(function(g){
    if(s.aes[g] !== null){
      if(contains(globalScales, g)){
        // if(_.contains(['xmin', 'ymin', 'xmax', 'ymax'], g)){
        //   g = g[0];
        // }
        scale = this[g + "Scale"]().single;
        // scale is fill, color, alpha, etc.
        // with no padding on either side of domain.
        if(contains(linearScales, scale.type())){
          domain = ggd3.tools.numericDomain(data.data, s.aes[g]);
          scale.range(this[g + 'Range']());
          scale.scale().nice();
        } else {
          if(scale.domain() === null){
            domain = unique(ggd3.tools.categoryDomain(data.data, s.aes[g]));
          } else {
            domain = scale.domain();
          }
          domain = compact(domain);
        }
        scale.domain(domain);
      } else {
        scale = this[g + "Scale"]()[data.selector];
        if((scale._userOpts.scale !== undefined) &&
           (scale._userOpts.scale.domain !== undefined)){
          domain = scale._userOpts.scale.domain;
        }else {
          domain = geom.domain(data.data, g);
        }
        if(!contains(linearScales, scale.type())){
          domain = unique(domain);
          domain.sort();
        }
        scale.domain(domain);
      }
      this[g + "Scale"]()[data.selector] = scale;
      // user-supplied scale parameters
      for(var sc in scale._userOpts.scale){
        if(scale.scale().hasOwnProperty(sc)){
          scale.scale()[sc](scale._userOpts.scale[sc]);
        }
      }
      if(contains(linearScales, scale.type())){
        scale.scale().nice();
      }
      // weird wrapper for legend aesthetic functions
      if(contains(globalScales, g)) {
        var aesScale = _.bind(function(d) {
          // if a plot doesn't use a particular
          // aesthetic, it will trip up here, 
          // test if it exists.
          if(d[s.aes[g]] !== undefined){
            return this.scale()(d[s.aes[g]]);
          }
        }, scale);
        this[g](aesScale);
      }
    }
  }, this);

  return data;
}

Plot.prototype.setScale = setScale;

Plot.prototype.makeScale = makeScale;

Plot.prototype.setDomain = setDomain;
// tooltip
function Tooltip (spec) {
  if(!(this instanceof Tooltip)){
    return new Tooltip(spec);
  }
  var attributes = {
    offset: {x: 15, y:15},
    styleClass: null,
    opacity: 1,
    content: null,
    geom: null,
  };

  this.attributes = attributes;
  for(var attr in attributes) {
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
    this[attr] = createAccessor(attr);
    }
  }
}

Tooltip.prototype.find = function(el) {
  var parent = d3.select(el.parentNode);
  if(!parent.select('.ggd3tip').empty()) { return parent.select('.ggd3tip'); }
  return this.find(el.parentNode);
};

Tooltip.prototype.tooltip = function(selection, s) {
  var that = this;
  if(s === undefined){
    s = this.geom().setup();
  }
  selection.each(function(data) {
    var tooltipdiv = that.find(this);
    d3.select(this)
      .on('mouseover.tooltip', function(d) {that.show(d, tooltipdiv, s); })
      .on('mousemove.tooltip', function(d) {that.move(d, tooltipdiv); })
      .on('mouseout.tooltip', function(d) {that.hide(d, tooltipdiv); });
  });
};

Tooltip.prototype.show = function(data, sel, s) {
  var tt = sel.select('.tooltip-content');
  tt.selectAll('*')
    .remove();
  this.content()(tt.data([data]), s);
  sel.transition().duration(200)
    .style('opacity', 1);
};

Tooltip.prototype.move = function(data, sel) {
  sel
    .style('left', d3.event.layerX + this.offset().x + "px")
    .style('top', d3.event.layerY + this.offset().y + "px");
};

Tooltip.prototype.hide = function(data, sel) {
  sel.attr('class', 'ggd3tip')
    .transition().duration(200)
    .style('opacity', 0)
    .transition().delay(200).duration(0)
    .style("top", 0 + "px")
    .style("left", 0 + "px")
    .select('.tooltip-content').selectAll('*')
    .remove();
};

ggd3.tooltip = Tooltip;
// Base geom from which all geoms inherit
// tooltip gets passed the selection, data, geom.setup() and "opts"
// whatever those are.
function Geom(aes) {
  if(!(this instanceof Geom)){
    return new Geom(aes);
  }
  var attributes = {
    layer: null,
    stat: null,
    fill: null,
    alpha: null,
    color: null,
    size: null,
    position: null,
    gPlacement: 'append',
    drawX: true,
    drawY: true,
    data: [],
    ownData: false,
    style: "", // optional class attributes for css 
    tooltip: null,
    groups: null, 
    subRangeBand: 0,
    subRangePadding: 0,
    omit: null,
    mergeOn: null,
    enter: null,
    exit: null,
    initial: null,
  };
  var r = function(d) { return ggd3.tools.round(d, 2);};
  // default tooltip
  // done here because setting a big long
  // default function on attributes is messy.
  function tooltip(sel, s, opts){
    var omit = this.omit() || [],
        d = sel.data()[0],
        diff;
    omit = flatten([omit, s.stat.exclude]);
    // if 'additional' aesthetics are declared, they are wanted regardless.
    // remove them from the omit array
    omit.splice(omit.indexOf('additional'), 1);
    diff = Object.keys(s.aes).filter(function(d) {
            return !contains(omit, d);
          });
    diff.forEach(function(k) {
      if(k === 'additional'){
        s.aes[k].forEach(function(a, i) {
          sel.append('h4')
            .text(a + ": ")
            .append('span').text(this.abbrev(d, s, k, i));
        }, this);
      } else {
      if(s.stat[k] === null || s.stat[k]() === null){ return null; }
      var stat = s.stat[k]()._name || "identity";
      stat = contains(["identity", "first"], stat) ? "": " (" + stat + ")";
        sel.append('h4')
          .text(s.aes[k] + stat + ": ")
          .append('span').text('(' + k + ') ' + 
                               this.abbrev(d, s, k));
      }
    }, this);
  }
  this.attributes = attributes;
  this.attributes.tooltip = tooltip.bind(this);
}

Geom.prototype.tooltip = function(tooltip) {
  if(!arguments.length) { return this.attributes.tooltip; }
  var wrapper = function(sel, s, opts) {
    sel.each(function(d) {
      var el = d3.select(this);
      tooltip(el, d, s, opts);
    });
  };
  this.attributes.tooltip = wrapper;
  return this;
};

Geom.prototype.defaultPosition = function() {
  var n = this.name();
  return {
    "point": "identity",
    "text": "identity",
    "bar": "stack",
    "box": "dodge",
    "hline": "identity",
    "vline": "identity",
    "abline": "identity",
    "smooth": "loess", 
    "area" : "identity",
    "error": "identity",
    "density": "kernel",
    "path" : "identity",
    "ribbon" : "identity",
    }[n];
};

Geom.prototype.abbrev = function(d, s, a, i){
  if(a === 'additional'){ 
    a = s.aes[a][i]; 
  } else {
    a = s.aes[a];
  }
  var dtype = s.dtypes[a],
      format;
  if(dtype){
    if(dtype[0]==='date'){
      format = d3.time.format(dtype[2] || "%Y-%m-%d");
      return format(d[a]);
    }
    else if(dtype[0] === 'number'){
      format = d3.format(dtype[2] || ",.2fo");
      return format(d[a]);
    }
    return d[a];
  } else {
    // this is a computed variable. ie "binHeight"
    return d3.format(",.2f")(d[a]);
  }
};

Geom.prototype.merge_variables = function(variables){
  if(this.mergeOn() !== null){
    return this.mergeOn();
  }
  var s = this.setup(),
      matched = intersection(variables,
                   Object.keys(s.dtypes).filter(function(d) {
                       return (s.dtypes[d][1] === 'few' ||
                               s.dtypes[d][0] === 'string');
                     }));
  return matched;
};

Geom.prototype.data_matcher = function(matches){
  return function(d, i) {
    if(matches.length){
      return matches.map(function(m) {
        return d[m];
      }).join(' ');
    } else {
      return i;
    }
  };
};

Geom.prototype.setup = function() {
  // when calling a geom from within
  // another geom, many of these properties will not exist.
  var s = {
      layer     : this.layer(),
    };
  // sometimes a geom doesn't have a layer as in 
  // compound geoms - boxplot is box and point.
  if(s.layer){
    s.grouped   = false;
    s.plot      = s.layer.plot();
    s.stat      = s.layer.stat();
    s.nest      = this.nest();
    s.dtypes    = s.plot.dtypes();
    s.position  = s.layer.position();
    s.dim       = s.plot.plotDim();
    s.facet     = s.plot.facet();
    s.aes       = s.layer.aes();
    s.fill      = d3.functor(this.fill() || s.plot.fill());
    s.size      = d3.functor(this.size() || s.plot.size());
    s.alpha     = d3.functor(this.alpha() || s.plot.alpha());
    s.color     = d3.functor(this.color() || s.plot.color());
    s.nest.rollup(function(d) {
      return s.stat.compute(d);
    });
    if(s.aes.fill) {
      s.grouped = true;
      s.group = s.aes.fill;
    } else if(s.aes.color){
      s.grouped = true;
      s.group = s.aes.color;
    } else if(s.aes.group){
      s.grouped = true;
      s.group = s.aes.group;
    }
    // not convinced this is a good idea.
    // if(contains([s.facet.x(), s.facet.y()], 
    //               s.group)) {
    //   // uninteresting grouping, get rid of it.
    //   s.grouped = false;
    //   s.group = null;
    //   s.groups = null;
    //   // must get all groups from layer to do this
    //   // meaningfully. Facets without a group 
    //   // are throwing it off.
    // }
  }
  return s;
};

Geom.prototype.collectGroups = function() {
  var groups, grouped,
      aes = this.layer().aes();
  if(aes.fill) {
    grouped = true;
    group = aes.fill;
  } else if(aes.color){
    grouped = true;
    group = aes.color;
  } else if(aes.group){
    grouped = true;
    group = aes.group;
  }
  if(grouped) {
    groups = unique(
                pluck(
                  flatten(
                    this.data().map(getItem('data'))), group));
    this.groups(groups);
  }
  return groups;
};

Geom.prototype.compute = function(data, s) {
  return s.nest.entries(data);
};

Geom.prototype.domain = function(data, a) {
  var layer   = this.layer(),
      plot    = layer.plot(),
      aes     = layer.aes(),
      extent,
      range;

  if(contains(linearScales, plot[a + "Scale"]().single.type())) {
    extent  = d3.extent(pluck(data, aes[a]));
    range   = extent[1] - extent[0];
  } else {
    var domain = unique(data, aes[a]);
    return domain.sort();
  }
  // done if date
  // and not a calculated aesthetic
  var skip = ['binHeight', 'density', 'n. observations', undefined],
      skip2 = ['yintercept', 'xintercept', 'slope'];

  if(!contains(skip, aes[a]) && !contains(skip2, a)){
    if(contains(["date", "time"], plot.dtypes()[aes[a]][0]) ){
      return extent;
    }
  }
  // extent both ways
  if(range === 0){
    extent[0] -= 1;
    extent[1] += 1;
  }
  extent[0] -= 0.1 * range;
  extent[1] += 0.1 * range;
  return extent;
};


Geom.prototype.scalesAxes = function(sel, setup, selector, 
                                     layerNum, drawX, drawY){

  var x, y,
      parentSVG = d3.select(sel.node().parentNode.parentNode), 
      plot = this.layer().plot(),
      rowNum = parseInt(parentSVG.attr('row')),
      colNum = parseInt(parentSVG.attr('col'));
  // choosing scales based on facet rule

  if(!contains(["free", "free_x"], setup.facet.scales()) || 
     setup.plot.xScale()[selector] === undefined){
    x = setup.plot.xScale().single;
    xfree = false;
  } else {
    x = setup.plot.xScale()[selector];
    xfree = true;
  }
  if(!contains(["free", "free_y"], setup.facet.scales()) || 
     setup.plot.xScale()[selector] === undefined){
    y = setup.plot.yScale().single;
    yfree = false;
  } else {
    y = setup.plot.yScale()[selector];
    yfree = true;
  }

  if(layerNum === 0 && drawX){
    var xax = parentSVG.select('.x.axis')
              .attr("transform", "translate(" + x.positionAxis(rowNum, colNum) + ")")
              .attr('opacity', 1)
              .call(x.axis);
    x.style(xax);
    xax.attr('opacity', 1);
    if(x.label()){
      parentSVG.select('.x.axis')
        .call(x.axisLabel.bind(x));
    }
  }
  if(layerNum === 0 && drawY){
    var yax = parentSVG.select('.y.axis')
              .attr("transform", "translate(" + y.positionAxis(rowNum, colNum) + ")")
              .attr('opacity', 1)
              .transition().call(y.axis);
    y.style(yax);
    yax.attr('opacity', 1);
    if(y.label()){
      parentSVG.select('.y.axis')
        .call(y.axisLabel.bind(y));
    }
  }
  return {
    x: x,
    y: y,
    xfree: xfree,
    yfree: yfree,
  };
};

Geom.prototype.nest = function() {

  // to be performed before calculating layer level geoms or scales
  var aes = this.layer().aes(),
      plot = this.layer().plot(),
      nest = d3.nest(),
      dtypes = plot.dtypes(),
      nestVars = unique(compact([aes.group, aes.fill, aes.color]));

  nestVars.forEach(function(n) {
    if(dtypes[n][1] !== "many") {
      nest.key(function(d) { return d[n]; });
    }
  });
  ['x', 'y'].forEach(function(a) {
    if(plot[a + "Scale"]().single.type() === "ordinal"){
      nest.key(function(d) { return d[aes[a]]; });
    }
  });
  return nest;
};

Geom.prototype.removeElements = function(sel, layerNum, clss) {
  var remove = sel
                .selectAll('.geom.g' + layerNum)
                .filter(function() {
                  return d3.select(this)[0][0].classList !== clss;
                });
  remove.transition()
    .style('opacity', 0)
    .remove();

};

ggd3.geom = Geom;


Geom.prototype.unNest = unNest;
Geom.prototype.recurseNest = recurseNest;

// 
function Bar(spec) {
  if(!(this instanceof Geom)){
    return new Bar(spec);
  }

  Geom.apply(this);
  var attributes = {
    name: "bar",
    stat: "count",
    geom: "rect",
    position: "dodge",
    lineWidth: 0,
    offset: 'zero',
    groupRange: 0,
    stackRange: 0,
  };

  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Bar.prototype = new Geom();

Bar.prototype.constructor = Bar;

Bar.prototype.fillEmptyStackGroups = function(data, v) {
  // every object in data must have same length
  // array in its 'value' slot
  // this should be usable for histograms as well
  // but currently is not.
  if(!data.length) { return data; }
  var keys = unique(flatten(data.map(function(d) {
    return d.values.map(function(e) {
      return e[v];
    });
  })));
  // get an example object and set it's values to null;
  var filler = clone(data[0].values[0]);
  for(var k in filler){
    filler[k] = null;
  }
  data.forEach(function(d) {
    var dkeys, missing;
    dkeys = pluck(d.values, v);
    missing = compact(keys.filter(function(k) {
      return !contains(dkeys, k);
    }));
    if(missing.length !== 0) {
      missing.forEach(function(m) {
        // must fill other values, too.
        var e = clone(filler);
        e[v] = m;
        d.values.push(e);
      });
    }
    d.values = merge_sort(d.values, v);
  });

  return data;
};

Bar.prototype.domain = function(data, a) {
  var s = this.setup(),
      valueVar = s.aes[a] ? s.aes[a]: "n. observations",
      group, stackby,
      groupRange, stackRange,
      grouped;
  if(!contains(linearScales, s.plot[a + "Scale"]().single.type())) {
    var domain = unique(pluck(data, s.aes[a])).sort();
    return domain;
  }
  group = s.aes.fill || s.aes.color || s.aes.group;
  stackby = a === "x" ? s.aes.y: s.aes.x;

  grouped = d3.nest()
              .key(function(d) {
                return d[stackby];
              })
              .entries(data);

  stackRange = grouped.map(function(d) {
    return d.values.reduce(function(a, b) {
      return a[valueVar] + b[valueVar];
    });
  });
  stackRange = d3.extent(stackRange);
  groupRange = d3.extent(data, function(d) {
    return d[valueVar];
  });

  stackRange[0] = 0 - 0.1 * (stackRange[1] - stackRange[0]);
  groupRange[0] = 0 - 0.1 * (groupRange[1] - groupRange[0]);
  stackRange[1] *= 1.1;
  groupRange[1] *= 1.1;
  this.stackRange(stackRange);
  this.groupRange(groupRange);
  return s.position === "stack" ? stackRange: groupRange;
};

Bar.prototype.vertical = function(s){
  return (s.plot.xScale().single.type() === "ordinal" ||
                      s.aes.y === "binHeight");
};

Bar.prototype.draw = function(sel, data, i, layerNum) {

  var s     = this.setup(),
      that  = this,
      o, // original value or ordinal scale
      n, // numeric agg scale
      rb, // final range band
      o2, // used to calculate rangeband if histogram
      valueVar, // holds aggregated name
      categoryVar, // name of bar positions
      // original subscale
      pSub = s.plot.subScale().single.scale(),
      // secondary ordinal scale to calc dodged rangebands
      sub,
      drawX     = this.drawX(),
      drawY     = this.drawY(),
      vertical = this.vertical(s);

  if(contains(['wiggle', 'silhouette'], that.offset()) ){
    var parentSVG = d3.select(sel.node().parentNode.parentNode);
    if(vertical){
      // x is bars, don't draw Y axis
      drawY = false;
      parentSVG.select('.y.axis')
        .selectAll('*')
        .transition()
        .style('opacity', 0)
        .remove();
    } else {
      // y is ordinal, don't draw X.
      drawX = false;
      parentSVG.select('.x.axis')
        .selectAll('*')
        .transition()
        .style('opacity', 0)
        .remove();
    }
  }
  // gotta do something to reset domains if offset is expand
  if(that.offset() === "expand"){
    var k;
    if(vertical){
      for (k in s.plot.yScale()){
        s.plot.yScale()[k].domain([-0.02,1.02]);
      }
    } else {
      for (k in s.plot.xScale()){
        s.plot.xScale()[k].domain([-0.02,1.02]);
      }
    }
  }

  var scales = that.scalesAxes(sel, s, data.selector, 
                               layerNum,
                               drawX, drawY);
  // scales are drawn by now. return if no data.
  if(!data.data.length){ return false; }

  // prep scales for vertical or horizontal use.
  // "o" is ordinal, "n" is numeric
  // width refers to scale defining rangeband of bars
  // size refers to scale defining its length along numeric axis
  // s and p on those objects are for size and position, respectively.
  // need to use this for histograms too, but it's going to be
  // tricky
  if(vertical){
    // vertical bars
    o = scales.x.scale();
    n = scales.y.scale();
    size = {s: "height", p: 'y'};
    width = {s: "width", p: 'x'};
  } else {
    // horizontal bars    
    o = scales.y.scale();
    n = scales.x.scale();
    size = {s: "width", p:'x'};
    width = {s:"height", p: 'y'};
  }
  if(!s.group){
    s.group = s.aes[size.p];
  }
  s.groups = unique(pluck(data.data, s.group));

  data = this.unNest(data.data);
  // data must be nested to go into stack algorithm
  if(s.group){
    data = d3.nest().key(function(d) { return d[s.group];})
              .entries(data);
  } else {
    data = [{key: 'single',values: data}];
  }

  // with histograms, if a bin is empty, it's key comes
  // back 'undefined'. This causes bars to be drawn
  // from the top (or right). They should be removed
  data = data.filter(function(d) { 
    return d.key !== "undefined" ;});
  if(this.name() === "bar"){
    rb = o.rangeBand();
    valueVar = s.aes[size.p] || "n. observations";
    categoryVar = s.aes[width.p];
  } else if(this.name() === "histogram"){
    valueVar = "binHeight";
    categoryVar = s.group;
    if(vertical){
      rb = o(o.domain()[0] + data[0].values[0].dx );
    } else {
      rb = o(o.domain()[1] - data[0].values[0].dx );
    }
  }
  if(s.grouped && 
     contains([s.aes.x, s.aes.y], s.group)){
    console.log('grouping is already shown by facets' +
                ' unnecessary color scales probably generated');
  }
  data = that.fillEmptyStackGroups(data, categoryVar);
  var stack = d3.layout.stack()
                .x(function(d) { return d[categoryVar]; })
                .y(function(d) {
                  return d[valueVar]; })
                .offset(that.offset())
                .values(function(d) { 
                  return d.values; });
  data = stack(data).map(function(d) {
                            return d.values ? d.values: [];
                          });

  data = flatten(data, this.name() === 'bar' ? true:false);

  data = data.filter(function(d) {
    var isnull = any([d[s.aes[width.p]], d[s.group]], function(x) {
      return (x === null) || (x === undefined);
    });
    return !isnull;
  });

  if(s.position === 'dodge' && this.name() === 'bar') {
    // make ordinal scale for group
    sub = d3.scale.ordinal()
            .domain(pSub.domain());
    var rrb = pSub.rangeExtent();
    rb = [];
    rb[0] = typeof this.subRangeBand() ==='number' ? this.subRangeBand(): s.plot.subRangeBand();
    rb[1] = typeof this.subRangePadding() ==='number' ? this.subRangePadding(): s.plot.subRangePadding();
    sub.rangeRoundBands(rrb, rb[0], rb[1]);
    rb = sub.rangeBand();
  } else {
    sub = function(d) {
      return 0;
    };
  }
  // dodge histograms require a secondary scale on a numeric axis
  if(this.name() === "histogram" && s.position === "dodge"){
    sub = d3.scale.ordinal()
            .domain(this.collectGroups())
            .rangeRoundBands([0, rb], 0, 0);
    rb = sub.rangeBand();
  }
  
  var placeBar = (function() {
    if(that.name() === "bar" || vertical){
      return function(d) {
        var p = o(d[s.aes[width.p]]);
        p += sub(d[s.group]) || 0;
        return p || 0;};
    } else {
      return function(d) {
        var p = o(d[s.aes[width.p]]) - rb;
        p += sub(d[s.group]) || 0;
        return p || 0;
        };
    }
  })();

  // I think this is unnecessary.
  var calcSizeS = (function() {
    if(s.position === 'stack' && size.p === "y"){
      return function(d) {
        return Math.abs(n(0) - n(d.y));
      };
    }
    if(s.position === "stack"){
      return function(d) {
        return Math.abs(n(d.y) - n(0));
      };
    }
    if(s.position === "dodge" && size.p === "y"){
      return function(d) {
        return Math.abs(n(0) - n(d.y)); 
      };
    }
    return function(d) {
      return Math.abs(n(d[valueVar]) - n(0)); 
    };
  })();
  var calcSizeP = (function () {
    if(s.position === "stack" && size.p === "y"){
      return function(d) { 
        return n(d.y0 + d.y); 
        };
    }
    if(s.position === "stack"){
      return function(d) {
        return n(d.y0);
      };
    }
    if(s.position === "dodge" && size.p === "y") {
      return function(d) {
        return d3.min([n(d.y), n(0)]);
      };
    }
    return function(d) {
      return d3.min([n(0), n(d.y)]);
    };
  } )();

  var matched = this.merge_variables(Object.keys(data[0]));
  var data_matcher = this.data_matcher(matched).bind(this);
  var bars = sel.selectAll('rect.geom.g' + layerNum)
                .data(data, data_matcher),
      tt = ggd3.tooltip()
            .content(this.tooltip())
            .geom(this);

  function draw(rect) {
    rect.attr('class', 'geom g' + layerNum + ' geom-bar')
      .attr(size.s, calcSizeS)
      .attr(width.s, rb)
      .attr(size.p, calcSizeP)
      .attr(width.p , placeBar || 0)
      .attr('value', function(d) { 
        return d[s.group] + "~" + d[s.aes[width.p]];
      })
      .attr('fill', s.fill)
      .attr('stroke', s.color)
      .attr('stroke-width', that.lineWidth())
      .attr('fill-opacity', s.alpha);
  }

  bars.transition().call(draw)
    .each(function(d) {
      tt.tooltip(d3.select(this));
    });
  
  bars.enter()
    .append(this.geom())
    .attr(width.s, rb)
    .attr(width.p, placeBar)
    .attr(size.s, 0)
    .attr(size.p, function(d) {
      return n(0);
    })
    .transition()
    .call(draw);

  bars.exit()
    .transition()
    .style('opacity', 0)
    .remove();
  bars.each(function(d) {
      tt.tooltip(d3.select(this));
    });
};

ggd3.geoms.bar = Bar;

function Line(spec) {
  if(!(this instanceof ggd3.geom)){
    return new Line(spec);
  }
  Geom.apply(this, spec);
  var attributes = {
    name: "line",
    stat: "identity",
    geom: "path",
    grid: false,
    interpolate: 'linear',
    lineType: null,
    lineWidth: null,
    tension: 0.7,
    freeColor: false,
    position: "append" 
  };
  // freeColor is confusing. Most global aesthetics should be 
  // that way. 
  // My example is faceted by decade, meaning the color variable
  // "date", doesn't change much within a facet. With "freeColor" it does.
  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}


Line.prototype = new Geom();

Line.prototype.constructor = Line;

Line.prototype.lineType = function(l) {
  if(!arguments.length) { return this.attributes.lineType; }
  this.attributes.lineType = d3.functor(l);
  return this;
};

Line.prototype.generator = function(aes, x, y, o2, group) {
  if(this.name() === "linerange"){
    pos = function() { return o2.rangeBand()/2; };
  } else {
    pos = function(i) { return o2.rangeBand()*i; };
  }
  var line = d3.svg.line()
              .interpolate(this.interpolate())
              .tension(this.tension());
  if(x.hasOwnProperty('rangeBand')) {
    return line
            .x(function(d, i) { 
              return (x(d[aes.x]) + o2(d[group]) + 
                            pos(i)); 
            })
            .y(function(d) { return y(d[aes.y]); });
  }
  if(y.hasOwnProperty('rangeBand')) {
    return line
            .x(function(d) { return x(d[aes.x]); })
            .y(function(d, i) { 
              return (y(d[aes.y]) + o2(d[group]) +
                            pos(i)); 
            });
  }
  return line
          .defined(function(d, i) { return !isNaN(y(d[aes.y])); })
          .x(function(d, i) { return x(d[aes.x]); })
          .y(function(d, i) { return y(d[aes.y]); });
};

Line.prototype.selector = function(layerNum) {
  if(this.grid()){
    var direction = this.name() === "hline" ? "x": "y";
    return "grid-" + direction;
  }
  return "geom g" + layerNum + " geom-" + this.name();
};

Line.prototype.drawLines = function (path, line, s, layerNum) {
  var that = this, lt;
  if(!this.lineType()){
    lt = s.plot.lineType();
  } else {
    if(this.grid()){
      lt = function(d) {
        return d[0].zero ? 'none':that.lineType()(d);
      };
    }else{
      lt = this.lineType();
    }
  }
  var lw = d3.functor(this.lineWidth());
  path.attr("class", this.selector(layerNum))
    .attr('d', line)
    .attr('stroke-dasharray', lt);
  if(!this.grid()){
    path
      .attr('opacity', function(d) { return s.alpha(d[1]) ;})
      .attr('stroke', function(d) { return s.lcolor(d[1]);})
      .attr('stroke-width', function(d) {
        return lw(d[1]);
      })
      .attr('fill',  function(d) { 
        return s.gradient ? s.lcolor(d[1]): 'none';});
  }
};

Line.prototype.prepareData = function(data, s) {
  data = s.nest
          .entries(data.data) ;
  // array of grouped data with 1 or 2 group variables
  data = data.map(function(d) { return this.recurseNest(d);}, this);
  data = ggd3.tools.arrayOfArrays(data);
  return Array.isArray(data[0]) ? data: [data];
};

Line.prototype.draw = function(sel, data, i, layerNum){
  // console.log('first line of line.draw');
  var s      = this.setup(),
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                 this.drawX(), this.drawY()),
      x = scales.x.scale(),
      y = scales.y.scale(),
      parentSVG = d3.select(sel.node().parentNode.parentNode),
      o2 = function() { return 0; };
      o2.rangeBand = function() { return 0; };
      s.gradient = false;

  if(x.hasOwnProperty('rangeBand') ||
     y.hasOwnProperty('rangeBand')){
    if(s.grouped) {
      o2 = s.plot.subScale().single.scale();
    } else {
      if(x.hasOwnProperty('rangeBand')){
        o2.rangeBand = function() { return x.rangeBand(); };
      } else {
        o2.rangeBand = function() { return y.rangeBand(); };
      }
    }
  }

  var l1 = this.generator(s.aes, x, y, o2, s.group),
      selector = data.selector;
  data = this.prepareData(data, s, scales);
  if(flatten(data).length === 0) { return data; }
  // overwriting the color function messes up tooltip labeling,
  // if needed.
  s.lcolor = s.color;

  // if color gradient
  if(s.aes.color && contains(['number', 'date', 'time'], s.dtypes[s.aes.color][0]) && s.dtypes[s.aes.color][1] === "many"){
    s.gradient = true;
    if(this.freeColor()){
      var color = d3.scale.linear()
                .range(s.plot.colorRange())
                .domain(d3.extent(pluck(flatten(data), s.aes.color)));
      s.lcolor = function(d) { return color(d[s.aes.color]); };
    } 
    data = data.map(function(d) { 
      return this.quad(this.sample(d, l1, x, y, s.color, s.aes ), 
                       s.aes); }, this);
    data = flatten(data, false);
    // alpha must be constant
    var lw = this.lineWidth();
    s.alpha = s.plot.alpha();
    line = function(d) {
      return this.lineJoin(d[0], d[1], d[2], d[3], lw);
    }.bind(this);
  } else {
    line = l1;
  }
  sel = this.grid() ? parentSVG.select("." + this.direction() + 'grid'): sel;
  var matched = this.merge_variables(Object.keys(data[0]));
  var data_matcher = this.data_matcher(matched).bind(this);

  var lines = sel.selectAll("." + 
                            this.selector(layerNum).replace(/ /g, '.'))
              .data(data, data_matcher);
  lines.transition().call(this.drawLines.bind(this), line, s, layerNum);
  lines.enter().append(this.geom(), ".geom")
    .call(this.drawLines.bind(this), line, s, layerNum);
  lines.exit()
    .transition()
    .style('opacity', 0)
    .remove();
  return data;
};
// next four functions copied verbatim from http://bl.ocks.org/mbostock/4163057
// used to add linear gradient to line.
// Sample the SVG path string "d" uniformly with the specified precision.
// gonna use this for discrete change of colors for a few points and
// continuous change of color for many
Line.prototype.sample = function(d, l, x, y, color, aes) {
  var n = d.length;
  d = d.map(function(r, i) {
        var o = [];
        o[aes.color] = r[aes.color];
        o[0] = x(r[aes.x]);
        o[1] = y(r[aes.y]);
        return o;
      });
  return d;
  // uncomment this code for continuous gradient legends, for example.
  // var path = document.createElementNS(d3.ns.prefix.svg, "path");
  // path.setAttribute("d", l(d);
  // var n = path.getTotalLength(), t = [0], i = 0, 
  //     dt = Math.floor(n/precision);
  //     console.log(n);
  // while ((i += dt) < n) { t.push(i); }
  // t.push(n);

  // return t.map(function(t) {
  //   var p = path.getPointAtLength(t), a = [p.x, p.y];
  //   a.t = t / n;
  //   return a;
  // });
};

// Compute quads of adjacent points [p0, p1, p2, p3].
Line.prototype.quad = function(points, aes) {
  return d3.range(points.length - 1).map(function(i) {
    var a = [points[i - 1], points[i], points[i + 1], points[i + 2]];
    a[aes.color] = (points[i][aes.color] + points[i + 1][aes.color]) / 2;
    return a;
  });
};

// Compute stroke outline for segment p12.
Line.prototype.lineJoin = function(p0, p1, p2, p3, width) {
  var u12 = this.perp(p1, p2),
      r = width / 2,
      a = [p1[0] + u12[0] * r, p1[1] + u12[1] * r],
      b = [p2[0] + u12[0] * r, p2[1] + u12[1] * r],
      c = [p2[0] - u12[0] * r, p2[1] - u12[1] * r],
      d = [p1[0] - u12[0] * r, p1[1] - u12[1] * r],
      e, u23, u01;

  // this section is causing very large numbers in y vector.
  // if (p0) { // clip ad and dc using average of u01 and u12
  //   u01 = this.perp(p0, p1);
  //   e = [p1[0] + u01[0] + u12[0], p1[1] + u01[1] + u12[1]];
  //   a = this.lineIntersect(p1, e, a, b);
  //   d = this.lineIntersect(p1, e, d, c);
  // }

  // if (p3) { // clip ab and dc using average of u12 and u23
  //   u23 = this.perp(p2, p3);
  //   e = [p2[0] + u23[0] + u12[0], p2[1] + u23[1] + u12[1]];
  //   b = this.lineIntersect(p2, e, a, b);
  //   c = this.lineIntersect(p2, e, d, c);
  // }
  return "M" + a + "L" + b + " " + c + " " + d + "Z";
};

// Compute intersection of two infinite lines ab and cd.
Line.prototype.lineIntersect = function(a, b, c, d) {
  var x1 = c[0], x3 = a[0], x21 = d[0] - x1, x43 = b[0] - x3,
      y1 = c[1], y3 = a[1], y21 = d[1] - y1, y43 = b[1] - y3,
      ua = (x43 * (y1 - y3) - y43 * (x1 - x3)) / (y43 * x21 - x43 * y21);
  return [x1 + ua * x21, y1 + ua * y21];
};

// Compute unit vector perpendicular to p01.
Line.prototype.perp = function(p0, p1) {
  var u01x = p0[1] - p1[1], u01y = p1[0] - p0[0],
      u01d = Math.sqrt(u01x * u01x + u01y * u01y);
  return [u01x / u01d, u01y / u01d];
};

ggd3.geoms.line = Line;
// 
function Histogram(spec) {
  if(!(this instanceof Geom)){
    return new Histogram(spec);
  }
  Bar.apply(this);
  var attributes = {
    name: "histogram",
    stat: "bin",
    position: "stack",
    bins: 30,
    breaks: null,
    frequency: true,
  };
  var r = function(d) { return ggd3.tools.round(d, 2);};
  this.attributes = merge(this.attributes, attributes);

  function tooltip(sel, opts) {
    var s = this.setup(),
        that = this,
        v = s.aes.y === "binHeight" ? s.aes.x: s.aes.y,
        c = s.aes.fill || s.aes.color;
    sel.each(function(d) {
        var el = d3.select(this);
        if(c) {
          el.append('h4')
            .text(c + ": ")
            .append('span')
            .text(d[c]);
        }
        el.append('h4')
          .text(v + ": " )
          .append("span").text(r(d[v]) + " - " + r(d[v]+d.dx));
        el.append('h4')
          .text("bin size: " )
          .append("span").text(r(d.binHeight));
        el.append('h4')
          .text("n: " )
          .append("span").text(d.length);
    });
  }
  this.attributes.tooltip = tooltip.bind(this);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Histogram.prototype = new Bar();
  
Histogram.prototype.constructor = Histogram;

// can't get histogram to match by relevent variables
Histogram.prototype.data_matcher = function(matches){
  return function(d, i) {
    // if(matches.length){
    //   // console.log(d[0]);
    //   return _.map(matches, function(m) {
    //     if(d.length > 0){
    //       // match from first element in bin array
    //       return d[0][m];
    //     }else {
    //       // no elements in this bin, skip
    //       return i;
    //     }
    //   }).join(' ');
    // } else {
      return i;
    // }
  };
};

Histogram.prototype.domain = function(data, v) {
  var s = this.setup(),
      group, stackby,
      groupSum, stackSum,
      grouped;

  if(s.aes[v] === "binHeight") {
    grouped = d3.nest()
                .key(function(d) {
                  return d.x;
                })
                .entries(data);
    stackSum = grouped.map(function(d) {
      return d.values.reduce(function(pre, val) {
        return val.y + pre;
      }, 0);
    });
    stackSum = d3.extent(stackSum.map(function(v, k) { return v; }));
    groupSum = d3.extent(data, function(d) {
      return d.y;
    });
    extent = s.position === "stack" ? stackSum: groupSum;
    range = extent[1] - extent[0];
    extent[0] -= 0.05*range;
  } else {
    extent = d3.extent(pluck(data, 'x'));
    range = extent[1] - extent[0];
    extent[0] -= 0.1*range;
  }
  // extent both ways to draw an empty chart, I guess
  if(range === 0){
    extent[0] -= 1;
    extent[1] += 1;
  }
  extent[1] += 0.1*range;
  return extent;
};

Histogram.prototype.compute = function(data, s) {
  // first get bins according to ungrouped data;
  if(!s.grouped) { 
    return s.nest.entries(data); 
  }
  this.breaks(this.bins());
  var unNested = s.stat.compute(data),
      breaks = pluck(unNested, "x");
  // this is the problem
  // there should be a 'fixed bins' flag
  this.breaks(breaks);
  return s.nest.entries(data);
};

Histogram.prototype.fillEmptyStackGroups = function(data, v) {
  console.log(data);

  var keys = unique(pluck(data, function(d) { return d.key; })),
      vals = unique(flatten(pluck(data, function(d) {
        return pluck(d.values, 'x');
      }))),
      empty = {};
  empty.y = 0;
  empty.binHeight = 0;
  empty.dx = data[0].dx;
  console.log(vals);
  data.forEach(function(d) {
    var dkeys, missing;
    dkeys = pluck(d.values, 'x');
    missing = compact(vals.filter(function(k) {
      return !contains(dkeys, k);
    }));
    if(missing.length !== 0) {
      missing.forEach(function(m) {
        // must fill other values, too.
        var e = clone(empty);
        e.x = m;
        d.values.push(e);
      });
    }
    d.values = d.values.sort(function(a, b) {
      return b.x - a.x;
    });
  });
  return data;
};
// geoms may want to be nested differently.
Histogram.prototype.nest = function() {
  // if stacking histograms, bins must be calculated
  // first on entire facet, then individually on
  // each stack layer. If facet.scales() === "fixed"
  // bins should be the same across facets. If not
  // the pre calculated bins need to be stored and 
  // referenced when calculating layers.
  // one call to goem histogram is going through 47 times.
  var aes = this.layer().aes(),
      plot = this.layer().plot(),
      nest = d3.nest(),
      dtypes = plot.dtypes(),
      nestVars = unique(compact([aes.group, aes.fill, aes.color]));

  nestVars.forEach(function(n) {
    if(dtypes[n][1] !== "many") {
      nest.key(function(d) { return d[n]; });
    }
  });
  ['x', 'y'].forEach(function(a) {
    if(plot[a + "Scale"]().single.type() === "ordinal"){
      nest.key(function(d) { return d[aes[a]]; });
    }
  });
  return nest;
};

ggd3.geoms.histogram = Histogram;

function Abline(spec) {
  if(!(this instanceof Geom)){
    return new Abline(spec);
  }
  Line.apply(this);
  var attributes = {
    name: "abline",
  };

  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Abline.prototype = new Line();

Abline.prototype.constructor = Abline;

Abline.prototype.domain = function(data, a) {
  // it is not getting called because slope and intercept
  // have no need to set a scales domain.
  // maybe...
  return data;
};

Abline.prototype.prepareData = function(d, s, scales) {

  if(!contains(Object.keys(s.aes), "yintercept")){
    throw "geom abline requires aesthetic 'yintercept' and an optional slope.";
  }
  if(!contains(linearScales, scales.x.type() )){
    throw "use geom hline or vline to draw lines on an ordinal x axis y yaxis";
  }
  if(!s.aes.slope){
    s.aes.slope = 0;
  }
  var xdomain = scales.x.scale().domain(),
      data;
  if(typeof s.aes.yintercept === 'number'){
    s.aes.yintercept = [s.aes.yintercept];
  }
  if(Array.isArray(s.aes.yintercept)){
    // yints and slopes are drawn on every facet.
    data = s.aes.yintercept.map(function(y) {
      return xdomain.map(function(x, i) {
        var o = {};
        o[s.aes.x] = x;
        o[s.aes.y] = y + s.aes.slope * x;
        return o;
      });
    });
  }
  if(typeof s.aes.yintercept === 'string'){
    data = [];
    d.data.forEach(function(row) {
      data.push(xdomain.map(function(x) {
        var o = {};
        o[s.aes.x] = x;
        o[s.aes.y] = row[s.aes.yintercept] + row[s.aes.slope] * x;
        o = merge(clone(row), o);
        return o;
      }));
    }); 
  }
  return data;
};


ggd3.geoms.abline = Abline;
// 
function Area(spec) {
  if(!(this instanceof Area)){
    return new Area(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "area",
    stat: "identity",
    geom: "path",
    gPlacement: 'insert',
    interpolate: 'linear',
    alpha: 0.2,
    strokeOpacity: 0.1
  };

  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Area.prototype = new Geom();

Area.prototype.constructor = Area;

Area.prototype.prepareData = function(data, s) {
  data = s.nest
          .entries(data.data || data) ;
  data = data.map(function(d) { return this.recurseNest(d);}, this);
  return Array.isArray(data[0]) ? data: [data];
};

Area.prototype.generator = function(aes, x, y, o2, group, n) {
  var dir = aes.ymin !== undefined ? 'x': 'y',
      other = dir === "x" ? "y": 'x',
      dirScale = dir === "x" ? x: y,
      otherScale = dir === "x" ? y: x;
  var area = d3.svg.area()
                .interpolate(this.interpolate());

  if(x.hasOwnProperty('rangeBand')) {
    return area
            .x0(function(d, i) { 
              return (x()(d[aes.x]) + o2(d[group])); 
            })
            .x1(function(d, i) { 
              return (x()(d[aes.x]) + o2(d[group]) + 
                            o2.rangeBand()); 
            })
            .y(function(d) { return y()(d[aes.y]); });
  }
  if(y.hasOwnProperty('rangeBand')) {
    return area
            .x(function(d) { return x()(d[aes.x]); })
            .y0(function(d, i) { 
              return (y()(d[aes.y]) + o2(d[group]) +
                            o2.rangeBand()); 
            })
            .y1(function(d, i) { 
              return (y()(d[aes.y]) + o2(d[group])); 
            });
  }
  area[dir](function(d, i) { 
    return dirScale()(d[aes[dir]]); 
    });
  area[other + "0"](function(d, i) { 
    return otherScale(other + 'min', n)(d); });
  area[other + '1'](function(d, i) { 
    return otherScale(other + 'max', n)(d); });
  return area;
};


Area.prototype.decorateScale = function(dir, s, sc, data) {
  // if it's area, don't use data and just use values
  var a = this.name() === 'area';
  if(typeof s.aes[dir + 'min'] === 'number'){
    // both ymin and ymax should be set to be a number above
    // and below the given y variable
    this.check(s.aes, dir);
    if(a) {
      return function(m) {
        return function(d) { return sc(s.aes[m]); };
      };
    }else {
      return function(m) {
        return function(d) { return sc(d[s.aes[dir]] + s.aes[m]);};
      };
    }
  } else if(typeof s.aes[dir + "min"] === 'function') {
    this.check(s.aes, dir);
    // is trusting the order a reliable thing to do?
    var minAgg = data.map(function(d) { 
      return -s.aes[dir + 'min'](pluck(d, s.aes[dir]));
    });
    var maxAgg = data.map(function(d) { 
      return s.aes[dir + 'max'](pluck(d, s.aes[dir]));
    });
    return function(m, i) {
      return function(d) {
        var v = m === (dir + 'max') ? maxAgg[i]:minAgg[i];
        return sc(d[s.aes[dir]] + v) ;};
    };
  } else if (typeof s.aes[dir + "min"] === 'string'){
    this.check(s.aes, dir);
    // not tested, should work fine;
    return function(m) {
      return function(d) { 
        return sc(d[s.aes[dir]] + d[s.aes[m]]);
      };
    };
  } else {
    // we're not going in that direction
    return function() {
      return function(d) {
        return sc(d);
      };
    };
  }
};

Area.prototype.check = function(aes, d) {
  if(!aes[d + 'min'] || !aes[d + 'max']){
    throw "You must specify, as a function, variable, or constant" +
      " a " + d + "min and " + d + "max";
  }
};

Area.prototype.drawArea = function(area, gen, s, layerNum) {
  var that = this;
  area.attr('class', "geom g" + layerNum + " geom-" + this.name())
    .attr('d', gen)
    .attr('fill-opacity', function(d) { return s.alpha(d[0]); })
    .attr('stroke', function(d) { 
      return s.color(d[0]); 
    })
    .attr('stroke-opacity', function(d) { return that.strokeOpacity(); })
    .attr('fill', function(d) { return s.fill(d[0]); });
};

Area.prototype.data_matcher = function(matches, layerNum){
  return function(d, i) {
    if(matches.length){
      return matches.map(function(m) {
        return d[m];
      }).join(' ') + " " + i + " " + layerNum;
    } else {
      return i;
    }
  };
};


// area recieves an array of objects, each of which
// have variables corresponding to ymin, ymax, xmin, xmax
// or those aesthetics are numbers or functions 
Area.prototype.draw = function(sel, data, i, layerNum){
  var s = this.setup(),
      that = this,
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                this.drawX(), this.drawY()),
      x = scales.x.scale(),
      y = scales.y.scale(),
      y2,
      x2,
      selector = data.selector,
      o,
      o2 = function() { return 0; };
      o2.rangeBand = function() { return 0;};
  // flatten till we have an array of arrays.
  data = ggd3.tools.arrayOfArrays(this.prepareData(data, s));
  // area should work on ordinal axes as well.
  // so we can do, like, bullet charts'n shit.
  y2 = this.decorateScale('y', s, y);
  x2 = this.decorateScale('x', s, x);

  // silly way to give scale wrappers an ownProperty
  // of 'rangeBand' to satisfy generator conditions for ordinal
  if(x.hasOwnProperty('rangeBand')){
    if(s.grouped) {
      o = s.plot.subScale().single.scale();
      o2 = d3.scale.ordinal()
              .domain(o.domain())
              .rangeRoundBands(o.rangeExtent(), 
                               s.plot.subRangeBand()/2,
                               s.plot.subRangePadding()/2);
      x2.rangeBand = function() { return "yep"; };
    }
  }
  if(y.hasOwnProperty('rangeBand')){
    if(s.grouped) {
      o = s.plot.subScale().single.scale();
      o2 = d3.scale.ordinal()
              .domain(o.domain())
              .rangeRoundBands(o.rangeExtent(), 
                               s.plot.subRangeBand()/2,
                               s.plot.subRangePadding()/2);
      y2.rangeBand = function() { return "yep"; };
    }
  }
  var areaGen = that.generator(s.aes, x2, y2, o2, s.group);
  var matched = this.merge_variables(Object.keys(data[0][0]));
  var data_matcher = this.data_matcher(matched, layerNum).bind(this);
  var area = sel.selectAll("path.geom.g" + layerNum + ".geom-" + this.name())
              .data(data, data_matcher); // one area per geom
  area.transition()
    .each(function(d, i) {
      that.drawArea(d3.select(this), areaGen, s, layerNum);
    });
  area.enter().append(this.geom())
    .each(function(d, i) {
      that.drawArea(d3.select(this), areaGen, s, layerNum);
    });
  area.exit()
    .transition()
    .style('opacity', 0)
    .remove();
};

ggd3.geoms.area = Area;
// 
function Box(spec) {
  if(!(this instanceof Geom)){
    return new Box(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "box",
    stat: "box",
  };

  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Box.prototype = new Geom();

Box.prototype.constructor = Box;

Box.prototype.determineOrdinal = function(s) {
  // this is dumb, this logic needs to happen when scales are created;
  if(s.plot.xScale().single.type() === "ordinal"){
    return 'x';
  } else {
    return 'y';
  }
};

Box.prototype.domain = function(data, a) {

  var s = this.setup(),
      factor = this.determineOrdinal(s),
      number = factor === 'x' ? 'y': 'x',
      domain,
      extent;
  if(a === factor) {
    domain = data.map(function(d) {
      return unique(pluck(d.data, s.aes[a]));
    });
    domain.sort();
  } else {
    domain = d3.extent(flatten(data.map(function(d) {
      return pluck(d.data, s.aes[a]);
    })));
    extent = domain[1] - domain[0];
    domain[0] -= extent*0.1;
    domain[1] += extent*0.1;
  }
  return domain;
};
// box takes an array of numbers and draws a box around the 
// two extremes and lines at the inner points.
Box.prototype.drawGeom = function(box, x, y, w, h, s, layerNum) {
  box.attr({
    x: x,
    y: y,
    width: w,
    height: h,
    fill: s.fill,
    "fill-opacity": s.alpha,
    stroke: s.color,
    "stroke-opacity": s.alpha
  });

};

Box.prototype.draw = function(sel, data, i, layerNum) {
  // not really necessary, but can look a lot like point and text.
  // might be the same. 
};

ggd3.geoms.box = Box;
// 
function Boxplot(spec) {
  if(!(this instanceof Geom)){
    return new Boxplot(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "boxplot",
    stat: "boxplot",
    position: "jitter",
    upper: 0.95,
    lower: 0.05,
    tail: null,
    outliers: true,
    outlierColor: null,
    mean: false,
  };

  var r = function(d) { return ggd3.tools.round(d, 2);};
  function tooltip(sel, s, opts) {
    var that = this;
    sel.each(function(d) {
        var el = d3.select(this);
        Object.keys(d.quantiles).forEach(function(k) {
          el.append('h5')
            .text(k + ": " + d3.format(',.2')(r(d.quantiles[k])));
        });
    });
  }
  attributes.tooltip = tooltip.bind(this);

  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Boxplot.prototype = new Geom();

Boxplot.prototype.constructor = Boxplot;

Boxplot.prototype.determineOrdinal = function(s) {
  // this is dumb, this logic needs to happen when scales are created;
  if(s.plot.xScale().single.type() === "ordinal"){
    return 'x';
  } else {
    return 'y';
  }
};

Boxplot.prototype.domain = function(data, a) {

  var s = this.setup(),
      factor = this.determineOrdinal(s),
      number = factor === 'x' ? 'y': 'x',
      domain = [],
      extent,
      factors;
  if(a === factor) {
     factors = data.map(function(d) {
      return pluck(d.data, getItem(s.aes[a]));
    });
    factors = flatten(factors);
    for(var i = 0; i < factors.length; i++){
      if(!contains(domain, factors[i])){
        domain.push(factors[i]);
      }
    }
    domain.sort();
  } else {
    domain = d3.extent(flatten(data.map(function(d) {
      return pluck(d.data, getItem(s.aes[a]));
    })));
    extent = domain[1] - domain[0];
    domain[0] -= extent*0.1;
    domain[1] += extent*0.1;
  }
  return domain;
};

Boxplot.prototype.draw = function(sel, data, i, layerNum) {

  var s = this.setup(),
      that = this,
      o, n, o2, rb,
      size, width,
      line,
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                               this.drawX(), this.drawY()),
      vertical = scales.x.type() === "ordinal",
      factor = vertical ? "x": "y",
      number = vertical ? "y": "x";

  data = this.unNest(data.data);
  o = scales[factor].scale();
  rb = o.rangeBand();
  n = scales[number].scale();
  line = d3.svg.line();

  if(vertical){
    // vertical boxes
    size = {s: "height", p: 'y', c: "cy"};
    width = {s: "width", p: 'x', c: "cx"};
    // point scales;
    px = function(d) { return (d._jitter * rb/2) + rb/2; };
    py = function(d) { return n(d[s.aes[number]]); };
    // box scales
    rx = function(d) { return 0; };
    ry = function(d) { 
      return n(d.quantiles["75th percentile"] ); };
    rw = function() { return rb; };
    rh = function(d) { 
      return (n(d.quantiles["25th percentile"]) - 
              n(d.quantiles["75th percentile"])); };
  } else {
    // horizontal boxes
    size = {s: "width", p:'x', c: "cx"};
    width = {s:"height", p: 'y', c: "cy"};
    py = function(d) { return (d._jitter * rb/2) + rb/2; };
    px = function(d) { return n(d[s.aes[number]]); };
    ry = function(d) { return 0; };
    rx = function(d) { 
      return n(d.quantiles["25th percentile"] ); };
    rh = function() { return rb; };
    rw = function(d) { 
      return (n(d.quantiles["75th percentile"]) - 
              n(d.quantiles["25th percentile"])); };
  }
  if(s.grouped && !contains([s.aes.x, s.aes.y], s.group)) {
    s.groups = unique(flatten(data.map(function(d) {
      return pluck(d.data, s.group);
    })));
    s.groups.sort();
    o2 = s.plot.subScale().single.scale();
    rb = o2.rangeBand();
  } else {
    o2 = function() {
      return 0;
    };
    o2.rangeBand = function() { return 0; };
  }

  function whisker(d, dir) {
    var out;
    switch(dir){
      case "upper":
        out = [[rb/2, n(d.upper)],
          [rb/2, n(d.quantiles["75th percentile"])]];
        break;
      case "lower":
        out = [[rb/2, n(d.lower)],
        [rb/2, n(d.quantiles["25th percentile"])]];
        break;
      case "median":
        out = [[0, n(d.quantiles["50th percentile"])], 
        [rb, n(d.quantiles["50th percentile"])]];
        break;
    }
    if(!vertical) { 
      out = out.map(function(d){
                  return d.reverse();
              }); 
    }
    return out;
  }

  function draw(box) {
    var d = box.datum(),
    rect = box.selectAll('rect')
              .data([d]);
    box.select(".upper")
      .datum(whisker(d, 'upper'))
      .attr('d', line)
      .attr('stroke', 'black');
    box.select(".lower")
      .datum(whisker(d, 'lower'))
      .attr('d', line)
      .attr('stroke', 'black');
    box.select(".median")
      .datum(whisker(d, 'median'))
      .attr('d', line)
      .attr('stroke', 'black');
    box
      .attr("transform", function(d) {
        var v = o(d[s.aes[factor]]) + o2(d[s.group]);
        if(!vertical) { 
          return "translate(0," + v + ")";
        } 
        return "translate(" + v + ",0)" ;
      });
    var r = ggd3.geoms.box(),
        tt = ggd3.tooltip()
                .content(that.tooltip())
                .geom(that);
    rect.call(r.drawGeom, rx, ry, rw, rh, s, layerNum);
    rect.enter().insert('rect', ".upper")
      .attr('class', 'quantile-box')
      .call(r.drawGeom, rx, ry, rw, rh, s, layerNum)
      .each(function(d) {
        tt.tooltip(d3.select(this));
      });
    if(that.outliers()) {
      var p = ggd3.geoms.point().color(d3.functor(this.outlierColor));
      s.x = px;
      s.y = py;
      p.draw(box, d.data, i, layerNum, s);
    }
  }
  var matched = intersection(Object.keys(data[0]), 
                               Object.keys(s.dtypes).filter(function(d) {
                                 return s.dtypes[d][1] === 'few';
                               }));
  var data_matcher = this.data_matcher(matched).bind(this);
  var boxes = sel.selectAll('.geom g' + layerNum)
                .data(data, data_matcher);

  boxes.each(function(d) {
    d3.select(this).call(draw.bind(this));
  });

  boxes.enter().append('g').each(function(d) {
    var b = d3.select(this);
    b.attr('class', 'geom g' + layerNum + ' geom-' + that.name());
    b.append('path').attr('class', 'upper');
    b.append('path').attr('class', 'lower');
    b.append('path').attr('class', 'median');
    b.call(draw);
  });
  boxes.exit().transition()
    .style("opacity", 0)
    .remove();
};

ggd3.geoms.boxplot = Boxplot;
// 
function Density(spec) {
  if(!(this instanceof Geom)){
    return new Density(spec);
  }
  Geom.apply(this, spec);
  var attributes = {
    name: "density",
    stat: "density",
    kernel: "epanechnikovKernel",
    geom: "path",
    smooth: 6,
    nPoints: 100,
    fill: false, // fill with same color?
    alpha: 0.8,
    lineType: null,
    lineWidth: null
  };

  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Density.prototype = new Geom();
  
Density.prototype.constructor = Density;

Density.prototype.kde = function(kernel, x) {
  return function(sample) {
    return x.map(function(x) {
      return [x, d3.mean(sample, function(v) { return kernel(x-v); })];
    });
  };
};

Density.prototype.gaussianKernel = function(scale) {
  var pi = 3.14159265359,
      sqrt2 = Math.sqrt(2);
  return function(u){
    return 1/(sqrt2*pi) * Math.exp(-1/2 * Math.pow(u*scale, 2));
  };
};
Density.prototype.epanechnikovKernel = function(scale) {
  return function(u) {
    return Math.abs(u /= scale) <= 1 ? 0.75 * (1 - u * u) / scale : 0;
  };
};

Density.prototype.draw = function(sel, data, i, layerNum){

  var s     = this.setup(),
      that  = this;

  function drawDensity(path){

    path.attr('class', 'geom g' + layerNum + " geom-density")
        .attr('d', function(d) {
            return line(d.values);
        })
        .attr('stroke-width', that.lineWidth())
        .attr('stroke-dasharray', that.lineType())
        .attr('stroke', function(d) {
          return s.color(d.values[1]); 
        })
        .attr('stroke-opacity', that.alpha());
    if(that.fill()){
      path
        .style('fill', function(d) {
          return s.color(d.key);
        })
        .style('fill-opacity', that.alpha());
    }
  }
  var scales = that.scalesAxes(sel, s, data.selector, layerNum,
                               true, true);

  var n, d;
  if(s.aes.y === "density") {
    n = 'x';
    d = 'y';
  } else {
    n = 'y';
    d = 'x';
  }
  // nest, but don't compute
  data = s.nest.rollup(function(d) { return d; })
          .entries(data.data);

  // if data are not grouped, it will not be nested
  // so we have to manually nest to pass to drawDensity
  if(!data[0].key && !data[0].values){
    data = [{key:'key', values: data}];
  }
  var line = d3.svg.line();
  line[n](function(v) { return scales[n].scale()(v[s.aes[n]]); } );
  line[d](function(v) { return scales[d].scale()(v[s.aes[d]]); } );
  // need to calculate the densities to draw proper domains.
  this.removeElements(sel, layerNum, this.geom());
  var path = sel.selectAll('.geom.g' + layerNum)
                .data(data);
  path.transition().call(drawDensity);
  path.enter().append(this.geom()).call(drawDensity);
  path.exit()
    .transition()
    .style('opacity', 0)
    .remove();
};

ggd3.geoms.density = Density;

function Hline(spec) {
  if(!(this instanceof Geom)){
    return new Hline(spec);
  }
  Line.apply(this);
  var attributes = {
    name: "hline",
    direction: "x",
    highlightZero: true,
  };

  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Hline.prototype = new Line();

Hline.prototype.constructor = Hline;

Hline.prototype.generator = function(aes, x, y, sub, group) {
  // get list of intercepts and translate them
  // in the data to the actual coordinates
  var s = this.setup();
  if(this.grid()){
    x = d3.scale.linear()
          .range([0, s.dim.x])
          .domain([0, s.dim.x]);
    y = d3.scale.linear()
            .range([0, s.dim.y])
            .domain([0, s.dim.y]);
    return d3.svg.line()
            .x(function(d) { return x(d.x); })
            .y(function(d) { return y(d.y); })
            .interpolate(this.interpolate());
  } else {
    return Line.prototype.generator.call(this, aes, x, y, sub, group);
  }
};

Hline.prototype.prepareData = function(data, s, scales) {
  // hline and vline accept two forms of data
  // an array of intercepts to be drawn on every facet
  // or an array of objects.
  // objects will be nested according to the grouping 
  // variables and a summary function will be 
  // executed
  var direction = this.direction(),
      other = direction === "x" ? 'y': 'x',
      scale = scales[direction],
      otherScale = scales[other],
      range = scale.domain(),
      p;
  if(this.grid()) {
    if(!contains(linearScales, scale.type())){
      p =  scale.scale().domain().map(function(i) {
                  return scale.scale()(i) + scale.scale().rangeBand()/2;
                });
    } else {
      p = scales[direction].scale().ticks(4).map(function(i) {
                  return scale.scale()(i);
                });
    } 
    // disregard data grab intercepts from axis and
    // create new dataset.
    var close_to_zero = function(val) {
      return Math.abs(val) < 1e-6 ? true: false;
    };
    data = [];
    p.forEach(function(intercept) {
      var o1 = {}, o2 = {};
      o1[direction] = intercept;
      o2[direction] = intercept;
      o1[other] = 0;
      o2[other] = s.dim[other];
      if(contains(linearScales, scale.type()) && this.highlightZero()){
        o1.zero = close_to_zero(scale.scale().invert(intercept));
        o2.zero = close_to_zero(scale.scale().invert(intercept));
      }
      data.push([o1, o2]);
    }, this);
    return data;
  }
  if(s.aes[other + "intercept"] === undefined){
    // data must be array of objects with required aesthetics.
    data = Line.prototype.prepareData.call(this, data, s);
    // data are nested
    if(contains(linearScales, scale.type())) {
      data = data.map(function(d) {
        return d.map(function(r) {
          return range.map(function(e){
            var o = clone(r);
            o[s.aes[direction]] = e;
            return o;
          });
        });
      });
      data = flatten(data, false);
    } else {
      data = flatten(data).map(function(d) {
        return [d, d];
      });
    }
  } else {
    // there should be an array of intercepts on 
    // s.aes.yintercept or s.aes.xintercept
    data = s.aes[other + "intercept"].map(function(i) {
      var o1 = {},
          o2 = {};
      o1[s.aes[other]] = i;
      o1[s.aes[direction]] = range[0];
      o2[s.aes[other]] = i;
      o2[s.aes[direction]] = range[1];
      return [o1, o2];
    });
  }
  return data;

};



ggd3.geoms.hline = Hline;
function Linerange(spec){
  if(!(this instanceof Linerange)){
    return new Linerange(spec);
  }
  Line.apply(this);
  var attributes = {
    lineType: "none",
    gPlacement: 'insert',
    name: 'linerange',
  };
  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}
// linerange responds to x, xmin, xmax or y, ymin, ymax and group or color

Linerange.prototype = new Line();

Linerange.prototype.constructor = Linerange;

Linerange.prototype.domain = function(data, a) {

  var layer   = this.layer(),
      plot    = layer.plot(),
      aes     = layer.aes(),
      extent  = [],
      minmax  = a === "x" ? ['xmin', 'xmax']:['ymin', 'ymax'],
      range;

  minmax.forEach(function(d) {
    if(typeof aes[d] === 'function'){
      extent.push(d3.extent(pluck(data, function(r) {
        return aes[d](r);
      })));
    } else if(typeof aes[d] === 'string'){
      extent.push(d3.extent(pluck(data, aes[d])));
    }
  });
  extent = d3.extent(flatten(extent));
  return extent;
};

Linerange.prototype.prepareData = function(data, s){
  var aes = clone(s.aes),
      dir = aes.ymin !== undefined ? "y": "x",
      min = aes[dir + 'min'],
      max = aes[dir + 'max'];
  data = Line.prototype.prepareData.call(this, data, s);

  data = pluck(flatten(data), function(d) {
    var o1 = clone(d),
        o2 = clone(d);
    o1[aes[dir]] = min(d);
    o2[aes[dir]] = max(d);
    return [o1, o2];
  });  
  return data;
};

ggd3.geoms.linerange = Linerange;

// 
function Path(spec) {
  if(!(this instanceof Geom)){
    return new Path(spec);
  }
  Line.apply(this);
  var attributes = {
    name: "path",
    stat: "identity",
    position: 'append',
    interpolate: "linear",
    lineWidth: 1,
    tension: 1,
  };
  // path is just line drawn in order, so probably doesn't need anything.

  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Path.prototype = new Line();

Path.prototype.constructor = Path;

ggd3.geoms.path = Path;

// allow layer level specifying of size, fill,
// color, alpha and shape variables/scales
// but inherit from layer/plot if 
function Point(spec) {
  if(!(this instanceof Geom)){
    return new Point(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "point",
    geom: "circle",
    stat: "identity",
    position: "identity",
  };

  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}
Point.prototype = new Geom();

Point.prototype.constructor = Point;

Point.prototype.positionPoint = function(s, group) {

  var o2,
      rb = 0,
      a = s.aesthetic(),
      shift = 0,
      aes = this.layer().aes();
  if(s.type() === "ordinal" && group){
    o2 = this.layer().plot().subScale().single.scale();
    rb = o2.rangeBand()/2;
    shift = d3.sum(s.rangeBands(), function(r) {
      return r*s.scale().rangeBand();});
  } else if(s.type() === "ordinal") {
    o2 = function() { 
      return s.scale().rangeBand() / 2; 
    };
    rb = s.scale().rangeBand() / 2;
  } else {
    o2 = function() { return 0;};
  }
  return function(d) {
    return (s.scale()(d[aes[a]]) +
          o2(d[group]) + shift + 
          (d._jitter || 0) * rb);
  };
};

Point.prototype.draw = function(sel, data, i, layerNum, s) {

  // should be able to pass a setup object from a different geom
  // if a different geom wants to create a point object.
  var x, y, scales, points;
  // other functions that call geom point will supply an "s" object
  // such as boxplot
  if(s === undefined) {
    s = this.setup();
    scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                 true, true);
    // point should have both canvas and svg functions.
    x = this.positionPoint(scales.x, s.group);
    y = this.positionPoint(scales.y, s.group);
    data = this.unNest(data.data);
    // get rid of wrong elements if they exist.
    points = sel.selectAll('.geom.g' + layerNum + ".geom-" + this.name())
                .data(data.filter(function(d) {
                  return !isNaN(d[s.aes.x]) && !isNaN(d[s.aes.y]);
                }));
  } else {
    points = sel.selectAll('.geom.g' + layerNum + ".geom-" + this.name())
                .data(data);
    x = s.x;
    y = s.y;
  }

  var tt = ggd3.tooltip()
            .content(this.tooltip())
            .geom(this);


  points.transition().call(this.drawGeom, x, y, s, layerNum);
  points.enter().append(this.geom())
    .call(this.drawGeom, x, y, s, layerNum);
  points.exit()
    .transition()
    .style('opacity', 0)
    .remove();
  points.each(function() {
      tt.tooltip(d3.select(this), s);
    });
};

Point.prototype.drawGeom = function (point, x, y, s, layerNum) {
  point
    .attr('class', 'geom g' + layerNum + " geom-point")
    .attr({
      cx: x,
      cy: y,
      r: s.size,
      fill: s.fill
    })
    .attr({
      stroke: s.color,
      "stroke-width": 1,
      "fill-opacity": s.alpha
    });
};

ggd3.geoms.point = Point;

// 
function Ribbon(spec) {
  if(!(this instanceof Ribbon)){
    return new Ribbon(spec);
  }
  Area.apply(this);
  var attributes = {
    name: "ribbon",
    stat: "identity",
    position: null,
    gPosition: 'insert'
  };

  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Ribbon.prototype = new Area();

Ribbon.prototype.constructor = Ribbon;

Ribbon.prototype.generator = function(aes, x, y, o2, group, n) {

  var area = d3.svg.area()
                .interpolate(this.interpolate());

  return area
          .x(function(d, i) { return x(d[aes.x]); })
          .y0(function(d, i) { 
            return y('ymin', n)(d); })
          .y1(function(d, i) { 
            return y('ymax', n)(d); });
};
Ribbon.prototype.drawRibbon = function(sel, data, i, layerNum, areaGen,
                                       s) {
  var ribbon = sel.selectAll(".geom.g" + layerNum + ".geom-" + this.name())
              .data(data),
      that = this;
  ribbon.transition()
    .each(function(d, i) {
      Area.prototype.drawArea.call(that, d3.select(this), areaGen(i), s, layerNum, i);
    });
  // makes sense that all area/ribbons go first.
  ribbon.enter()[this.gPosition()](this.geom(), "*")
    .each(function(d, i) {
      Area.prototype.drawArea.call(that, d3.select(this), areaGen(i), s, layerNum, i);
    });
  ribbon.exit()
    .transition()
    .style('opacity', 0)
    .remove();
};

// ribbon is always an operation on ymin, ymax, and x
Ribbon.prototype.draw = function(sel, data, i, layerNum) {
  var s = this.setup(),
      that = this,
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                this.drawX(), this.drawY()),
      x = scales.x.scale(),
      y = scales.y.scale(),
      y2,
      selector = data.selector,
      o2 = function() { return 0; };
      o2.rangeBand = function() { return 0;};
  data = this.prepareData(data, s);
  y2 = this.decorateScale('y', s, y, data);

  var areaGen = function(n) {
    return that.generator(s.aes, x, y2, o2, s.group, n);
  };
  this.drawRibbon(sel, data, i, layerNum, areaGen, s);
};

ggd3.geoms.ribbon = Ribbon;
// 
// find better way to give up if no line is to be drawn

function Smooth(spec) {
  if(!(this instanceof Smooth)){
    return new Smooth(spec);
  }
  Line.apply(this);
  var attributes = {
    name: "smooth",
    stat: "identity",
    position: 'insert',
    method: "loess",
    lineType: 'none',
    sigma: {},
    errorBand: true,
    loessParams: {alpha: 1, lambda: 1, m: null},
    dist: 1,
    interpolate: 'basis',
    strokeOpacity: 0.2,
    ribbonAlpha: 0.2,
  };

  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Smooth.prototype = new Line();

Smooth.prototype.constructor = Smooth;

Smooth.prototype.validate = function(data, s){
  data = data.filter(function(d) {
    var xvalid = ((typeof d[s.aes.x] === 'number') || 
                  (d[s.aes.x].constructor === Date));
    var yvalid = typeof d[s.aes.y] === 'number';
    return xvalid && yvalid;
  });
  return data;
};

Smooth.prototype.loess = function(data, s) {

  var params = clone(this.loessParams()),
      aes = s.aes,
      vs = [],
      size = Math.floor(params.alpha * data.length),
      bandWidth = Math.floor(data.length/params.m),
      points = [];
  data = this.validate(data, s);
  data.sort(function(a, b) {
            return a[aes.x] - b[aes.x];
          });
  if(params.m === null){ 
    vs = data; 
  } else {
    // get equally spaced points
    vs = d3.range(params.m).map(function(d) {
          return data[bandWidth*d];
        });
    vs.push(data[data.length-1]);
  }
  vs.forEach(function(d, i) {
    var vindow,
        pos = bandWidth * i,
        mid = Math.floor(size / 2),
        max, min;
    if(params.alpha === 1) {
      vindow = data;
    } else if ((data.length - pos) < mid) {
      vindow = data.slice(data.length - size, data.length);
    } else if(pos > mid){
      vindow = data.slice(pos - mid, pos);
      vindow = flatten([vindow, data.slice(pos, pos + mid)]);
    } else {
      vindow = data.slice(0, size);
    }
    max = d3.max(pluck(vindow, aes.x));
    min = d3.min(pluck(vindow, aes.x));
    // Thanks Jason Davies. I'll have to learn better how this actually works.
    // https://github.com/jasondavies/science.js/blob/master/src/stats/loess.js
    // Also, see:
    // http://en.wikipedia.org/wiki/Least_squares#Weighted_least_squares
    var sumWeights = 0,
        sumX = 0,
        sumXSquared = 0,
        sumY = 0,
        sumXY = 0;

    vindow.forEach(function(v) {
      var xk   = v[aes.x],
          yk   = v[aes.y],
          dist = d3.max([Math.abs(max - d[aes.x]), Math.abs(d[aes.x] - min)]),
          w = Math.pow(1 - Math.abs(Math.pow((v[aes.x] - d[aes.x])/dist, 3)),3),
          xkw  = xk * w;
      sumWeights += w;
      sumX += xkw;
      sumXSquared += xk * xkw;
      sumY += yk * w;
      sumXY += yk * xkw;      
    });
    var meanX = sumX / sumWeights,
        meanY = sumY / sumWeights,
        meanXY = sumXY / sumWeights,
        meanXSquared = sumXSquared / sumWeights;

    var beta = (Math.sqrt(Math.abs(meanXSquared - meanX * meanX)) < 1e-12)        ? 0 : ((meanXY - meanX * meanY) / (meanXSquared - meanX * meanX));

    var alpha = meanY - beta * meanX,
        out = clone(d);

    out[aes.y] = alpha + beta*out[aes.x];
    points.push(out);

  }, this);
  return points;
};

Smooth.prototype.lm = function(data, s, coef, weights) {

  // both should be numbers
  // need to make this work with dates, too.
  data = this.validate(data, s);
  var aes = s.aes,
      o1, o2, sigma,
      ts = false,
      prod = d3.mean(pluck(data, function(d) {
        return d[aes.x] * d[aes.y];
      })),
      x2 = d3.mean(pluck(data, function(d) {
        return Math.pow(d[aes.x], 2);
      })),
      xbar = d3.mean(pluck(data, aes.x)), 
      ybar = d3.mean(pluck(data, aes.y)),
      m = (prod - xbar*ybar) / (x2 - Math.pow(xbar, 2)),
      b = ybar - m*xbar;
  if(coef) { return {m: m, b: b}; }
  var extent = d3.extent(pluck(data, aes.x));
  o1 = clone(data.filter(function(d) {
          return d[aes.x] === extent[0];
        })[0]);
  o2 = clone(data.filter(function(d) {
          return d[aes.x] === extent[1];
        })[0]);
  if(any([o1, o2], function(d) {
    return d.constructor !== Object;}) ){ return [];}
  o1[aes.y] = b + m * o1[aes.x];
  o2[aes.y] = b + m * o2[aes.x];
  sigma = Math.sqrt(d3.sum(data.map(function(d, i) {

    return Math.pow((d[aes.x]*m + b) - 
                    d[aes.y], 2);
  }))/data.length);
  o1._error_max = this.dist() * sigma;
  o2._error_max = this.dist() * sigma;
  o1._error_min = -this.dist() * sigma;
  o2._error_min = -this.dist() * sigma;
  return [o1, o2];
};

Smooth.prototype.prepareData = function(data, s) {
  data = s.nest.entries(data.data);
  data = ggd3.tools.arrayOfArrays(
          data.map(function(d) { 
            return this.recurseNest(d);}, this));
  data = data.filter(function(d) {
    return (d.constructor === Object) || d.length >=2;
  });
  data = Array.isArray(data[0]) ? data: [data];
  data = data.map(function(d) {
    return this[this.method()](d, s);
  }, this);
  return data;  
};

Smooth.prototype.draw = function(sel, data, i, layerNum) {
  var selector = data.selector;
  data = Line.prototype.draw.call(this, sel, data, i, layerNum);
  if(flatten(data).length === 0) { return data; }

  if(!this.errorBand()){
    return null;
  }
  var s = this.setup(),
      scales = this.scalesAxes(sel, s, selector, layerNum,
                                this.drawX(), this.drawY()),
      x = scales.x.scale(),
      y = scales.y.scale(),
      y2,
      o2 = function() { return 0; };
      o2.rangeBand = function() { return 0;};
      r = ggd3.geoms.ribbon()
            .color(s.color)
            .data([data]);

  if(this.method() === "loess"){
    return null;
  } else if(this.method() === "lm"){
    var dist = this.dist() * this.sigma(),
        oldAlpha = this.alpha();
    s.aes.ymin = "_error_min";
    s.aes.ymax = "_error_max";
    s.alpha = d3.functor(this.ribbonAlpha());
    y2 = r.decorateScale('y', s, y, data);
    var areaGen = function(n) {
      return r.generator(s.aes, x, y2, o2, s.group, n);
    };

    r.drawRibbon.call(this.name('smooth-error'), sel, 
                      data, i, layerNum, areaGen, s);
    this.name('smooth')
      .alpha(oldAlpha);

  }

};

ggd3.geoms.smooth = Smooth;


function Text(spec) {
  if(!(this instanceof Geom)){
    return new Text(spec);
  }
  Point.apply(this);
  var attributes = {
    name: "text",
    geom: 'text', 
  };

  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    // if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    // }
  }
}
Text.prototype = new Point();

Text.prototype.constructor = Text;

Text.prototype.draw = function (sel, data, i, layerNum) {

  var s     = this.setup(),
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                               this.drawX(), this.drawY());


  var positionX = this.positionPoint(scales.x, s.group),
      positionY = this.positionPoint(scales.y, s.group);

  function drawText(text) {
    text
      .attr('class', 'geom g' + layerNum + " geom-text")
      .text(function(d) { return d[s.aes.label]; })
      .attr('x', positionX)
      .attr('y', positionY)
      .style('font-size', s.size)
      .attr('fill-opacity', s.alpha)
      .style('stroke', s.color)
      .style('stroke-width', 1)
      .attr('text-anchor', 'middle')
      .attr('fill', s.fill);
  }

  var tt = ggd3.tooltip()
            .content(this.tooltip())
            .geom(this);

  var text = sel.selectAll('text.geom.g' + layerNum)
                .data(data.data);
  text.transition().call(drawText);
  text.enter().append('text').call(drawText);
  text.exit()
    .transition()
    .style('opacity', 0)
    .remove();
  text.each(function() {
      tt.tooltip(d3.select(this), s);
    });
};

ggd3.geoms.text = Text;

// 
function Vline(spec) {
  if(!(this instanceof Geom)){
    return new Vline(spec);
  }
  Hline.apply(this);
  var attributes = {
    name: "vline",
    direction: "y",
  };

  this.attributes = merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Vline.prototype = new Hline();

Vline.prototype.constructor = Vline;



ggd3.geoms.vline = Vline;
// this is more than I need, I think.
// All a stat is is a mapping from aesthetics to 
// statistics. So points can map aesthetics to 
// statistics, but usually don't.
// Bars map one of x or y to identity and
// the other to some aggregate, default count.
// Box is like bars, but maps one to the five figure summary
// In this sense, jitter goes here as well. But it probably won't.

function Stat(setting) {

  if(!(this instanceof Stat)){
    return new Stat(setting);
  }

  var attributes = {
    layer: null,
    linearAgg: null,
    x: null,
    y: null,
    fill: null,
    color: null,
    alpha: null,
    size: null,
    shape: null,
    label: null,
  };

  if(setting.constructor === Object) {
    for(var a in setting){
      if(typeof setting[a] === 'function'){
        attributes[a] = setting[a];
      } else {
        attributes[a] = this[setting[a]];
      }
    }
  } else if(typeof setting === 'string') {
    attributes.linearAgg = setting;
  }
  this.exclude = ["xintercept", "yintercept", "slope",
  // maybe we do want to calculate mins and maxs
    "ymax", "ymin", "xmax", "xmin", 
    // additional column info included in tooltip
    'additional'
    ];

  this.attributes = attributes;
  var getSet = ["layer", "linearAgg"];
  for(var attr in attributes){
    if(contains(getSet, attr)){
      this[attr] = createAccessor(attr);
    }
  }
}

var specialStats = [
  "density",
  "bin",
  "boxplot"
];

Stat.prototype.agg = function(data, aes) {
  var out = [{}];
  Object.keys(aes).forEach(function (a) {
    if(!contains(this.exclude, a)) {
      if(contains(["range", "unique"], 
         this[a]()._name) ){
        var r = this[a]()(pluck(flatten([data]), aes[a]));
        out = r.map(function(d) {
            var o = clone(out[0]);
            o[aes[a]] = d;
            return o;
          });
      } else {
        out = out.map(function(o) {
          o[aes[a]] = this[a]()(pluck(flatten([data], false), aes[a]));
          return o;
        }, this);
      }
    }
  }, this);
  return out;
};

Stat.prototype.compute = function(data) {
  var aes = this.layer().aes(),
      that = this,
      id = any(difference(Object.keys(aes), that.exclude).map( 
            function(k){
              if(!this[k]()){ return null; }
              return this[k]()([]) === "identity";
            }, that));
  if(contains(specialStats, this.linearAgg()) ){
    return this["compute_" + this.linearAgg()](data);
  }
  // most situations will need these two
  if(id){
    return data;
  }
  out = flatten(this.agg(data, aes));
  return out;
};

function aggSetter(a) {
  return function(f) {
    if(!arguments.length) { return this.attributes[a]; }
    if(typeof f === 'string'){
      this.attributes[a] = this[f];
    } else if(typeof f === 'function'){
      this.attributes[a] = f;
    } else if(Array.isArray(f)){
      // f is dtype
      if(f[0] === "string" || f[1] === "few"){
        // likely just need first
        this.attributes[a] = this.first;
      } else if(f[0] === "number" && f[1] === "many"){
        this.attributes[a] = this.median;
      }
    }
    return this;
  };
}
Stat.prototype.x = aggSetter('x');
Stat.prototype.y = aggSetter('y');
Stat.prototype.ymax = aggSetter('ymax');
Stat.prototype.ymin = aggSetter('ymin');
Stat.prototype.fill = aggSetter('fill');
Stat.prototype.color = aggSetter('color');
Stat.prototype.group = aggSetter('group');
Stat.prototype.alpha = aggSetter('alpha');
Stat.prototype.size = aggSetter('size');
Stat.prototype.size = aggSetter('size');

// label should always be the same each element of array
Stat.prototype.label = function() {
  return function(arr) {
    return arr[0];
  };
};
Stat.prototype.label._name = "label";

Stat.prototype.unique = function(arr) {
  return unique(arr);
};  
Stat.prototype.unique._name = "unique";

Stat.prototype.range = function(arr) {
  return d3.extent(arr);
};
Stat.prototype.range._name = "range";

// median
Stat.prototype.median = function(arr) {
  arr.sort(d3.ascending);
  if(arr.length > 100000) { 
    console.warn("Default behavior of returning median overridden " + 
           "because array length > 1,000,000." + 
           " Mean is probably good enough.");
    return d3.mean(arr); 
  }
  return d3.median(arr);
};
Stat.prototype.median._name = "median";

// count
Stat.prototype.count = function(arr) {
  return arr.length;
};
Stat.prototype.count._name = "count";

// min
Stat.prototype.min = function(arr) {
  return d3.min(arr);
};
Stat.prototype.min._name = "min";

// max
Stat.prototype.max = function(arr) {
  return d3.max(arr);
};
Stat.prototype.max._name = "max";

// mean
Stat.prototype.mean = function(arr) {
  return d3.mean(arr);
};
Stat.prototype.mean._name = "mean";

// iqr
Stat.prototype.iqr = function(arr) {

  return {"75th percentile": d3.quantile(arr, 0.75),
          "50th percentile": d3.quantile(arr, 0.5),
          "25th percentile": d3.quantile(arr, 0.25),
        };
};
Stat.prototype.iqr._name = "iqr";

// don't do anything with character columns
Stat.prototype.first = function(arr) {
  return arr[0];
};
Stat.prototype.first._name = "first";

Stat.prototype.mode = function(arr) {
  return "nuthing yet for mode.";
};
Stat.prototype.mode._name = "mode";

// how to deal with less convential computations?
// ugly hack? Most of this is ugly.
Stat.prototype.identity = function(arr) {
  return "identity";
};
Stat.prototype.identity._name = "identity";

Stat.prototype.density = function(arr) {
  return 'density';
};
Stat.prototype.density._name = "density";

Stat.prototype.boxplot = function(arr) {
  return 'boxplot';
};
Stat.prototype.boxplot._name = "boxplot";

Stat.prototype.bin = function() {
  return 'bin';
};
Stat.prototype.bin._name = "bin";

Stat.prototype.compute_boxplot = function(data) {
  var start = new Date().getTime();
  var aes = this.layer().aes(),
      g = this.layer().geom(),
      // come up with better test to 
      // choose which is factor. Number unique, or a 
      // special marker on dtypes
      factor = this.layer().dtypes()[aes.x][1] === "few" ? 'x': 'y',
      number = factor === 'x' ? 'y': 'x',
      arr = pluck(data, aes[number]).sort(d3.ascending),
      iqr = this.iqr(arr),
      upper = d3.quantile(arr, g.tail() ? (1 - g.tail()): g.upper()),
      lower = d3.quantile(arr, g.tail() || g.lower()),
      out = merge({
        "quantiles": iqr,
        "upper": upper,
        "lower": lower,
      }, this.agg(data, aes)[0]);
      out["n. observations"] = data.length;
      out.data = data.filter(function(d) {
        return ((d[aes[number]] < lower) || 
                (d[aes[number]] > upper));
      });
  return out;
};

Stat.prototype.compute_bin = function(data) {

  var aes = this.layer().aes(),
      g = this.layer().geom(),
      h, n;
  
  if(aes.y && aes.x) {
    // we've been through before and density exists on aes
    h = aes.y === "binHeight" ? 'y': 'x';
  } else {
    h = aes.y ? 'x': 'y';
    aes[h] = "binHeight";
  }
  this.layer().plot().dtypes({binHeight:['number', 'many']});
  n = h === "y" ? "x": "y";

  var hist = d3.layout.histogram()
                .bins(g.breaks() || g.bins())
                .frequency(g.frequency())
                .value(function(d) {
                  return d[aes[n]];
                });
  data = hist(data);
  data.map(function(d) {
    if(d.length === 0) { return d; }
    d[aes[n]] = d.x;
    d.binHeight = d.y;
    // all other aesthetics in histograms will only map to
    // categories, so we don't need to know all about other 
    // variables in the bin.
    for(var a in aes) {
      if(contains(['x', 'y'], a)) { continue; }
      d[aes[a]] = d[0][aes[a]];
    }
    return d;
  });
  return data;
};

Stat.prototype.compute_density = function(data) {
  var out = {},
      start = {},
      end = {},
      aes = this.layer().aes();
  var g, k, r, p;
  if(aes.y && aes.x) {
    // we've been through before and density exists on aes
    d = aes.y === "density" ? 'y': 'x';
  } else {
    d = aes.y ? 'x': 'y';
    aes[d] = "density";
  }
  n = d === "y" ? "x": "y";
  ['color', 'group', "fill"].forEach(function(a) {
    if(aes[a]){
      out[aes[a]] = data[0][aes[a]];
      start[aes[a]] = data[0][aes[a]];
      end[aes[a]] = data[0][aes[a]];
    }
  });
  data = pluck(data, aes[n]);
  g = this.layer().geom();
  k = g[g.kernel()](g.smooth());
  r = d3.extent(data);
  p = d3.range(r[0], r[1], (r[1] - r[0])/g.nPoints());
  kde = g.kde(k, p);
  data = kde(data);
  out = data.map(function(d) {
    var o = clone(out);
    o[aes[n]] = d[0];
    o.density = d[1];
    return o;
  });
  start.density = 0;
  end.density = 0;
  start[aes[n]] = r[0];
  end[aes[n]] = r[1];
  out.splice(0, 0, start);
  out.push(end);
  return out;
};

ggd3.stats = Stat;
  if(typeof module === "object" && module.exports){
    // package loaded as node module
    this.ggd3 = ggd3;
    module.exports = ggd3;
    // I should probably learn what all this stuff does
    // added the following two lines so this would work in
    // vows
    this._ = require('lodash');
    this.d3 = require('d3');
  } else {
    // file is loaded in browser.
    console.log('loaded in browser')
    this.ggd3 = ggd3;
  }
}();
