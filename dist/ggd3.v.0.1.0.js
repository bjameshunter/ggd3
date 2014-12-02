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
function Clean(data, obj) {
  // coerce each records data to reasonable
  // type and get domains for all scales in aes.
  if(!data) { return {data: null, dtypes:null}; }
  var vars = {},
      dtypeDict = {"number": parseFloat, 
                  "integer": parseInt,
                  "string": String},
      dtypes = _.merge({}, obj.dtypes()),
      keys = _.keys(dtypes),
      // assume all records have same keys
      dkeys = _.keys(data[0]);

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
      }
      return d;
    })[0];
  });
  function dtype(arr) {
    var numProp = [],
        dateProp = [],
        n = (arr.length > 1000 ? 1000: arr.length);
    // for now, looking at random 1000 obs.
    _.map(_.sample(arr, n), 
          function(d) {
            numProp.push(!_.isNaN(parseFloat(d)));
          });
    numProp = numProp.reduce(function(p,v) { 
      return p + v; }) / n;
    var lenUnique = _.unique(arr).length;
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
    return _.map(data, function(d) {
      return {selector: rep(selector + d.key),
        data: d.values};
    });

  } else if(x && y) {
    // loop through both levels
    out = [];
    _.each(data, function(l1) {
      var selectX = x + "-" + l1.key;
      _.each(l1.values, function(l2) {
        var s = rep(y + "-" + l2.key + "_" + selectX);
        out.push({selector:s, data: l2.values});
      });
    });
    return out;
  } else if(x && y && by){
    // nothing yet
  }
  if(!x && !y){
    console.log("neither x nor y");
    return [{selector: 'single', data: this.data()}];
  }
}

ggd3.tools.dateFormatter = function(v, format) {
  if(format === "%Y") {
    return new Date(v, 0, 0, 0);
  } else {
    return new Date(v);
  }
};

ggd3.tools.numericDomain = function(data, variable, rule, zero) {
  var extent = d3.extent(_.pluck(data, variable)),
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
  return _.sortBy(_.unique(_.pluck(data, variable)));
};

ggd3.tools.removeElements = function(sel, layerNum, element) {
  var remove = sel.select('.plot')
                    .selectAll('.geom.g' + layerNum)
                    .filter(function() {
                      return d3.select(this)[0][0].nodeName !== element;
                    });
  remove.transition()
    .style('opacity', 0)
    .remove();
};

ggd3.tools.round = function round(value, decimals) {
    return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
};

// generic nesting function
Nest = function(data) {
  if(_.isNull(data)) { return data; }
  var isLayer = (this instanceof ggd3.layer),
      nest = d3.nest(),
      that = this,
      facet = isLayer ? this.plot().facet(): this.facet();
  if(facet && !_.isNull(facet.x())){
    nest.key(function(d) { return d[facet.x()]; });
  }
  if(facet && !_.isNull(facet.y())){
    nest.key(function(d) { return d[facet.y()]; });
  }
  if(facet && !_.isNull(facet.by())){
    nest.key(function(d) { return d[facet.by()]; });
  }
  data = nest.entries(data);
  return data; 
};

function unNest(data, nestedArray) {
  // recurse and flatten nested dataset
  // this means no dataset can have a 'values' column
  if(!data || _.isEmpty(data)){ 
    return data;
  }
  var branch = _.all(_.map(data, function(d){
    return d.hasOwnProperty('values');
  }));
  if(!branch) {
    if(nestedArray === true){
      return [data];
    }
    return data; 
  }
  var vals = _.flatten(
              _.map(data, function(d) { return d.values; }), true
             );
  return this.unNest(vals);
}


// accepts single nested object
function recurseNest(data) {
  if(!data.values) { return data; }
  return _.map(data.values, 
                 function(d) {
                  return recurseNest(d);
                });
}


function Facet(spec) {
  var attributes = {
    x: null,
    y: null,
    by: null, // add another 
    type: "wrap", // grid or wrap?
    scales: "fixed", // "free_x", "free_y"
    space: "fixed", // eventually "free_x" and "free_y"
    plot: null, 
    nrows: null,
    ncols: null,
    margins: {x: 5, y:5}, 
    titleSize: [20, 20],
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


Facet.prototype.updateFacet = function() {
  var that = this,
      data = this.plot().data(),
      nrows, ncols;
  that.calculateMargins();
  that.xFacets = ["single"];
  that.yFacets = ["single"];
  // rules of faceting:
  // specify either x and y or an x or y with nrows or ncols
  if( that.x() ) {
    // x is always first nest
    that.xFacets = _.unique(_.map(data, function(d) {
      return d.key;
    }));
  }
  if( that.y() ){
    // if facet.y is specified, it might be the first or
    // second nest
    if(!that.x() ){
      that.yFacets = _.unique(_.map(data, function(d) {
        return d.key;
      }));
    } else {
      that.yFacets = _.unique(
                      _.flatten(
                        _.map(
                          data, function(d) {
                            return _.map(d.values, 
                              function(v) {
                                return v.key;
                              });
                        })
                      )
                    );
    }
  }
  that.nFacets = that.xFacets.length * that.yFacets.length;

  if( that.scales() !== "fixed" && that.type()==="grid"){
    throw ("facet type of 'grid' requires fixed scales." + 
            " You have facet scales set to: " + that.scales());
  }
  // if only x or y is set, user should input # rows or columns
  if( ( that.x() && that.y() ) && 
     ( that.ncols() || that.nrows() ) ){
    throw ('specifying x and y facets with ncols or nrows' +
                  " is not supported");
  }
  if( that.ncols() && that.nrows() ){
    throw ("specify only one of ncols or nrows");
  }
  if( (that.x() && !that.y()) || (that.y() && !that.x()) ){
    if(!that.ncols() && !that.nrows()){
      throw("specify one of ncols or nrows if setting only" +
            " one of facet.x() or facet.y()");
    }
    if(that.nrows() && !that.ncols()) {
      that._ncols = Math.ceil(that.nFacets/that.nrows()); 
      that._nrows = that.nrows();
    }
    if(that.ncols() && !that.nrows()) {
      that._nrows = Math.ceil(that.nFacets/that.ncols());
      that._ncols = that.ncols();
    }
  }
  if(!that.ncols() && !that.nrows() ) {
    that._nrows = that.yFacets.length;
    that._ncols = that.xFacets.length;
  }

  this.update = function(sel) {
    var rows = sel.selectAll('div.row')
                .data(_.range(that._nrows));
    rows
      .attr('id', function(d) { return "row-" + d; })
      .each(function(d, i) {
        that.makeDIV(d3.select(this), d, that._ncols);
      });

    rows.enter()
      .append('div')
      .attr('class', 'row')
      .attr('id', function(d) { return "row-" + d; })
      .each(function(d, i) {
        that.makeDIV(d3.select(this), d, that._ncols);
      });
    rows.exit().remove();
  };
  return this.update;
};

Facet.prototype.makeDIV = function(selection, rowNum, ncols) {
  var remainder = this.nFacets % ncols,
      that = this;
  row = selection.selectAll('div.plot-div')
           .data(_.range((this.nFacets - this.nSVGs) > remainder ? 
                 ncols: remainder));
  row
    .each(function(colNum) {
      that.makeSVG(d3.select(this), rowNum, colNum);
    });
  row.enter().append('div')
    .attr('class', 'plot-div')
    .each(function(colNum) {
      that.makeSVG(d3.select(this), rowNum, colNum);
    });
  row.exit().remove();
};

Facet.prototype.makeSVG = function(selection, rowNum, colNum) {
  var that = this,
      plot = this.plot(),
      dim = plot.plotDim(),
      x = selection.data()[0],
      addHeight = (rowNum === 0 || this.type() === "wrap") ? that.titleSize()[1]:0,
      addWidth = colNum === 0 ? that.titleSize()[0]:0,
      width = plot.width() + addWidth,
      height = plot.height() + addHeight,
      svg = selection
              .attr('id', function(d) {
                return that.id(d, rowNum);
               })
              .selectAll('svg.svg-wrap')
              .data([0]);

  svg
    .attr('width', width)
    .attr('height', height)
    .each(function(d) {
      that.makeTitle(d3.select(this), colNum, rowNum);
      var sel = d3.select(this).select('.plot-svg');
      sel.attr('x', addWidth)
        .attr('y', addHeight);
      that.makeCell(sel, x, rowNum, that._ncols);
      that.makeClip(sel, x, rowNum);
    });
  svg.enter().append('svg')
    .attr('class', 'svg-wrap')
    .attr('width', width)
    .attr('height', height)
    .each(function(d) {
      that.makeTitle(d3.select(this), colNum, rowNum);
      var sel = d3.select(this).selectAll('.plot-svg')
                  .data([0]);
      sel
        .attr('x', addWidth)
        .attr('y', addHeight);
      sel.enter().append('svg')
        .attr('x', addWidth)
        .attr('y', addHeight)
        .attr('class', 'plot-svg');
      that.makeCell(sel, x, rowNum, that._ncols);
      that.makeClip(sel, x, rowNum);
    });
  svg.exit().remove();
  that.nSVGs += 1;
};
// overrides default margins if facet type == "grid"
// or scales are free
Facet.prototype.calculateMargins = function(plot) {

};

Facet.prototype.makeClip = function(selection, x, y) {
    // if either xAdjust or yAdjust are present
  var clip = selection.selectAll('defs')
              .data([0]),
      that = this,
      id = that.id(x, y) + "-clip",
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
// if x and y [and "by"] are specified, return id like:
// x-y[-by], otherwise return xFacet or yFacet
function rep(s) {
  return s.replace(' ', '-');
}
Facet.prototype.id = function(x, y) {

  if(this.x() && this.y()) {
    return rep(this.y() + "-" + this.yFacets[y]  + '_' + 
    this.x() + "-" + this.xFacets[x]);
  } else if(this.x()){
    return rep(this.x() + "-" + this.xFacets[this.nSVGs]);
  } else if(this.y()){
    return rep(this.y() + "-" + this.yFacets[this.nSVGs]);
  } else {
    return 'single';
  }
};
Facet.prototype.makeCell = function(selection, colNum, rowNum, 
                                    ncols) {
  var margins = this.plot().margins(),
      dim = this.plot().plotDim(),
      that = this,
      gridClassX = (this.type()==="grid" && rowNum!==0) ? " grid": "",
      gridClassY = (this.type()==="grid" && colNum!==(ncols-1)) ? " grid": "";

  function makeG(sel, cls, cls2) {
    var g = sel.selectAll('g.' + cls.replace(/ /g, "."))
      .data([0]);
    g.enter().append('g')
      .attr('class', cls + cls2);
    g.exit().remove();
    return g;
  }
  makeG(selection, "xgrid", "")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");
  makeG(selection, "ygrid", "")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  var plot = selection.selectAll('g.plot')
                .data([0]);
  plot
    .attr('transform', "translate(" + margins.left + 
            "," + margins.top + ")")
    .select('rect.background')
    .attr({x: 0, y:0, width: dim.x, height:dim.y});
  plot.enter().append('g')
    .attr('class', 'plot')
    .attr('transform', "translate(" + margins.left + 
            "," + margins.top + ")")
    .each(function() {
      var sel = d3.select(this);
      sel.append('rect')
        .attr('class', 'background')
        .attr({x: 0, y:0, 
          width: dim.x, height:dim.y});
    });
  plot.exit().remove();

  makeG(selection, "x axis", gridClassX);
  makeG(selection, "y axis", gridClassY);
};

Facet.prototype.makeTitle = function(selection, colNum, rowNum) {
  var that = this,
      plot = this.plot(),
      dim = plot.plotDim(),
      margins = plot.margins(),
      addHeight = that.titleSize()[1],
      addWidth = colNum === 0 ? that.titleSize()[0]:0;
  var xlab = selection
              .selectAll('svg.facet-title-x')
              .data([that.x() + " - " + that.xFacets[colNum]]);
  var ylab = selection
              .selectAll('svg.facet-title-y')
              .data([that.y() + " - " + that.yFacets[rowNum]]);
  xlab.enter().append('svg')
      .attr('class', 'facet-title-x')
      .each(function() {
        d3.select(this).append('rect')
          .attr('class', 'facet-label-x');
        d3.select(this).append('text');
      });
  ylab.enter().append('svg')
      .attr('class', 'facet-title-y')
      .each(function() {
        d3.select(this).append('rect')
          .attr('class', 'facet-label-y');
        d3.select(this).append('text');
      });
  if(that.type() === "grid"){
    addHeight = rowNum === 0 ? addHeight:0;
    if(rowNum===0){
      xlab
        .attr({ width: dim.x + addWidth,
            x: margins.left,
            y: margins.top,
            height: addHeight})
        .select('rect')
        .attr({width: dim.x, x: addWidth,
          height: addHeight,
          y:margins.top});
      xlab.select('text')
          .attr({fill: 'black',
            opacity: 1,
            x: dim.x/2 + addWidth,
            y: addHeight*0.8,
            "text-anchor": 'middle'})
          .text(_.identity);
    } else {
      // set other row labels to 0 height
      // if previous chart was not grid facet.
      selection.select('.facet-title-x')
        .attr("height", 0)
        .select('text').text('');
    }
    if(colNum===0){
      ylab
        .attr({width: addWidth,
            y:margins.top + addHeight,
            x:margins.left})
        .select('rect')
        .attr({width: addWidth, height: dim.y});
      ylab.select('text')
          .attr({fill: 'black',
              opacity: 1,
              x: addWidth * 0.8,
              y: dim.y/2,
              "text-anchor": 'middle',
              transform: "rotate(-90 " + 
                (addWidth * 0.8) + 
                ", " + (dim.y/2) + ")"})
          .text(_.identity);
    } else {
      selection.select('.facet-title-y')
        .attr({width:0}).select('text').text('');
    }
  } else {
    // add labels to wrap-style faceting.
    xlab.attr({y: margins.top,
      x: 0, 
      height: addHeight, 
      width: plot.width() + addWidth})
      .select('rect')
        .attr({height: addHeight,
          width: dim.x, y:0,
          x: margins.left + addWidth});
    xlab.select('text').attr({fill: 'black',
          opacity: 1,
          x: dim.x/2 + addWidth + margins.left,
          y: addHeight*0.8,
          "text-anchor": 'middle'})
        .text(that.wrapLabel(rowNum, colNum));
    selection.select('.facet-title-y')
      .attr({width:0}).select('text').text('');
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
    if(!this[attr] && _.contains(getSet, attr) ){
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
  this.attributes.aes = _.merge(this.attributes.aes, aes);
  this.updateGeom();
  return this;
};

Layer.prototype.geom = function(geom) {
  if(!arguments.length) { return this.attributes.geom; }
  if(_.isString(geom)){
    geom = ggd3.geoms[geom]();
  }
  geom.layer(this);
  this.attributes.geom = geom;
  if(_.isNull(this.stat())){
    this.stat(geom.stat());
  }
  if(!this.position()){
    this.position(geom.position());
  }
  return this;
};

Layer.prototype.stat = function(obj) {
  if(!arguments.length) { return this.attributes.stat; }
  var stat;
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
      scaleType, dtype;
  for(var a in aes){
    dtype = dtypes[aes[a]];
    if(!stat[a]() && _.contains(measureScales, a)){
    scaleType = plot[a + "Scale"]().single.scaleType();
      if(_.contains(linearScales, scaleType) && 
         _.contains(['x', 'y'], a)){
        stat[a](stat.linearAgg());
      } else {
        stat[a](dtype);
      }
    }
  }
  // if a stat has not been set, it is x or y
  // and should be set to count if geom is not density/hist.
  _.each(['x', 'y'], function(a) {
    if(!stat[a]() && 
       !_.contains(['density', 'bin'], this.geom().stat()) ){
      stat[a](stat.linearAgg());
      aes[a] = "n. observations";
      this.aes(aes);
    }
  }, this);

};
Layer.prototype.data = function(data, fromPlot) {
  if(!arguments.length) { return this.attributes.data; }
  if(fromPlot){
    this.attributes.data = data;
  } else {
    data = this.unNest(data);
    data = ggd3.tools.clean(data, this);
    this.attributes.dtypes = _.merge(this.attributes.dtypes, data.dtypes);
    this.attributes.data = data.data;
  }
  return this;
};

Layer.prototype.draw = function(sel, layerNum) {

  var that = this,
      facet = this.plot().facet(),
      plot = this.plot(),
      aes = this.aes(),
      dtypes = this.dtypes(),
      stat = this.stat(),
      dtype,
      scaleType,
      dlist;
  if(this.ownData()) {
    dlist = this.dataList(this.nest(this.data()));
  } else {
    dlist = plot.dataList(plot.data());
  }
  
  var divs = [];

  sel.selectAll('.plot-div')
    .each(function(d) {
      divs.push(d3.select(this).attr('id'));
    });
  _.each(divs, function(id, i){
    // cycle through all divs, drawing data if it exists.
    var s = sel.select("#" + id),
        d = dlist.filter(function(d) {
          return d.selector === id;
        })[0];
    if(_.isEmpty(d)) { d = {selector: id, data: []}; }
    if(that.position() === "jitter" && 
       !plot.hasJitter) {
      _.each(d.data, function(r) { r._jitter = _.random(-1,1,1); });        
    }
    that.geom().draw(s, d, i, layerNum);
  });
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

// 1. jittering points on ordinal axes.
// 2. figure out how to make aggregated values on barcharts
// work with stacking. 
// 3. Build in expand to stack bar. 
// 4. Maybe start thinking about tooltip.

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
    facet: null,
    width: 400,
    height: 400,
    margins: {left:20, right:20, top:20, bottom:20},
    xScale: {single: ggd3.scale()}, 
    yScale: {single: ggd3.scale()},
    colorScale: {single: ggd3.scale()},
    sizeScale: {single: ggd3.scale()},
    fillScale: {single: ggd3.scale()},
    shapeScale: {single: ggd3.scale()},
    alphaScale: {single: ggd3.scale()},
    strokeScale: {single: ggd3.scale()},
    alpha: d3.functor(0.5),
    fill: d3.functor('steelblue'),
    color: d3.functor(null),
    size: d3.functor(3), 
    shape: d3.functor('circle'),
    lineType: d3.functor('1,1'),
    lineWidth: 2,
    xAdjust: false,
    yAdjust: false,
    xGrid: true,
    yGrid: true,
    alphaRange: [0.1, 1],
    sizeRange: [3, 20],
    fillRange: ["blue", "red"],
    colorRange: ["white", "black"],
    shapeRange: d3.superformulaTypes,
    opts: {},
    theme: "ggd3",
  };
  // aesthetics I might like to support:
// ["alpha", "angle", "color", "fill", "group", "height", "label", "linetype", "lower", "order", "radius", "shape", "size", "slope", "width", "x", "xmax", "xmin", "xintercept", "y", "ymax", "ymin", "yintercept"] 
  this.attributes = attributes;
  // doing more cleaning than necessary, counting it.
  this.timesCleaned = 0;
  this.gridsAdded = false;
  // if the data method has been handed a new dataset, 
  // newData will be true, after the plot is drawn the
  // first time, newData is set to false
  this.newData = true;
  // flag to set true when random noise is 
  // added to each data point for jittering
  this.hasJitter = false;
  // when cycling through data, need to know if 
  // data are nested or not.
  this.nested = false;
  this.hgrid = ggd3.layer()
                .geom(ggd3.geoms.hline().grid(true)
                      .lineType("2,2"))
                .plot(this);
  this.vgrid = ggd3.layer()
                .geom(ggd3.geoms.vline().grid(true)
                      .lineType("2,2"))
                .plot(this); 
  // explicitly declare which attributes get a basic
  // getter/setter
  var getSet = ["opts", "theme", "margins", 
    "width", "height", "xAdjust", "yAdjust", 
    'colorRange', 'sizeRange',
    'fillRange', "lineType",
    "alphaRange", "lineWidth",
    "xGrid", "yGrid"];

  for(var attr in attributes){
    if((!this[attr] && 
       _.contains(getSet, attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

function setGlobalScale(scale) {
  function globalScale(obj) {
    if(!arguments.length) { return this.attributes[scale]; }
    // if function, string, or number is passed,
    // set it as new scale function.
    if(_.isPlainObject(obj)){
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
    if(_.isNull(obj)){
      this.attributes[scale] = {single: new ggd3.scale() };
      return this;
    }
    // 
    if(!_.isUndefined(obj)) {
      // merge additional options with old options
      if(this.attributes[scale].single instanceof ggd3.scale){
        obj = _.merge(this.attributes[scale].single._userOpts,
                           obj);
      }
      this.attributes[scale].single = new ggd3.scale(obj).plot(this);
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

Plot.prototype.shapeScale = scaleConfig('shape');

Plot.prototype.fillScale = scaleConfig('fill');

Plot.prototype.alphaScale = scaleConfig('alpha');

Plot.prototype.layers = function(layers) {
  if(!arguments.length) { return this.attributes.layers; }
  var aes;
  if(_.isArray(layers)) {
    // allow reseting of layers by passing empty array
    if(layers.length === 0){
      this.attributes.layers = layers;
      return this;
    }
    var layer;
    _.each(layers, function(l) {
      if(_.isString(l)){
        // passed string to get geom with default settings
        l = ggd3.layer()
              .aes(_.clone(this.aes()))
              .data(this.data(), true)
              .geom(l);
      } else if ( l instanceof ggd3.layer ){
        // user specified layer
        aes = _.clone(l.aes());
        if(!l.data()) { 
          l.data(this.data(), true); 
        } else {
          l.ownData(true);
        }
        l.aes(_.merge(_.clone(this.aes()), aes));
      } else if (l instanceof ggd3.geom){
        var g = l;
        l = ggd3.layer()
                .aes(_.clone(this.aes()))
                .data(this.data(), true)
                .geom(g);
      }
      l.plot(this).dtypes(this.dtypes());
      this.attributes.layers.push(l);
    }, this);
  } else if (layers instanceof ggd3.layer) {
    if(!layers.data()) { 
      layers.data(this.data(), true); 
    } else {
      layers.ownData(true);
    }
    aes = layers.aes();
    layers.aes(_.merge(_.clone(this.aes()), aes))
      .dtypes(this.dtypes())
      .plot(this);
    this.attributes.layers.push(layers);
  } 
  return this;
};

Plot.prototype.dtypes = function(dtypes) {
  if(!arguments.length) { return this.attributes.dtypes; }
  this.attributes.dtypes = _.merge(this.attributes.dtypes, dtypes);
  return this;
};

Plot.prototype.data = function(data) {
  if(!arguments.length || _.isNull(data)) { return this.attributes.data; }
  // clean data according to data types
  // and set top level ranges of scales.
  // dataset is passed through once here.
  // if passing 'dtypes', must be done before
  // let's just always nest and unNest
  this.hasJitter = false;
  data = this.unNest(data);
  data = ggd3.tools.clean(data, this);
  this.timesCleaned += 1;
  // after data is declared, nest it according to facets.
  this.attributes.data = this.nest(data.data);
  this.attributes.dtypes = _.merge(this.attributes.dtypes, data.dtypes);
  this.updateLayers();
  this.nested = data.data ? true:false;
  this.newData = data.data ? false:true;
  return this;
};

Plot.prototype.updateLayers = function() {
  // for right now we are not planning on having more than
  // one layer
  _.each(this.layers(), function(l) {
    l.dtypes(this.dtypes());
    if(!l.ownData()) { l.data(this.data(), true); }
    l.aes(_.merge(_.clone(this.aes()), l.aes()));
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
  aes = _.merge(this.attributes.aes, _.clone(aes));
  _.each(this.layers(), function(layer) {
    layer.aes(_.merge(_.clone(aes), _.clone(layer.aes()) ));
  });
  this.attributes.aes = _.clone(aes);
  return this;
};

Plot.prototype.plotDim = function() {
  var margins = this.margins();
  if(this.facet().type() === "grid"){
    return {x: this.width() - this.facet().margins().x, 
      y: this.height() - this.facet().margins().y};
  }
  return {x: this.width() - margins.left - margins.right,
   y: this.height() - margins.top - margins.bottom};
};

Plot.prototype.draw = function(sel) {
  var that = this,
      updateFacet = that.facet().updateFacet();
  
  // get basic info about scales/aes;
  this.setScales();

  // set stats on layers
  _.each(that.layers(), function(layer) {
    layer.setStat();
  });
  // set fixed/free domains
  this.setDomains();
  updateFacet(sel);
  // reset nSVGs after they're drawn.
  that.facet().nSVGs = 0;

  if(that.yGrid() || that.xGrid()) {
    if(that.yGrid()) { 
      that.hgrid.draw(sel, 1, ".ygrid");}
    if(that.xGrid()) { 
      that.vgrid.draw(sel, 1, ".xgrid");}
  }

  // get the number of geom classes that should
  // be present in the plot
  var classes = _.map(_.range(that.layers().length),
                  function(n) {
                    return "g" + (n);
                  });

  _.each(that.layers(), function(l, layerNum) {
    l.draw(sel, layerNum);
  });
  sel.selectAll('.geom')
    .filter(function() {
      var cl = d3.select(this).attr('class').split(' ');
      return !_.contains(classes, cl[1]);
    })
    .transition().style('opacity', 0).remove();
  // if any of the layers had a jitter, it has
  // been added to each facet's dataset
  if(_.any(chart.layers(), function(l) {
    return l.position() === "jitter";
  }) ) { 
    that.hasJitter = true; 
  }
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
  // allow setting of orient, position, scaleType, 
  // scale and axis settings, etc.
  var attributes = {
    aesthetic: null,
    domain: null,
    range: null,
    position: null, // left right top bottom none
    orient: null, // left right top bottom
    plot: null,
    scaleType: null, // linear, log, ordinal, time, category, 
    // maybe radial, etc.
    scale: null,
    rangeBands: [0.1, 0.1],
    opts: {},
  };
  // store passed object
  this.attributes = attributes;
  var getSet = ["aesthetic", "plot", "orient", "position", "opts",
                "rangeBands"];
  for(var attr in this.attributes){
    if(!this[attr] && _.contains(getSet, attr) ){
      this[attr] = createAccessor(attr);
    }
  }
  this._userOpts = {};
  if(!_.isUndefined(opts)){
    // opts may be updated by later functions
    // _userOpts stays fixed on initiation.
    this.attributes.opts = opts;
    this._userOpts = opts;
    this.scaleType(opts.type ? opts.type:null);
  }

}

Scale.prototype.scaleType = function(scaleType) {
  if(!arguments.length) { return this.attributes.scaleType; }
  var that = this;
  this.attributes.scaleType = scaleType;
  switch(scaleType) {
    case 'linear':
      that.attributes.scale = d3.scale.linear();
      break;
    case 'log':
      that.attributes.scale = d3.scale.log();
      break;
    case 'ordinal':
      that.attributes.scale = d3.scale.ordinal();
      break;
    case 'time':
      that.attributes.scale = d3.time.scale();
      break;
    case 'date':
      that.attributes.scale = d3.time.scale();
      break;
    case "category10":
      that.attributes.scale = d3.scale.category10();
      break;
    case "category20":
      that.attributes.scale = d3.scale.category20();
      break;
    case "category20b":
      that.attributes.scale = d3.scale.category20b();
      break;
    case "category20c":
      that.attributes.scale = d3.scale.category20c();
      break;
  }
  return that;
};

Scale.prototype.scale = function(settings){
  if(!arguments.length) { return this.attributes.scale; }
  for(var s in settings){
    if(this.attributes.scale.hasOwnProperty(s)){
      this.attributes.scale[s](settings[s]);
    }
  }
  return this;
};

Scale.prototype.range = function(range) {
  if(!arguments.length) { return this.attributes.range; }
  if(this.scaleType() === "ordinal"){
    this.attributes.scale.rangeRoundBands(range, 
                                          this.rangeBands()[0],
                                          this.rangeBands()[1]);
  } else {
    this.attributes.scale.range(range);
  }
  this.attributes.range = range;
  return this;
};

Scale.prototype.domain = function(domain) {
  if(!arguments.length) { return this.attributes.domain; }
  if(this.scaleType() ==="log"){
    if(!_.all(domain, function(d) { return d > 0;}) ){
      console.warn("domain must be greater than 0 for log scale." +
      " Scale " + this.aesthetic() + " has requested domain " +
      domain[0] + " - " + domain[1] + ". Setting lower " +
      "bound to 1. Try setting them manually." );
      domain[0] = 1;
    }
  }
  this.attributes.domain = domain;
  this.attributes.scale.domain(domain);
  return this;
};
Scale.prototype.positionAxis = function() {
  var margins = this.plot().margins(),
      dim = this.plot().plotDim(),
      aes = this.aesthetic(),
      opts = this.opts().axis;
  if(aes === "x"){
    if(opts.position === "bottom"){
      return [margins.left, margins.top + dim.y];
    }
    if(opts.position === "top"){
      return [margins.left, margins.top];
    }
  }
  if(aes === "y") {
    if(opts.position === "left"){
      return [margins.left, margins.top];
    }
    if(opts.position === "right"){
      return [margins.left + dim.x, margins.top];
    }
  }
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
var measureScales = ['x', 'y', 'color','size', 'fill' ,'alpha'],
    linearScales = ['log', 'linear', 'time', 'date'],
    globalScales = ['alpha','fill', 'color', 'size', 'shape'];

function SetScales() {
  // do nothing if the object doesn't have aes, data and facet
  // if any of them get reset, the scales must be reset
  if(!this.data() || !this.aes() || !this.facet() ||
     _.isEmpty(this.layers()) ){
    return false;
  }
  // obj is a layer or main plot
  var aes = this.aes(),
      that = this,
      facet = this.facet(),
      data = this.dataList(this.data()),
      dtype,
      settings,
      // gather user defined settings in opts object
      opts = _.zipObject(measureScales, 
        _.map(measureScales, function(a) {
        // there is a scale "single" that holds the 
        // user defined opts and the fixed scale domain
        return that[a + "Scale"]().single._userOpts;
      }));

  function makeScale(d, i, a) {
    if(_.contains(measureScales, a)){
      // user is not specifying a scale.
      if(!(that[a + "Scale"]() instanceof ggd3.scale)){
        // get plot level options set for scale.
        // if a dtype is not found, it's because it's x or y and 
        // has not been declared. It will be some numerical aggregation.
        dtype = that.dtypes()[aes[a]] || ['number', 'many'];
        settings = _.merge(ggd3.tools.defaultScaleSettings(dtype, a),
                           opts[a]);
        var scale = new ggd3.scale(settings)
                            .plot(that)
                            .aesthetic(a);
        if(_.contains(['x', 'y'], a)){
          if(a === "x"){
            scale.range([0, that.plotDim().x]);
          }
          if(a === "y") {
            scale.range([that.plotDim().y, 0]);
          }
          scale.axis = d3.svg.axis().scale(scale.scale());
          for(var ax in settings.axis){
            if(scale.axis.hasOwnProperty(ax)){
              scale.axis[ax](settings.axis[ax]);
            }
          }
        }
        for(var s in settings.scale){
          if(scale.scale().hasOwnProperty(s)){
            scale.scale()[s](settings.scale[s]);
          }
        }
        that[a + "Scale"]()[d.selector] = scale;
        if(i === 0) {
          that[a + "Scale"]().single = scale;
        }
      } else {
        // copy scale settings, merge with default info that wasn't
        // declared and create for each facet if needed.
      } 
    }
  }
  _.each(_.union(['x', 'y'], _.keys(aes)), function(a) {
    return _.map(data, function(d,i) {return makeScale(d, i, a);});
  });
  for(var a in aes) {
    if(_.contains(measureScales, a)){
    // give user-specified scale settings to single facet
      that[a + "Scale"]().single._userOpts = _.cloneDeep(opts[a]);
    }
  }

}

ggd3.tools.defaultScaleSettings = function(dtype, aesthetic) {
  function xyScale() {
    if(dtype[0] === "number") {
      if(dtype[1] === "many"){
        return {type: 'linear',
                  axis: {},
                  scale: {}};
      } else {
        return {type: 'ordinal',
                  axis: {},
                  scale: {}};
      }
    }
    if(dtype[0] === "date"){
        return {type: 'time',
                  axis: {},
                  scale: {}};
    }
    if(dtype[0] === "string"){
        return {type: 'ordinal',
                  axis: {},
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

Plot.prototype.setDomains = function() {
  // when setting domain, this function must
  // consider the stat calculated on the data,
  // be it nested, or not.
  // Initial layer should have all relevant scale info
  // granted, that doesn't make a lot of sense.
  // rather, better idea to keep track of what aesthetics
  // have a scale set for it, and pass over if so.
  var that = this,
      layer = this.layers()[0],
      geom = layer.geom(),
      s = geom.setup(),
      domain,
      data = this.dataList(this.data()),
      scale;

  this.globalScales = globalScales.filter(function(sc) {
    return _.contains(_.keys(s.aes), sc);
  });
  that.freeScales = [];
  _.each(['x', 'y'], function(a) {
    if(!_.contains(['free', 'free_' + a], s.facet.scales()) ){
      that.globalScales.push(a);
    } else {
      that.freeScales.push(a);
    }
  });
  // each facet's data rolled up according to stat
  data = _.map(data, function(d) {
      d.data = this.unNest(geom.compute(d.data, s));
      return d;
  }, this);

  // free scales
  if(!_.isEmpty(that.freeScales)){
    _.map(data, function(d) {
      // data is now nested by facet and by geomNest
      _.map(that.freeScales, function(k){
        scale = that[k+ "Scale"]()[d.selector];
        scale.domain(geom.domain(d.data, k));
      });
    });
  } else {
  }
  function first(d) {
    return d[0];
  }
  function second(d) {
    return d[1];
  }
  // calculate global scales
  _.map(that.globalScales, function(g){
    scale = that[g + "Scale"]().single;
    if(_.contains(globalScales, g)){
      // scale is fill, color, alpha, etc.
      // with no padding on either side of domain.
      if(_.contains(linearScales, scale.scaleType())){
        domain = ggd3.tools.numericDomain(
                    _.flatten(
                      _.map(data, function(d) {
                        return d.data;
                      }), true), s.aes[g]);
        scale.domain(domain);
        scale.range(that[g + 'Range']());
      } else {
        domain = _.sortBy(_.unique(ggd3.tools.categoryDomain(
                    _.flatten(
                      _.map(data, function(d) {
                        return d.data;
                      }), true), s.aes[g])));
        scale.domain(domain);
      }
    } else {
      // data must be delivered to geom's domain as faceted,
      // otherwise aggregates will be calculated on whole dataset
      // rather than facet. Here we're looking for max facet domains.
      domain = _.map(data, function(d) {
        return geom.domain(d.data, g);
      });
      if(_.contains(linearScales, scale.scaleType())){
        domain = [_.min(_.map(domain, first)) ,
        _.max(_.map(domain, second))];
      } else {
        domain = _.sortBy(_.unique(_.flatten(domain)));
      }
        scale.domain(domain);
    }
    for(var sc in scale._userOpts.scale){
      if(scale.scale().hasOwnProperty(sc)){
        scale.scale()[sc](scale._userOpts.scale[sc]);
      }
    }
    if(_.contains(globalScales, g)) {
      var aesScale = _.bind(function(d) {
        // if a geom doesn't use a particular
        // aesthetic, it will trip up here, 
        // choosing to pass null instead.
        return this.scale()(d[s.aes[g]] || null);
      }, scale);
      that[g](aesScale);
    }
  });
};

Plot.prototype.setScales = SetScales;

// tooltip
function Tooltip (spec) {
  if(!(this instanceof Tooltip)){
    return new Tooltip(spec);
  }
  var attributes = {

  };

  for(var attr in attributes) {
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
    this[attr] = createAccessor(attr);
    }
  }
}


ggd3.tooltip = Tooltip;
// Base geom from which all geoms inherit
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
    lineWidth: null,
    drawX: true,
    drawY: true,
    style: "", // optional class attributes for css 
  };
  this.attributes = attributes;
}
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

Geom.prototype.setup = function() {
  var s = {
      layer     : this.layer(),
    };
  s.plot      = s.layer.plot();
  s.stat      = s.layer.stat();
  s.nest      = this.nest();
  s.dtypes    = s.layer.dtypes();
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
    s.group = aes.color;
  } else if(aes.group){
    s.grouped = true;
    s.group = s.aes.group;
  }
  if(_.contains([s.facet.x(), s.facet.y(), 
                s.aes.x, s.aes.y], 
                s.group)) {
    // uninteresting grouping, get rid of it.
    grouped = false;
    group = null;
    groups = null;
  }

  return s;
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

  if(_.contains(linearScales, plot[a + "Scale"]().single.scaleType())) {
    extent  = d3.extent(_.pluck(data, aes[a]));
    range   = extent[1] - extent[0];
  } else {
    var domain = _.sortBy(_.unique(_.pluck(data, aes[a])));
    return domain;
  }
  // done if date
  // and not histogram or density
  if(_.contains(["date", "time"], plot.dtypes()[aes[a]][0]) ){
    return extent;
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

  var x, y;
    // choosing scales based on facet rule,
  // factor out.
  if(!_.contains(["free", "free_x"], setup.facet.scales()) || 
     _.isUndefined(setup.plot.xScale()[selector])){
    x = setup.plot.xScale().single;
    xfree = false;
  } else {
    x = setup.plot.xScale()[selector];
    xfree = true;
  }
  if(!_.contains(["free", "free_y"], setup.facet.scales()) || 
     _.isUndefined(setup.plot.xScale()[selector])){
    y = setup.plot.yScale().single;
    yfree = false;
  } else {
    y = setup.plot.yScale()[selector];
    yfree = true;
  }

  if(layerNum === 0 && drawX){
    sel.select('.x.axis')
      .attr("transform", "translate(" + x.positionAxis() + ")")
      .transition().call(x.axis);
  }
  if(layerNum === 0 && drawY){
    sel.select('.y.axis')
      .attr("transform", "translate(" + y.positionAxis() + ")")
      .transition().call(y.axis);
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
      nestVars = _.unique(_.compact([aes.group, aes.fill, aes.color]));

  _.each(nestVars, function(n) {
    if(dtypes[n][1] !== "many") {
      nest.key(function(d) { return d[n]; });
    }
  });
  _.map(['x', 'y'], function(a) {
    if(plot[a + "Scale"]().single.scaleType() === "ordinal"){
      nest.key(function(d) { return d[aes[a]]; });
    }
  });
  return nest;
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
    lineWidth: 1,
    offset: 'zero',
    groupRange: 0,
    stackRange: 0,
  };

  this.attributes = _.merge(this.attributes, attributes);

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
  var keys = _.unique(_.flatten(_.map(data, function(d) {
    return _.map(d.values, function(e) {
      return e[v];
    });
  })));
  // get an example object and set it's values to null;
  var filler = _.clone(data[0].values[0]);
  _.mapValues(filler, function(v,k) {
    filler[k] = null;
  });
  _.each(data, function(d) {
    var dkey, missing;
    dkeys = _.map(d.values, function(e) { return e[v]; });
    missing = _.compact(_.filter(keys, function(k) {
      return !_.contains(dkeys, k);
    }));
    if(!_.isEmpty(missing)) {
      _.each(missing, function(m) {
        // must fill other values, too.
        var e = _.clone(filler);
        e[v] = m;
        d.values.push(e);
      });
    }
    d.values = _.sortBy(d.values, function(e) {
      return e[v];
    });
  });

  return data;
};

Bar.prototype.domain = function(data, a) {
  var s = this.setup(),
      valueVar = s.aes[a] ? s.aes[a]: "n. observations",
      group, stackby,
      groupRange, stackRange,
      grouped;
  if(!_.contains(linearScales, s.plot[a + "Scale"]().single.scaleType())) {
    var domain = _.sortBy(_.unique(_.pluck(data, s.aes[a])));
    return domain;
  }
  group = s.aes.fill || s.aes.color || s.aes.group;
  stackby = a === "x" ? s.aes.y: s.aes.x;

  grouped = _.groupBy(data, function(d) {
    return d[stackby];
  });

  stackRange = _.mapValues(grouped, function(v, k) {
    return _.reduce(_.pluck(v, valueVar), function(a,b) {
      return a + b;
    });
  });
  stackRange = d3.extent(_.map(stackRange, 
                         function(v, k) { return v; }));
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
  return (s.plot.xScale().single.scaleType() === "ordinal" ||
                      s.aes.y === "binHeight");
};

Bar.prototype.draw = function(sel, data, i, layerNum) {

  var s     = this.setup(),
      that  = this;

  var o, // original value or ordinal scale
      n, // numeric agg scale
      rb, // final range band
      o2, // used to calculate rangeband if histogram
      valueVar, // holds aggregated name
      categoryVar, // name of bar positions
      // secondary ordinal scale to calc dodged rangebands
      groupOrd  = d3.scale.ordinal(),
      drawX     = true,
      drawY     = true,
      vertical = this.vertical(s);

  if(_.contains(['wiggle', 'silhouette'], that.offset()) ){
    if(vertical){
      // x is bars, don't draw Y axis
      drawY = false;
      sel.select('.y.axis')
        .selectAll('*')
        .transition()
        .style('opacity', 0)
        .remove();
    } else {
      // y is ordinal, don't draw X.
      drawX = false;
      sel.select('.x.axis')
        .selectAll('*')
        .transition()
        .style('opacity', 0)
        .remove();
    }
  }
  // gotta do something to reset domains if offset is expand
  if(that.offset() === "expand"){
    if(vertical){
      _.mapValues(s.plot.yScale(), function(v, k) {
        v.domain([-0.05,1.05]);
      });
    } else {
      _.mapValues(s.plot.xScale(), function(v, k) {
        v.domain([-0.05,1.05]);
      });  
    }
  }

  var scales = that.scalesAxes(sel, s, data.selector, 
                               layerNum,
                               drawX, drawY);
  // scales are drawn by now. return if no data.
  ggd3.tools.removeElements(sel, layerNum, "rect");
  if(!data.data.length){ return false; }

  data = data.data;


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


  // calculate stat
  // but why isn't this already done since 
  // we've trained domains?
  data = this.compute(data, s);
  s.groups = _.pluck(data, 'key');

  data = this.unNest(data);
  // data must be nested to go into stack algorithm
  if(s.group){
    data = d3.nest().key(function(d) { return d[s.group];})
              .entries(data);
  } else {
    data = [{key: 'single',values:data}];
  }

  // with histograms, if a bin is empty, it's key comes
  // back 'undefined'. This causes bars to be drawn
  // from the top (or right). They should be removed
  data = _.filter(data, function(d) { 
    return d.key !== "undefined" ;});
  if(this.name() === "bar"){
    rb = o.rangeBand();
    valueVar = s.aes[size.p] || "n. observations";
    categoryVar = s.aes[width.p];
  } else if(that.name() === "histogram"){
    valueVar = "binHeight";
    categoryVar = s.group;
    if(vertical){
      rb = o(o.domain()[0] + data[0].values[0].dx );
    } else {
      rb = o(o.domain()[1] - data[0].values[0].dx );
      console.log(rb);
    }
  }
  if(s.grouped && 
     !_.contains([s.aes.x, s.aes.y, s.facet.y(), s.facet.x()], s.group)){
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
  data = _.map(stack(data),
                          function(d) {
                            return d.values ? d.values: [];
                          });
  data = _.flatten(data, 
                   that.name() === "histogram" ? true:false);
  if(s.position === 'dodge') {
    // make ordinal scale for group
    groupOrd.rangeBands([0, rb], 0, 0)
            .domain(s.groups);
    rb = groupOrd.rangeBand();
  }
  if(s.position !== "dodge"){
    groupOrd = function(d) {
      return 0;
    };
  }
  
  var placeBar = (function() {
    if(that.name() === "bar" || vertical){
      return function(d) {
        var p = o(d[s.aes[width.p]]);
        p += groupOrd(d[s.group]) || 0;
        return p || 0;};
    } else {
      return function(d) {
        var p = o(d[s.aes[width.p]]) - rb;
        p += groupOrd(d[s.group]) || 0;
        return p || 0;
        };
    }
  })();

  // I think this is unnecessary.
  var calcSizeS = (function() {
    if(s.position === 'stack' && size.p === "y"){
      return function(d) {
        return n(0) - n(d.y);
      };
    }
    if(s.position === "stack"){
      return function(d) {
        return n(d.y) - n(0);
      };
    }
    if(s.position === "dodge" && size.p === "y"){
      return function(d) {
        return n(0) - n(d.y); 
      };
    }
    return function(d) {
      return n(d[valueVar]) - n(0); 
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
        return n(d.y);
      };
    }
    return function(d) {
      return n(0);
    };
  } )();


  var bars = sel.select('.plot')
                .selectAll('rect.geom.g' + layerNum)
                .data(data);
  // add canvas and svg functions.
  function draw(rect) {
    rect.attr('class', 'geom g' + layerNum + ' geom-bar')
      .attr(size.s, calcSizeS)
      .attr(width.s, rb)
      .attr(size.p, calcSizeP)
      .attr(width.p , placeBar || 0)
      .attr('value', function(d) { 
        return d[s.group] + "~" + d[s.aes[width.p]];
      })
      .style({
        fill: s.fill,
        stroke: s.color,
        'fill-opacity': s.alpha,
        'stroke-width': that.lineWidth()
      });
  }

  bars.transition().call(draw);
  
  bars.enter()
    .append(this.geom())
    .attr(width.s, rb)
    .attr(width.p, placeBar)
    .attr(size.s, 0)
    .attr(size.p, function(d) {
      return n(0);
    })
    .style({
      fill: s.fill,
      stroke: s.color,
      'fill-opacity': s.alpha,
      'stroke-width': that.lineWidth()
    })
    .transition()
    .call(draw);

  bars.exit()
    .transition()
    .style('opacity', 0)
    .remove();
};

ggd3.geoms.bar = Bar;

// 
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
    interpolate: 'basis',
    lineType: null,
  };

  this.attributes = _.merge(this.attributes, attributes);

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

Line.prototype.generator = function(aes, x, y) {
  return d3.svg.line()
          .x(function(d) { return x(d[aes.x]); })
          .y(function(d) { return y(d[aes.y]); })
          .interpolate(this.interpolate());
};

Line.prototype.selector = function(layerNum) {
  if(this.grid()){
    var direction = this.name() === "hline" ? "x": "y";
    return "grid-" + direction;
  }
  return "geom g" + layerNum + " geom-" + this.name();
};

Line.prototype.drawLines = function (path, line, s, layerNum) {
  var that = this;
  if(!this.lineType()){
    this.lineType(s.plot.lineType());
  }
  path.attr("class", this.selector(layerNum))
    .attr('d', line)
    .attr('stroke-dasharray', this.lineType());
  if(!this.grid()){
    path
      .attr('stroke-opacity', function(d) { return s.alpha(d[1]) ;})
      .attr('stroke', function(d) { return s.color(d[1]);})
      .attr('stroke-width', this.lineWidth() || s.plot.lineWidth())
      .attr('fill', 'none'); // must explicitly declare no grid.
  }
};

Line.prototype.prepareData = function(data, s) {
  data = s.nest
          .rollup(function(d) { return s.stat.compute(d);})
          .entries(data.data) ;

  data = _.map(data, function(d) { return this.recurseNest(d);}, this);
  return data;
};

Line.prototype.draw = function draw(sel, data, i, layerNum){
// data should be passed in in order
// missing data should be allowed somehow
// the 
  var s     = this.setup(),
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                                 this.drawX(), this.drawY());

  ggd3.tools.removeElements(sel, layerNum, "geom-" + this.name());
  data = this.prepareData(data, s, scales);
  sel = this.grid() ? sel.select("." + this.direction() + 'grid'): sel.select('.plot');
  var lines = sel
              .selectAll("." + this.selector(layerNum).replace(/ /g, '.'))
              .data(data),
  line = this.generator(s.aes, scales.x.scale(), scales.y.scale());
  lines.transition().call(_.bind(this.drawLines, this), line, s, layerNum);
  lines.enter().append(this.geom())
    .call(_.bind(this.drawLines, this), line, s, layerNum);
  lines.exit()
    .transition()
    .style('opacity', 0)
    .remove();
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

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Histogram.prototype = new Bar();
  
Histogram.prototype.constructor = Histogram;

Histogram.prototype.domain = function(data, v) {
  var s = this.setup(),
      group, stackby,
      groupSum, stackSum,
      grouped;

  if(s.aes[v] === "binHeight") {
    grouped = _.groupBy(data, function(d) {
      return d.x;
    });
    stackSum = _.mapValues(grouped, function(v, k) {
      return _.reduce(_.pluck(v, "y"), function(a,b) {
        return a + b;
      });
    });
    stackSum = d3.extent(_.map(stackSum, function(v, k) { return v; }));
    groupSum = d3.extent(data, function(d) {
      return d.y;
    });
    extent = s.position === "stack" ? stackSum: groupSum;
    range = extent[1] - extent[0];
    extent[0] -= 0.05*range;
  } else {
    extent = d3.extent(_.pluck(data, 'x'));
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
      breaks = _.map(unNested, "x");
  // this is the problem
  // there should be a 'fixed bins' flag
  this.breaks(breaks);
  return s.nest.entries(data);
};

Histogram.prototype.fillEmptyStackGroups = function(data, v) {

  var keys = _.unique(_.map(data, function(d) { return d.key; })),
      vals = _.unique(_.flatten(_.map(data, function(d) {
        return _.map(d.values, 'x');
      }))),
      empty = {},
      n = d3.nest()
            .key(function(d) { return d[v]; });
  empty.y = 0;
  empty.binHeight = 0;
  empty.dx = data[0].dx;
  _.each(data, function(d) {
    var dkey, missing;
    dkeys = _.map(d.values, 'x');
    missing = _.compact(_.filter(vals, function(k) {
      return !_.contains(dkeys, k);
    }));
    if(!_.isEmpty(missing)) {
      _.each(missing, function(m) {
        // must fill other values, too.
        var e = _.clone(empty);
        e.x = m;
        d.values.push(e);
      });
    }
    d.values = _.sortBy(d.values, function(e) {
      return e.x;
    });
  });
  return data;
};
// geoms may want to be nested differently.
Histogram.prototype.nest = function() {
  // if stacking histograms, bins must be calculated
  // first on entire facet, then individually on
  // each layer. If facet.scales() === "fixed"
  // bins should be the same across facets. If not
  // the pre calculated bins need to be stored and 
  // referenced when calculating layers.
  var aes = this.layer().aes(),
      plot = this.layer().plot(),
      nest = d3.nest(),
      dtypes = plot.dtypes(),
      nestVars = _.unique(_.compact([aes.group, aes.fill, aes.color]));

  _.each(nestVars, function(n) {
    if(dtypes[n][1] !== "many") {
      nest.key(function(d) { return d[n]; });
    }
  });
  _.map(['x', 'y'], function(a) {
    if(plot[a + "Scale"]().single.scaleType() === "ordinal"){
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
    // color: d3.functor("black")
  };

  this.attributes = _.merge(_.clone(this.attributes), attributes);

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
  if(!_.contains(_.keys(s.aes), "yint")){
    throw "geom abline requires aesthetic 'yint' and an optional slope.";
  }
  if(!_.contains(linearScales, scales.x.scaleType() )){
    throw "use geom hline or vline to draw lines on an ordinal x axis y yaxis";
  }
  if(!s.aes.slope){
    s.aes.slope = 0;
  }
  var xdomain = scales.x.scale().domain(),
      data;
  if(_.isNumber(s.aes.yint)){
    s.aes.yint = [s.aes.yint];
  }
  if(_.isArray(s.aes.yint)){
    // yints and slopes are drawn on every facet.
    data = _.map(s.aes.yint, function(y) {
      return _.map(xdomain, function(x, i) {
        var o = {};
        o[s.aes.x] = x;
        o[s.aes.y] = y + s.aes.slope * x;
        return o;
      });
    });
  }
  if(_.isString(s.aes.yint)){
    data = [];
    _.each(d.data, function(row) {
      data.push(_.map(xdomain, function(x) {
        var o = {};
        o[s.aes.x] = x;
        o[s.aes.y] = row[s.aes.yint] + row[s.aes.slope] * x;
        o = _.merge(_.clone(row), o);
        return o;
      }));
    }); 
  }
  return data;
};


ggd3.geoms.abline = Abline;
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

  this.attributes = _.merge(this.attributes, attributes);

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
  if(s.plot.xScale().single.scaleType() === "ordinal"){
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
    domain = _.sortBy(_.map(data, function(d) {
      return _.unique(_.pluck(d.data, s.aes[a]));
    }));
  } else {
    domain = d3.extent(_.flatten(_.map(data, function(d) {
      return _.pluck(d.data, s.aes[a]);
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
    mean: false,
  };

  this.attributes = _.merge(this.attributes, attributes);

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
  if(s.plot.xScale().single.scaleType() === "ordinal"){
    return 'x';
  } else {
    return 'y';
  }
};

Boxplot.prototype.domain = function(data, a) {

  var s = this.setup(),
      factor = this.determineOrdinal(s),
      number = factor === 'x' ? 'y': 'x',
      domain,
      extent;
  if(a === factor) {
    domain = _.sortBy(_.map(data, function(d) {
      return _.unique(_.pluck(d.data, s.aes[a]));
    }));
  } else {
    domain = d3.extent(_.flatten(_.map(data, function(d) {
      return _.pluck(d.data, s.aes[a]);
    })));
    extent = domain[1] - domain[0];
    domain[0] -= extent*0.1;
    domain[1] += extent*0.1;
  }
  return domain;
};
Boxplot.prototype.positionOutlier = function() {

};

Boxplot.prototype.positionBar = function() {

};

Boxplot.prototype.draw = function(sel, data, i, layerNum) {
  var s = this.setup(),
      that = this,
      o, n, o2, rb,
      size, width,
      line,
      scales = that.scalesAxes(sel, s, data.selector, layerNum,
                               this.drawX(), this.drawY()),
      vertical = scales.x.scaleType() === "ordinal",
      factor = vertical ? "x": "y",
      number = vertical ? "y": "x";

  ggd3.tools.removeElements(sel, layerNum, "geom-" + this.name());

  data = this.unNest(this.compute(data.data, s));
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
  if(s.grouped) {
    s.groups = _.sortBy(_.unique(_.flatten(_.map(data, function(d) {
      return _.pluck(d.data, s.group);
    }))));
    o2 = d3.scale.ordinal()
            .rangeBands([0, o.rangeBand()], 0.1, 0)
            .domain(s.groups);
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
      out = _.map(out, function(d){
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
          v += rb; // add rb the other way
          return "translate(0," + v + ")";
        } 
        return "translate(" + v + ",0)" ;
      });
    var r = ggd3.geoms.box();
    rect.call(r.drawGeom, rx, ry, rw, rh, s, layerNum);
    rect.enter().append('rect')
      .attr('class', 'quantile-box')
      .call(r.drawGeom, rx, ry, rw, rh, s, layerNum);
    if(that.outliers()) {
      var p = ggd3.geoms.point(),
          points = box.selectAll('circle')
                .data(d.data);
      points.call(p.drawGeom, px, py, s, layerNum);
      points.enter().append('circle')
        .attr('class', 'outlier')
        .call(p.drawGeom, px, py, s, layerNum);
    }
  }
  var boxes = sel.select('.plot')
                .selectAll('.geom g' + layerNum)
                .data(data);

  boxes.each(function(d) {
    d3.select(this).call(draw);
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
    alpha: 0.4,
    lineType: null,
  };

  this.attributes = _.merge(this.attributes, attributes);

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
        });
    if(that.fill()){
      path
        .style('fill', function(d) {
          return s.color(d.values[1]);
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
  data = s.nest
          .rollup(function(d) {
            return s.stat.compute(d);
          })
          .entries(data.data);

  // if data are not grouped, it will not be nested
  // but will be computed, so we have to manually nest
  if(!data[0].key && !data[0].values){
    data = [{key:'key', values: data}];
  }
  var line = d3.svg.line();
  line[n](function(v) { return scales[n].scale()(v[s.aes[n]]); } );
  line[d](function(v) { return scales[d].scale()(v[s.aes[d]]); } );
  // need to calculate the densities to draw proper domains.
  ggd3.tools.removeElements(sel, layerNum, this.geom());
  var path = sel.select('.plot')
                .selectAll('.geom.g' + layerNum)
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
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Hline.prototype = new Line();

Hline.prototype.constructor = Hline;

Hline.prototype.generator = function(aes) {
  // get list of intercepts and translate them
  // in the data to the actual coordinates
  var s = this.setup(),
  x = d3.scale.linear()
        .range([0, s.dim.x])
        .domain([0, s.dim.x]),
  y = d3.scale.linear()
          .range([0, s.dim.y])
          .domain([0, s.dim.y]);
  return d3.svg.line()
          .x(function(d) { return x(d.x); })
          .y(function(d) { return y(d.y); })
          .interpolate(this.interpolate());
};

Hline.prototype.prepareData = function(data, s, scales) {
  var direction = this.name() === "hline" ? "y":"x",
      other = direction === "x" ? 'y': 'x',
      scale = scales[direction],
      p;
  if(!_.contains(linearScales, scale.scaleType())){
    p =  _.map(scale.scale().domain(),
              function(i) {
                return scale.scale()(i) + scale.scale().rangeBand()/2;
              });
  } else {
    p = _.map(scales[direction].scale().ticks(4),
              function(i) {
                return scale.scale()(i);
              });
  } 
  if(this.grid()) {
    // disregard data grab intercepts from axis and
    // create new dataset.
    data = [];
    _.each(p, function(intercept) {
      var o1 = {}, o2 = {};
      o1[direction] = intercept;
      o2[direction] = intercept;
      o1[other] = 0;
      o2[other] = s.dim[other];
      data.push([o1, o2]);
    });
  } else {
    // do something else with the data
    // data = 
  }
  return data;
};



ggd3.geoms.hline = Hline;
// 
function Path(spec) {
  if(!(this instanceof Geom)){
    return new Path(aes);
  }
  Geom.apply(this);
  var attributes = {
    name: "path",
    stat: "identity",
    position: null,
    lineWidth: 1,
  };
  // path is just line drawn in order, so probably doesn't need anything.

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

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
    subRangeBand: 0.3,
    subRangePadding: 0.1,
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    // if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    // }
  }
}
Point.prototype = new Geom();

Point.prototype.constructor = Point;

Point.prototype.positionPoint = function(s, group, groups) {

  var sub,
      rb = 0,
      a = s.aesthetic(),
      shift = 0,
      aes = this.layer().aes();
  if(s.scaleType() === "ordinal" && groups){
    sub = d3.scale.ordinal()
                .rangeBands([0, s.scale().rangeBand()], 
                                 this.subRangeBand(), 
                                 this.subRangePadding())
                .domain(groups);
    rb = sub.rangeBand()/2;
    shift = d3.sum(s.rangeBands(), function(r) {
      return r*s.scale().rangeBand();});
  } else if(s.scaleType() === "ordinal") {
    sub = function() { 
      return s.scale().rangeBand() / 2; 
    };
    rb = s.scale().rangeBand() / 2;
  } else {
    sub = function() { return 0;};
  }
  return function(d) {
    return (s.scale()(d[aes[a]]) +
          sub(d[group]) + shift + 
          (d._jitter || 0) * rb);
  };
};

Point.prototype.position = function(d, x, y, size) {
  return {
    cx: x(d),
    cy: y(d),
    r: size(d)
  };
};

Point.prototype.draw = function(sel, data, i, layerNum) {

  // should be able to pass a setup object from a different geom
  // if a different geom wants to create a point object.
  var s     = this.setup(),
      scales = this.scalesAxes(sel, s, data.selector, layerNum,
                               true, true);
  s.groups = _.unique(_.pluck(data.data, s.group));
  data = this.unNest(this.compute(data.data, s  ));

  // get rid of wrong elements if they exist.
  ggd3.tools.removeElements(sel, layerNum, this.geom());
  var points = sel.select('.plot')
                .selectAll(this.geom() + '.geom.g' + layerNum)
                .data(data);
  
  // poing should have both canvas and svg functions.
  var x = this.positionPoint(scales.x, s.group, s.groups),
      y = this.positionPoint(scales.y, s.group, s.groups);

  points.transition().call(this.drawGeom, x, y, s, layerNum);
  points.enter().append(this.geom())
    .call(this.drawGeom, x, y, s, layerNum);
  points.exit()
    .transition()
    .style('opacity', 0)
    .remove();
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
    .style({
      stroke: s.color,
      "stroke-width": 1,
      "fill-opacity": s.alpha
    });
};

ggd3.geoms.point = Point;

// 
function Ribbon(spec) {
  Geom.apply(this);
  var attributes = {
    name: "ribbon",
    stat: "identity",
    position: null,
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Ribbon.prototype.constructor = Ribbon;

ggd3.geoms.ribbon = Ribbon;
// 
function Smooth(spec) {
  Geom.apply(this);
  var attributes = {
    name: "smooth",
    stat: "identity",
    position: null,
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Smooth.prototype.constructor = Smooth;

ggd3.geoms.smooth = Smooth;
(function() {
  var _symbol = d3.svg.symbol(),
      _line = d3.svg.line();

  d3.superformula = function() {
    var type = _symbol.type(),
        size = _symbol.size(),
        segments = size,
        params = {};

    function superformula(d, i) {
      var n, p = _superformulaTypes[type.call(this, d, i)];
      for (n in params) {p[n] = params[n].call(this, d, i);}
      return _superformulaPath(p, segments.call(this, d, i), Math.sqrt(size.call(this, d, i)));
    }

    superformula.type = function(x) {
      if (!arguments.length) {return type;}
      type = d3.functor(x);
      return superformula;
    };

    superformula.param = function(name, value) {
      if (arguments.length < 2) {return params[name];}
      params[name] = d3.functor(value);
      return superformula;
    };

    // size of superformula in square pixels
    superformula.size = function(x) {
      if (!arguments.length) {return size;}
      size = d3.functor(x);
      return superformula;
    };

    // number of discrete line segments
    superformula.segments = function(x) {
      if (!arguments.length) {return segments;}
      segments = d3.functor(x);
      return superformula;
    };

    return superformula;
  };

  function _superformulaPath(params, n, diameter) {
    var i = -1,
        dt = 2 * Math.PI / n,
        t,
        r = 0,
        x,
        y,
        points = [];

    while (++i < n) {
      t = params.m * (i * dt - Math.PI) / 4;
      t = Math.pow(Math.abs(Math.pow(Math.abs(Math.cos(t) / params.a), params.n2) + 
        Math.pow(Math.abs(Math.sin(t) / params.b), params.n3)), -1 / params.n1);
      if (t > r) {r = t;}
      points.push(t);
    }

    r = diameter * Math.SQRT1_2 / r;
    i = -1; while (++i < n) {
      x = (t = points[i] * r) * Math.cos(i * dt);
      y = t * Math.sin(i * dt);
      points[i] = [Math.abs(x) < 1e-6 ? 0 : x, Math.abs(y) < 1e-6 ? 0 : y];
    }

    return _line(points) + "Z";
  }

  var _superformulaTypes = {
    asterisk: {m: 12, n1: 0.3, n2: 0, n3: 10, a: 1, b: 1},
    bean: {m: 2, n1: 1, n2: 4, n3: 8, a: 1, b: 1},
    butterfly: {m: 3, n1: 1, n2: 6, n3: 2, a: 0.6, b: 1},
    circle: {m: 4, n1: 2, n2: 2, n3: 2, a: 1, b: 1},
    clover: {m: 6, n1: 0.3, n2: 0, n3: 10, a: 1, b: 1},
    cloverFour: {m: 8, n1: 10, n2: -1, n3: -8, a: 1, b: 1},
    cross: {m: 8, n1: 1.3, n2: 0.01, n3: 8, a: 1, b: 1},
    diamond: {m: 4, n1: 1, n2: 1, n3: 1, a: 1, b: 1},
    drop: {m: 1, n1: 0.5, n2: 0.5, n3: 0.5, a: 1, b: 1},
    ellipse: {m: 4, n1: 2, n2: 2, n3: 2, a: 9, b: 6},
    gear: {m: 19, n1: 100, n2: 50, n3: 50, a: 1, b: 1},
    heart: {m: 1, n1: 0.8, n2: 1, n3: -8, a: 1, b: 0.18},
    heptagon: {m: 7, n1: 1000, n2: 400, n3: 400, a: 1, b: 1},
    hexagon: {m: 6, n1: 1000, n2: 400, n3: 400, a: 1, b: 1},
    malteseCross: {m: 8, n1: 0.9, n2: 0.1, n3: 100, a: 1, b: 1},
    pentagon: {m: 5, n1: 1000, n2: 600, n3: 600, a: 1, b: 1},
    rectangle: {m: 4, n1: 100, n2: 100, n3: 100, a: 2, b: 1},
    roundedStar: {m: 5, n1: 2, n2: 7, n3: 7, a: 1, b: 1},
    square: {m: 4, n1: 100, n2: 100, n3: 100, a: 1, b: 1},
    star: {m: 5, n1: 30, n2: 100, n3: 100, a: 1, b: 1},
    triangle: {m: 3, n1: 100, n2: 200, n3: 200, a: 1, b: 1}
  };

  d3.superformulaTypes = d3.keys(_superformulaTypes);
})();

function Text(spec) {
  if(!(this instanceof Geom)){
    return new Text(spec);
  }
  Point.apply(this);
  var attributes = {
    name: "text",
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    // if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    // }
  }
}
Text.prototype = new Point();

Text.prototype.constructor = Text;

Text.prototype.draw = function() {

  var s     = this.setup(),
      that  = this;

  function draw(sel, data, i, layerNum) {

    var scales = that.scalesAxes(sel, s, data.selector, layerNum,
                                 true, true);


    var positionX = that.positionPoint(scales.x, s.group, s.groups),
        positionY = that.positionPoint(scales.y, s.group, s.groups);

    ggd3.tools.removeElements(sel, layerNum, "text");

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

    var text = sel.select('.plot')
                  .selectAll('text.geom.g' + layerNum)
                  .data(s.  stat.compute(data.data));
    text.transition().call(drawText);
    text.enter().append('text').call(drawText);
    text.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }
  return draw;
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

  this.attributes = _.merge(this.attributes, attributes);

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
    yint: null, // default is median of group, like the rest
  }; 
  if(_.isPlainObject(setting)) {
    for(var a in setting){
      if(_.isFunction(setting[a])){
        attributes[a] = setting[a];
      } else {
        // map[a] is a string specifying a function
        // that lives on Stat
        attributes[a] = this[setting[a]];
      }
    }
  } else if(_.isString(setting)){
    attributes.linearAgg = setting;
  }
  // object storing column names and agg functions
  // to be optionally used on tooltips.
  this.attributes = attributes;
  var getSet = ["layer", "linearAgg"];
  for(var attr in attributes){
    if(_.contains(getSet, attr)){
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
  var out = {};
  for(var a in aes){
    out[aes[a]] = this[a]()(_.pluck(data, aes[a]));
  }
  return out;
};

Stat.prototype.compute = function(data) {
  var aes = this.layer().aes(),
      id = _.any(_.map(_.keys(aes), function(k){
              if(!this[k]()){ return null; }
              return this[k]()([]) === "identity";
            }, this));
  if(_.contains(specialStats, this.linearAgg()) ){
    return this["compute_" + this.linearAgg()](data);
  }

  // most situations will need these two
  if(id){
    return data;
  }
  out = this.agg(data, aes);
  return out;
};

function aggSetter(a) {
  return function(f) {
    if(!arguments.length) { return this.attributes[a]; }
    if(_.isString(f)){
      this.attributes[a] = this[f];
    } else if(_.isFunction(f)){
      this.attributes[a] = f;
    } else if(_.isArray(f)){
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
Stat.prototype.fill = aggSetter('fill');
Stat.prototype.color = aggSetter('color');
Stat.prototype.alpha = aggSetter('alpha');
Stat.prototype.size = aggSetter('size');
Stat.prototype.size = aggSetter('size');
Stat.prototype.yint = aggSetter('yint');
Stat.prototype.slope = d3.functor(null);
Stat.prototype.label = function() {
  return function(arr) {
    return arr[0];
  };
};

Stat.prototype.median = function(arr) {
  if(arr.length > 100000) { 
    console.warn("Default behavior of returning median overridden " + 
           "because array length > 1,000,000." + 
           " Mean is probably good enough.");
    return d3.mean(arr); 
  }
  return d3.median(arr);
};
Stat.prototype.count = function(arr) {
  return arr.length;
};
Stat.prototype.min = function(arr) {
  return d3.min(arr);
};
Stat.prototype.max = function(arr) {
  return d3.max(arr);
};
Stat.prototype.mean = function(arr) {
  return d3.mean(arr);
};
Stat.prototype.iqr = function(arr) {
  // arr = _.sortBy(arr);
  return {"25th percentile": d3.quantile(arr, 0.25),
          "50th percentile": d3.quantile(arr, 0.5),
          "75th percentile": d3.quantile(arr, 0.75)
        };
};

// don't do anything with character columns
Stat.prototype.first = function(arr) {
  return arr[0];
};

Stat.prototype.mode = function(arr) {
  return "nuthing yet for mode.";
};
// how to deal with less convential computations?
// ugly hack? Most of this is ugly.
Stat.prototype.identity = function(arr) {
  return "identity";
};
Stat.prototype.density = function(arr) {
  return 'density';
};
Stat.prototype.boxplot = function(arr) {
  return 'boxplot';
};
Stat.prototype.compute_boxplot = function(data) {
  // console.log(data);
  var aes = this.layer().aes(),
      g = this.layer().geom(),
      factor = this.layer().dtypes()[aes.x][1] === "few" ? 'x': 'y',
      number = factor === 'x' ? 'y': 'x',
      arr = _.sortBy(_.pluck(data, aes[number])),
      iqr = this.iqr(arr),
      upper = d3.quantile(arr, g.tail() ? (1 - g.tail()): g.upper()),
      lower = d3.quantile(arr, g.tail() || g.lower()),
      out = _.merge({
        "quantiles": iqr,
        "upper": upper,
        "lower": lower,
      }, this.agg(data, aes));
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
  n = h === "y" ? "x": "y";

  var hist = d3.layout.histogram()
                .bins(g.breaks() || g.bins())
                .frequency(g.frequency())
                .value(function(d) {
                  return d[aes[n]];
                });
  data = hist(data);
  data.map(function(d) {
    if(_.isEmpty(d)) { return d; }
    d[aes[n]] = d.x;
    d.binHeight = d.y;
    // all other aesthetics in histograms will only map to
    // categories, so we don't need to know all about other 
    // variables in the bin.
    for(var a in aes) {
      if(_.contains(['x', 'y'], a)) { continue; }
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
  _.map(['color', 'group'], function(a) {
    if(aes[a]){
      out[aes[a]] = data[0][aes[a]];
    }
  });
  data = _.pluck(data, aes[n]);
  g = this.layer().geom();
  k = g[g.kernel()](g.smooth());
  r = d3.extent(data);
  p = _.range(r[0], r[1], (r[1] - r[0])/g.nPoints());
  kde = g.kde(k, p);
  data = kde(data);
  out = _.map(data, function(d) {
    var o = _.clone(out);
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
