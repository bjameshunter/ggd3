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

ggd3.tools.linearDomain = function(data, variable, rule, zero) {
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
ggd3.tools.fillEmptyStackGroups = function(data, v) {
  // every object in data must have same length
  // array in its 'value' slot
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

ggd3.tools.fillEmptyStackLayers = function(data, v){

  return data;
};
ggd3.tools.removeElements = function(sel, layerNum, element) {
  var remove = sel.select('.plot')
                    .selectAll('.geom.g' + layerNum)
                    .filter(function() {
                      return d3.select(this)[0][0].nodeName !== element;
                    });
  remove.transition().duration(1000)
    .style('opacity', 0)
    .remove();
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

function unNest(data) {
  // recurse and flatten nested dataset
  // this means no dataset can have a 'values' column
  if(!data || _.isEmpty(data)){ 
    return data;
  }
  var branch = _.all(_.map(data, function(d){
    return d.hasOwnProperty('values');
  }));
  if(!branch) { 
    return data; 
  }
  var vals = _.flatten(
              _.map(data, function(d) { return d.values; })
             );
  return ggd3.tools.unNest(vals);
}

ggd3.tools.unNest = unNest;

// accepts single nested object
function RecurseNest(data) {
  if(!data.values) { return data; }
  return _.map(data.values, 
               function(d) {
                return recurseNest(d);
              });
}
ggd3.tools.recurseNest = RecurseNest;
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
    titleProps: [0.15, 0.15],
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
      addHeight = (rowNum === 0 || this.type() === "wrap") ? dim.y*that.titleProps()[1]:0,
      addWidth = colNum === 0 ? dim.x*that.titleProps()[0]:0,
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
    .append('rect')
    .attr('class', 'background')
    .attr({x: 0, y:0, width: dim.x, height:dim.y});
  plot.exit().remove();

  var xaxis = selection.selectAll('g.x.axis')
                .data([0]);
  xaxis
    .attr('class', 'x axis' + gridClassX);
  xaxis.enter().append('g')
    .attr('class', 'x axis' + gridClassX);
  xaxis.exit().remove();
  var yaxis = selection.selectAll('g.y.axis')
                .data([0]);
  yaxis
    .attr('class', 'y axis' + gridClassY);
  yaxis.enter().append('g')
    .attr('class', 'y axis' + gridClassY);
  yaxis.exit().remove();
};

Facet.prototype.makeTitle = function(selection, colNum, rowNum) {
  var that = this,
      plot = this.plot(),
      dim = plot.plotDim(),
      margins = plot.margins(),
      addHeight = dim.y*that.titleProps()[1],
      addWidth = colNum === 0 ? dim.x*that.titleProps()[0]:0;
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
    aes:      null,
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
  this.attributes.aes = aes;
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
    this.position(geom.defaultPosition());
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
  // and should be set to count if geom is not density.
  _.each(['x', 'y'], function(a) {
    if(!stat[a]() && this.geom().name() !== "density"){
      stat[a](stat.linearAgg());
      aes[a] = "n. observations";
      this.aes(aes);
    }
  }, this);

};
Layer.prototype.data = function(data) {
  if(!arguments.length) { return this.attributes.data; }
  this.attributes.data = data;
  return this;
};

Layer.prototype.draw = function(layerNum) {
  var that = this,
      facet = this.plot().facet(),
      plot = this.plot(),
      aes = this.aes(),
      dtypes = this.dtypes(),
      stat = this.stat(),
      dtype,
      scaleType;
  
  function draw(sel) {
    var dlist = that.plot().dataList(that.plot().data()),
        divs = [];
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
      that.geom().draw()(s, d, i, layerNum);
    });
  }
  return draw;
};

// same as on plot, for when Layer has it's own data
// accepts output of Nest and returns an array of 
// {selector: [string], data: [array]} objects
Layer.prototype.dataList = DataList;

// same as on plot, for when Layer has it's own data
// Nests according to facets
Layer.prototype.nest = Nest;

Layer.prototype.geomNest = function() {

  // to be performed before calculating layer level geoms or scales
  var aes = this.aes(),
      plot = this.plot(),
      nest = d3.nest(),
      dtypes = plot.dtypes();
  // if(plot.xScale().single.scaleType() === "ordinal" && 
  //    plot.yScale().single.scaleType() === "ordinal"){
  //   throw "both x and y scales can't be ordinal for geom bar.";
  // }
  if(aes.group) {
    nest.key(function(d) { return d[aes.group]; });
  }
  if(aes.fill && dtypes[aes.fill][1] !== 'many') {
    nest.key(function(d) { return d[aes.fill]; });
  }
  if(aes.color && dtypes[aes.color][1] !== 'many') {
    nest.key(function(d) { return d[aes.color]; });
  }
  _.map(['x', 'y'], function(a) {
    if(plot[a + "Scale"]().single.scaleType() === "ordinal"){
      nest.key(function(d) { return d[aes[a]]; });
    }
  });
  return nest;
};


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
    aes: null,
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
    size: d3.functor(30), 
    shape: d3.functor('circle'),
    xAdjust: false,
    yAdjust: false,
    alphaRange: [0.1, 1],
    sizeRange: [10, 100],
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
  // explicitly declare which attributes get a basic
  // getter/setter
  var getSet = ["opts", "theme", "margins", 
    "width", "height", "xAdjust", "yAdjust", 
    'colorRange', 'sizeRange',
    'fillRange',
    "alphaRange"];

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
        layer = ggd3.layer()
                      .aes(this.aes())
                      .data(this.data())
                      .plot(this)
                      .geom(l);

        this.attributes.layers.push(layer);
      } else if ( l instanceof ggd3.layer ){
        // user specified layer
        if(!l.data()) { 
          l.data(this.data()).dtypes(this.dtypes()); 
        } else {
          l.ownData(true);
        }
        if(!l.aes()) { l.aes(this.aes()); }
        l.plot(this);
        this.attributes.layers.push(l);
      } else if (l instanceof ggd3.geom){
        var g = l;
        l = ggd3.layer()
                .aes(this.aes())
                .data(this.data())
                .plot(this)
                .geom(g);
      }
    }, this);
  } else if (layers instanceof ggd3.layer) {
    if(!layers.data()) { 
      layers.data(this.data()).dtypes(this.dtypes()); 
    } else {
      layers.ownData(true);
    }
    if(!layers.aes()) { layers.aes(this.aes()); }
    this.attributes.layers.push(layers.plot(this));
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
  data = ggd3.tools.unNest(data);
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
    if(!l.ownData()) { l.dtypes(this.dtypes())
                        .data(this.data())
                        .aes(this.aes()); }
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
  _.each(this.layers(), function(layer) {
    layer.aes(aes);
  });
  this.attributes.aes = aes;
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

Plot.prototype.draw = function() {
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
  function draw(sel) {
    updateFacet(sel);
    // reset nSVGs after they're drawn.
    that.facet().nSVGs = 0;

    // get the number of geom classes that should
    // be present in the plot
    var classes = _.map(_.range(that.layers().length),
                    function(n) {
                      return "g" + (n);
                    });

    _.each(that.layers(), function(l, i) {
      l.draw(i)(sel);
      sel.selectAll('.geom')
        .filter(function() {
          var cl = d3.select(this).node().classList;
          return !_.contains(classes, cl[1]);

        })
        .transition().style('opacity', 0).remove();
    });
    // if any of the layers had a jitter, it has
    // been added to each facet's dataset
    if(_.any(chart.layers(), function(l) {
      return l.position() === "jitter";
    })){ that.hasJitter = true; }
  }
  return draw;
};

Plot.prototype.nest = Nest;
// returns array of faceted objects {selector: s, data: data} 
Plot.prototype.dataList = DataList;

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
    opts: {},
  };
  // store passed object
  this.attributes = attributes;
  var getSet = ["aesthetic", "plot", "orient", "position", "opts"];
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
    this.attributes.scale.rangeRoundBands(range, 0.1, 0.1);
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
  var aes = this.aes(),
      that = this,
      facet = this.facet(),
      layer = this.layers()[0],
      nest = layer.geomNest(), 
      stat = layer.stat(),
      geom = layer.geom(),
      domain,
      data = that.dataList(that.data()),
      scale;

  that.globalScales = globalScales.filter(function(s) {
    return _.contains(_.keys(aes), s);
  });
  that.freeScales = [];
  _.each(['x', 'y'], function(s) {
    if(!_.contains(['free', 'free_' + s], facet.scales()) ){
      that.globalScales.push(s);
    } else {
      that.freeScales.push(s);
    }
  });
  nest.rollup(function(d) {
    return stat.compute(d);
  });
  // each facet's data rolled up according to stat
  data = _.map(data, function(d) {
      d.data = ggd3.tools.unNest(nest.entries(d.data) );
      return d;
  });

  // free scales
  if(!_.isEmpty(that.freeScales)){
    _.map(data, function(d) {
      // data is now nested by facet and by geomNest
      _.map(that.freeScales, function(k){
        scale = that[k+ "Scale"]()[d.selector];
        if(_.contains(linearScales, 
           scale.scaleType()) ){
          scale.domain(geom.domain(d.data, k));
        } else {
          // gotta find a way to sort these.
          scale.domain(_.unique(_.pluck(d.data, aes[k])));
        }
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
    if(_.contains(linearScales, scale.scaleType())) {
      if(_.contains(globalScales, g)){
        // scale is fill, color, alpha, etc.
        // with no padding on either side of domain.
        domain = ggd3.tools.linearDomain(
                    _.flatten(
                      _.map(data, function(d) {
                        return d.data;
                      })), aes[g]);
        scale.domain(domain);
        if(_.contains(linearScales, scale.scaleType()) ){
          scale.range(that[g + 'Range']());
        }
      } else {
        // data must be delivered to geom's domain as faceted,
        // otherwise aggregates will be calculated on whole dataset
        // rather than facet. Here we're looking for max facet domains.
        domain = _.map(data, function(d) {
          return geom.domain(d.data, g);
        });
        domain = [_.min(_.map(domain, first)) ,
        _.max(_.map(domain, second))];
        scale.domain(domain);
      }
    } else {
      scale.domain(
              _.unique(
                _.pluck(
                  _.flatten(
                    _.map(data, 'data')), aes[g])));
    }
    for(var s in scale._userOpts.scale){
      if(scale.scale().hasOwnProperty(s)){
        scale.scale()[s](scale._userOpts.scale[s]);
      }
    }
    if(_.contains(globalScales, g)) {
      var aesScale = _.bind(function(d) {
        return this.scale()(d[aes[g]]);
      }, scale);
      that[g](aesScale);
    }
  });
};

Plot.prototype.setScales = SetScales;

// 
function Histogram(spec) {
  if(!(this instanceof Geom)){
    return new Histogram(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "histogram",
    stat: "bin",
    nbins: 30
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Histogram.prototype = new Geom();
  
Histogram.prototype.constructor = Histogram;

Histogram.prototype.domain = function(data, a) {
  var layer   = this.layer(),
      plot    = layer.plot(),
      aes     = layer.aes(),
      extent  = d3.extent(_.pluck(data, aes[a])),
      range   = extent[1] - extent[0];

  // histogram always extends both ways
  if(range === 0){
    extent[0] -= 1;
    extent[1] += 1;
  }
  extent[0] -= 0.1 * range;
  extent[1] += 0.1 * range;
  return extent;
};


Histogram.prototype.draw = function(){

  var s     = this.setup(),
      that  = this;

  function draw(sel, data, i, layerNum) {

    var scales = that.scalesAxes(sel, s, data.selector, layerNum,
                                 true, true);

    var n, d;
    if(s.aes.x) {
      n = 'x';
      d = 'y';
    } else {
      n = 'y';
      d = 'x';
    }
    data = s.nest
            .rollup(function(d) {
              out = {};
              _.map(['color', 'group'], function(a) {
                if(s.aes[a]){
                  out[s.aes[a]] = d[0][s.aes[a]];
                }
              });
              out.data = _.pluck(d, s.aes.x || s.aes.y);
              return out;
            })
            .entries(data.data);
    

    var max = _.max(_.map(data, function(d) {
      return _.max(_.map(d.data, function(v) { return v[1]; }));
    }));

    scales[d].scale().domain([-max*0.05, max*1.1]).nice();

    ggd3.tools.removeElements(sel, layerNum, "rect");

  }
  return draw;
};

ggd3.geoms.histogram = Histogram;
// 
function Abline(spec) {
  Geom.apply(this);
  var attributes = {
    name: "abline",
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

Abline.prototype.constructor = Abline;

ggd3.geoms.abline = Abline;
// 
function Bar(spec) {
  if(!(this instanceof Geom)){
    return new Bar(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "bar",
    stat: "count",
    position: "dodge",
    lineWidth: 1,
    offset: 'zero',
    groupSum: 0,
    stackSum: 0,
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

Bar.prototype.domain = function(data, a) {
  // data passed here have been computed and 
  // separated by facet if not fixed.
  // all that is required is the stacked or dodged
  // values
  var layer = this.layer(),
      plot = layer.plot(),
      aes = layer.aes(),
      position = layer.position() || this.position(),
      valueVar = aes[a] ? aes[a]: "n. observations",
      group, ord,
      groupSum, stackSum;

  // I need the ordinal axis variable
  // and group axis variable to do this.
  group = aes.fill || aes.color || aes.group;
  ord = a === "x" ? aes.y: aes.x;
  stackSum = _.mapValues(_.groupBy(data, function(d) {
    return d[ord];
  }), function(v, k) {
    return _.reduce(_.pluck(v, valueVar), function(a,b) {
      return a + b;
    });
  });
  stackSum = d3.extent(_.map(stackSum, function(v, k) { return v; }));
  groupSum = d3.extent(data, function(d) {
    return d[valueVar];
  });
  this.stackSum(stackSum);
  this.groupSum(groupSum);

  stackSum[0] = 0;
  groupSum[0] = 0;
  stackSum[1] *= 1.1;
  groupSum[1] *= 1.1;
  return position === "stack" ? stackSum: groupSum;
};

Bar.prototype.draw = function() {
  // bar takes an array of data, 
  // nests by a required ordinal axis, optional color and group
  // variables then calculates the stat and draws
  // horizontal or vertical bars.
  // stacked, grouped, expanded or not.
  // scales first need to be calculated according to output
  // of the stat. 
  var s     = this.setup(),
      that  = this;

  function draw(sel, data, i, layerNum) {

    var o, n, rb, 
        valueVar,
        groupOrd  = d3.scale.ordinal(),
        drawX     = true,
        drawY     = true;

    if(_.contains(['wiggle', 'silhouette'], that.offset()) ){
      if(s.plot.xScale().single.scaleType() === "ordinal"){
        // x is ordinal, don't draw Y axis
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
      if(s.plot.xScale().single.scaleType() === "ordinal"){
        _.mapValues(s.plot.yScale(), function(v, k) {
          v.domain([0,1]);
        });
      } else {
        _.mapValues(s.plot.xScale(), function(v, k) {
          v.domain([0,1]);
        });  
      }
    }


    var scales = that.scalesAxes(sel, s, data.selector, layerNum,
                                 drawX, drawY);
    data = data.data;


    // prep scales for vertical or horizontal use.
    // "o" is ordinal, "n" is numeric
    // width refers to scale defining rangeband of bars
    // size refers to scale defining its length along numeric axis
    // s and p on those objects are for size and position, respectively.
    if(scales.y.scaleType() === 'ordinal'){
      o = scales.y;
      n = scales.x;
      size = {s: "width", p:'x'};
      width = {s:"height", p: 'y'};
    } else {
      o = scales.x;
      n = scales.y;
      size = {s: "height", p: 'y'};
      width = {s: "width", p: 'x'};
    }


    s.nest.rollup(function(data) {
      return s.stat.compute(data);
    });
    rb = o.scale().rangeBand();
    valueVar = s.aes[size.p] || "n. observations";

    // some warnings about nesting with bars
    if(s.aes.fill && s.aes.group){
      console.warn("Doesn't make a lot of sense with bars to set" +
                   " aes.fill and aes.group. That's too many groupings." +
                   " Maybe write a custom geom and specify fewer aesthetics.");
    }

    ggd3.tools.removeElements(sel, layerNum, "rect");

    if(data.length){
      // calculate stat
      data = s.nest.entries(data);
      // get back to array so we can nest for stack
      data = ggd3.tools.unNest(data);
      // nest so we can pass to stack
      // but not necessary if we have no group
      if(s.group !== s.aes[width.p]){
        data = d3.nest().key(function(d) { return d[s.group];})
                  .entries(data);
        s.groups = _.pluck(data, 'key');
        // stack layout requires all layers have same # of groups
        // and sort each layer by group;
        data = ggd3.tools.fillEmptyStackGroups(data, s.aes[width.p]);
        var stack = d3.layout.stack()
                      .x(function(d) { return d[s.aes[width.p]]; })
                      .y(function(d) {
                        return d[valueVar]; })
                      .offset(that.offset())
                      .values(function(d) { 
                        return d.values; });
        data = _.flatten(_.map(stack(data),
                              function(d) {
                                return d.values ? d.values: [];
                              }));
        if(s.position === 'dodge') {
          // make ordinal scale for group
          groupOrd.rangeRoundBands([0, rb])
                  .domain(s.groups);
          rb = groupOrd.rangeBand();
        }
        if(s.position !== "dodge"){
          groupOrd = function(d) {
            return 0;
          };
        }
      }
    }

    var placeBar = function(d) {
      var p = o.scale()(d[s.aes[width.p]]);
      p += groupOrd(d[s.group]);
      return p;
    };

    // I think this is unnecessary.
    var calcSizeS = (function() {
      if(s.position === 'stack' && size.p === "y"){
        return function(d) {
          return s.dim.y - n.scale()(d.y);
        };
      }
      if(s.position === "stack"){
        return function(d) {
          return n.scale()(d.y);
        };
      }
      if(s.position === "dodge" && size.p === "y"){
        return function(d) {
          return s.dim.y - n.scale()(d.y); 
        };
      }
      return function(d) {
        return n.scale()(d[valueVar]); 
      };
    })();
    var calcSizeP = (function () {
      if(s.position === "stack" && size.p === "y"){
        return function(d) { 
          return n.scale()(d.y0 + d.y); 
          };
      }
      if(s.position === "stack"){
        return function(d) {
          return n.scale()(d.y0);
        };
      }
      if(s.position === "dodge" && size.p === "y") {
        return function(d) {
          return n.scale()(d.y);
        };
      }
      return function(d) {
        return 0;
      };
    } )();


    var bars = sel.select('.plot')
                  .selectAll('rect.geom.g' + layerNum)
                  .data(data);
    // add canvas and svg functions.
    function drawBar(rect) {
      rect.attr('class', 'geom g' + layerNum + ' geom-bar')
        .attr(size.s, calcSizeS)
        .attr(width.s, rb)
        .attr(size.p, calcSizeP)
        .attr(width.p , placeBar)
        .style('fill-opacity', s.alpha)
        .attr('fill', s.fill)
        .style('stroke', s.color)
        .style('stroke-width', that.lineWidth())
        .attr('value', function(d) { 
          return d[group] + "~" + d[s.aes[width.p]];
        });
    }

    bars.transition().call(drawBar);
    
    bars.enter()
      .append('rect')
      .style('fill-opacity', s.alpha)
      .attr('fill', s.fill)
      .style('stroke', s.color)
      .style('stroke-width', that.lineWidth())
      .attr(width.s, rb)
      .attr(width.p, placeBar)
      .attr(size.s, 0)
      .attr(size.p, function(d) {
        return size.p === "y" ? dim.y: 0;
      })
      .transition()
      .call(drawBar);

    bars.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }
  return draw;
};

ggd3.geoms.bar = Bar;

// 
function Box(spec) {
  if(!(this instanceof Geom)){
    return new Box(spec);
  }
  Geom.apply(this);
  var attributes = {
    name: "box",
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

Box.prototype.constructor = Box;

ggd3.geoms.box = Box;
// 
function Density(spec) {
  if(!(this instanceof Geom)){
    return new Density(spec);
  }
  Histogram.apply(this);
  var attributes = {
    name: "density",
    stat: "density",
    kernel: "epanechnikovKernel",
    smooth: 30,
    nPoints: 100,
    fill: false, // fill with same color?
    alpha: 0.4
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Density.prototype = new Histogram();
  
Density.prototype.constructor = Density;

Density.prototype.kde = function(kernel, x) {
  return function(sample) {
    return x.map(function(x) {
      return [x, d3.mean(sample, function(v) { return kernel(x - v); })];
    });
  };
};

Density.prototype.epanechnikovKernel = function(scale) {
  return function(u) {
    return Math.abs(u /= scale) <= 1 ? 0.75 * (1 - u * u) / scale : 0;
  };
};

Density.prototype.draw = function(){

  var s     = this.setup(),
      that  = this;

  function draw(sel, data, i, layerNum) {

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
    var line = d3.svg.line();
    line[n](function(v) { return scales[n].scale()(v[s.aes[n]]); } );
    line[d](function(v) { return scales[d].scale()(v[s.aes[d]]); } );
    // need to calculate the densities to draw proper domains.
    console.log(data);
    ggd3.tools.removeElements(sel, layerNum, "rect");
    var path = sel.select('.plot')
                  .selectAll('path.geom.g' + layerNum)
                  .data(data);
    path.transition()
        .attr('class', 'geom g' + layerNum + " geom-density")
        .attr('d', function(d) {
            return line(d.values);
        })
        .attr('stroke-width', that.lineWidth())
        .attr('stroke', function(d) {
          return s.color(d.values[0]); 
        });
    path.enter().append('path')
        .attr('class', 'geom g' + layerNum + " geom-density")
        .attr('d', function(d) {
            return line(d.values);
        })
        .attr('stroke-width', that.lineWidth())
        .attr('stroke', function(d) {
          return s.color(d.values[0]); 
        })
        .style('fill', function(d) {
          return s.color(d.values[0]);
        })
        .style('fill-opacity', that.alpha());
  }
  return draw;
};

ggd3.geoms.density = Density;
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
    lineWidth: 1,
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
  s.nest      = s.layer.geomNest();
  s.position  = s.layer.position();
  s.dim       = s.plot.plotDim();
  s.facet     = s.plot.facet();
  s.aes       = s.layer.aes();
  s.fill      = d3.functor(this.fill() || s.plot.fill());
  s.size      = d3.functor(this.size() || s.plot.size());
  s.alpha     = d3.functor(this.alpha() || s.plot.alpha());
  s.color     = d3.functor(this.color() || s.plot.color());

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

Geom.prototype.domain = function(data, a) {
  var layer   = this.layer(),
      plot    = layer.plot(),
      aes     = layer.aes(),
      extent  = d3.extent(_.pluck(data, aes[a])),
      range   = extent[1] - extent[0];

  // done if date
  if(_.contains(["date", "time"], plot.dtypes()[aes[a]][0]) ){
    return extent;
  }
  // point always extends both ways
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

ggd3.geom = Geom;

// 
function Hline(spec) {
  Geom.apply(this);
  var attributes = {
    name: "hline",
    stat: "identity",
    position: null,
    lineWidth: 1,
  };

  this.attributes = _.merge(this.attributes, attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

Hline.prototype.constructor = Hline;

ggd3.geoms.hline = Hline;
// 
function Path(spec) {
  Geom.apply(this);
  var attributes = {
    name: "path",
    stat: "identity",
    position: null,
    lineWidth: 1,
  };

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
    shape: "circle",
    stat: "identity",
    position: "identity",
    size: 20,
    subRangeBand: 0.5,
    subRangePadding: 0.5,
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
      aes = this.layer().aes();
  if(s.scaleType() === "ordinal" && groups){
    sub = d3.scale.ordinal()
                .rangeRoundBands([0, s.scale().rangeBand()], 
                                 this.subRangeBand(), 
                                 this.subRangePadding())
                .domain(groups);
    rb = sub.rangeBand();
  } else if(s.scaleType() === "ordinal") {
    sub = function() { 
      return s.scale().rangeBand() / 2; 
    };
    rb = s.scale().rangeBand()/2;
  } else {
    sub = function() { return 0;};
  }
  return function(d) {
    return s.scale()(d[aes[a]]) + 
      sub(d[group]) + 
      (d._jitter || 0) * rb;
  };
};

Point.prototype.draw = function() {

  var s     = this.setup(),
      that  = this,
      geom  = d3.superformula()
                .type(function(d) {
                  return d[aes.shape] || that.shape();
                })
                .size(function(d) {
                  return d[s.aes.size] || that.size();
                })
                .segments(10);
  function draw(sel, data, i, layerNum) {

    var scales = that.scalesAxes(sel, s, data.selector, layerNum,
                                 true, true);
    // get rid of wrong elements if they exist.
    ggd3.tools.removeElements(sel, layerNum, "path");
    var points = sel.select('.plot')
                  .selectAll('path.geom.g' + layerNum)
                  .data(s.stat.compute(data.data));
    

    // add canvas and svg functions.
    var positionX = that.positionPoint(scales.x, s.group, s.groups),
        positionY = that.positionPoint(scales.y, s.group, s.groups);

    function drawPoint(point) {

      point
        .attr('class', 'geom g' + layerNum + " geom-point")
        .attr('d', geom)
        .attr('transform', function(d) { 
          return "translate(" + positionX(d) + "," +
           positionY(d) + ")"; } )
        .attr('fill', s.fill)
        .style('stroke', s.color)
        .style('stroke-width', 1)
        .style('fill-opacity', s.alpha);
    }

    points.transition().call(drawPoint);
    points.enter().append('path').call(drawPoint);
    points.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }
  return draw;
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
    // add canvas and svg functions.

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
  Geom.apply(this);
  var attributes = {
    name: "vline",
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

Stat.prototype.compute = function(data) {
  var out = {},
      aes = this.layer().aes(),
      id = _.any(_.map(_.keys(aes), function(k){
            console.log(aes[k]);
              if(!this[k]()){ return null; }
              return this[k]()([]) === "identity";
            }, this));
  if(this.linearAgg() === "density"){
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
    return out;
  }
  if(this.linearAgg() === "bin"){
    
  }
  // most situations will need these two
  if(id){
    return data;
  }
  for(var a in aes){
    out[aes[a]] = this[a]()(_.pluck(data, aes[a]));
  }
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
// ugly hack? Most of this is ugly.
Stat.prototype.identity = function(arr) {
  return "identity";
};

Stat.prototype.density = function(arr) {
  // console.log(this);
  // var l = this.layer(),
  //     g = layer.geom(),
  //     k = g[g.kernel()](g.smooth());
  return 'density';
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
