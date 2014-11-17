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
function DataList() {
  // needs to work for plots and layers.
  // I think this should be cheap enought to not 
  // worry about executing a few times per draw.
  // it's a layer and doesn't have it's own data
  if((this instanceof ggd3.layer) && !this.ownData()) {
    this.data(this.plot().data());
  }
  // it's a layer and has it's own data
  if((this instanceof ggd3.layer) && this.ownData()){
    this.attributes.data = this.plot().nest(this.data());
  }
  var facet = (this instanceof ggd3.layer) ? this.plot().facet(): this.facet(),
      x = facet.x(),
      y = facet.y(),
      by = facet.by(),
      selector;
  if((x && !y) || (y && !x)){
    selector = x ? x + "-": y + "-";
    return _.map(this.data(), function(d) {
      return {selector: rep(selector + d.key),
        data: d.values};
    });

  } else if(x && y) {
    // loop through both levels
    data = [];
    _.each(this.data(), function(l1) {
      var selectX = x + "-" + l1.key;
      _.each(l1.values, function(l2) {
        var s = rep(y + "-" + l2.key + "_" + selectX);
        data.push({selector:s, data: l2.values});
      });
    });
    return data;
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
    titleProps: null,
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
  this.calculateMargins();
  that.xFacets = ["single"];
  that.yFacets = ["single"];
  // rules of faceting:
  // specify either x and y or an x or y with nrows or ncols
  if(!_.isNull(that.x())) {
    // x is always first nest
    that.xFacets = _.unique(_.map(data, function(d) {
      return d.key;
    }));
  }
  if(!_.isNull(that.y()) ){
    // if facet.y is specified, it might be the first or
    // second nest
    if(_.isNull(that.x()) ){
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

  function update(sel) {
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
  }
  return update;
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
      dim = this.plot().plotDim(),
      plot = this.plot(),
      x = selection.data()[0],
      addHeight = (rowNum === 0 || this.type() === "wrap") ? dim.y*that.titleProps()[1]:0,
      addWidth = colNum === 0 ? dim.x*that.titleProps()[0]:0,
      width = function() {
          return plot.width() + addWidth;
      },
      height = function() {
          return plot.height() + addHeight;
      },
      svg = selection
              .attr('id', function(d) {
                return that.id(d, rowNum);
               })
              .selectAll('svg.svg-wrap')
              .data([0]);

  svg
    .attr('width', width())
    .attr('height', height())
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
    .attr('width', width())
    .attr('height', height())
    .each(function(d) {
      that.makeTitle(d3.select(this), colNum, rowNum);
      var sel = d3.select(this).selectAll('.plot-svg')
                  .data([0]);
      sel.attr('x', addWidth)
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
  if(this.plot().xAdjust() || this.plot().yAdjust()){
    var clip = selection.selectAll('defs')
                .data([0]),
        that = this,
        id = that.id(x, y) + "-clip",
        dim = this.plot().plotDim();
    clip.select('.clip')
        .attr('id', id)
        .select('rect')
        .attr('width', dim.x)
        .attr('height', dim.y);
    clip.enter().insert('defs', "*")
        .append('svg:clipPath')
        .attr('class', 'clip')
        .attr('id', id)
        .append('rect')
        .attr('x', 0)
        .attr('y',0)
        .attr('width', dim.x)
        .attr('height', dim.y);
    selection.select('g.plot')
      .attr('clip-path', "url(#" + id + ")");
  }
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
Facet.prototype.makeCell = function(selection, x, y, ncols) {
  var margins = this.plot().margins(),
      dim = this.plot().plotDim(),
      that = this,
      gridClassX = (this.type()==="grid" && y!==0) ? " grid": "",
      gridClassY = (this.type()==="grid" && x!==(ncols-1)) ? " grid": "";

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
              .selectAll('svg.grid-title-x')
              .data([that.x() + " - " + that.xFacets[colNum]]);
  var ylab = selection
              .selectAll('svg.grid-title-y')
              .data([that.y() + " - " + that.yFacets[rowNum]]);
  xlab.enter().append('svg')
      .attr('class', 'grid-title-x')
      .each(function() {
        d3.select(this).append('rect')
          .attr('class', 'facet-label-x');
        d3.select(this).append('text');
      });
  ylab.enter().append('svg')
      .attr('class', 'grid-title-y')
      .each(function() {
        d3.select(this).append('rect')
          .attr('class', 'facet-label-y');
        d3.select(this).append('text');
      });
  if(that.type() === "grid"){
    addHeight = rowNum === 0 ? addHeight:0;
    if(rowNum===0){
      xlab.attr({ width: dim.x + addWidth,
            x: margins.left,
            y: margins.top,
            height: addHeight})
          .select('rect')
          .attr({width: dim.x, x: addWidth,
            height: addHeight});
      xlab.select('text')
          .attr({fill: 'black',
            opacity: 1,
            "font-size": 12,
            x: dim.x/2 + addWidth,
            y: addHeight*0.8,
            "text-anchor": 'middle'})
          .text(_.identity);
    } else {
      selection.select('.grid-title-x')
        .attr("height", 0)
        .select('text').text('');
    }
    if(colNum===0){
      ylab.attr({width: addWidth,
            y:margins.top + addHeight,
            x:margins.left})
          .select('rect')
          .attr({width: addWidth, height: dim.y});
      ylab.select('text')
          .attr({'fill': 'black',
              'opacity': 1,
              'font-size': 14,
              'x': addWidth,
              'y': dim.y/2 + addHeight,
              "text-anchor": 'middle',
              "transform": "rotate(-90 " + addWidth + ", " + (dim.y/2 + addHeight) + ")"})
          .text(_.identity);
    } else {
      selection.select('.grid-title-y')
        .attr({width:0}).select('text').text('');
    }
  } else {
    // add labels to wrap-style faceting.
    xlab.attr('y', margins.top)
        .attr('x', 0)
        .attr('height', addHeight)
        .select('rect').attr({height: addHeight,
        width: dim.x, y:0,
        x: margins.left + addWidth});
    xlab.select('text').attr({fill: 'black',
          opacity: 1,
          "font-size": 12,
          width: plot.width(),
          height: addHeight,
          x: plot.width()/2,
          y: addHeight*0.8,
          "text-anchor": 'middle'})
        .text(that.wrapLabel(rowNum, colNum));
    selection.select('.grid-title-y')
      .attr({width:0}).select('text').text('');
  }
  return selection.select('.plot-svg');
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

// aes is an object literal with 
// x, y, yintercept, xintercept, shape, size, 
// color, etc.
function Plot(aes) {
  var attributes = {
    data: null,
    layers: [],
    facet: new ggd3.facet(),
    xScale: {single: new ggd3.scale()}, 
    yScale: {single: new ggd3.scale()},
    colorScale: {single: new ggd3.scale()},
    sizeScale: {single: new ggd3.scale()},
    opts: {},
    theme: "ggd3",
    margins: {left:20, right:20, top:20, bottom:20},
    width: 400,
    height: 400,
    aes: null,
    legends: null, // strings corresponding to scales
    // that need legends or legend objects
    xAdjust: false,
    yAdjust: false,
    dtypes: {},
  };
  // aesthetics I might like to support:
// ["alpha", "angle", "color", "fill", "group", "height", "label", "linetype", "lower", "order", "radius", "shape", "size", "slope", "width", "x", "xmax", "xmin", "xintercept", "y", "ymax", "ymin", "yintercept"] 
  this.attributes = attributes;
  // if the data method has been handed a new dataset, 
  // dataNew will be true, after the plot is drawn the
  // first time, dataNew is set to false
  this.dataNew = true;
  // when cycling through data, need to know if 
  // data are nested or not.
  this.nested = false;
  // explicitly declare which attributes get a basic
  // getter/setter
  var getSet = ["opts", "theme", "margins", 
    "width", "height", "xAdjust", "yAdjust"];

  for(var attr in attributes){
    if((!this[attr] && 
       _.contains(getSet, attr))){
      this[attr] = createAccessor(attr);
    }
  }
}

function scaleConfig(type) {
  var scale;
  switch(type){
    case "x":
      scale = 'xScale';
      break;
    case "y":
      scale = 'yScale';
      break;
    case "color":
      scale = 'colorScale';
      break;
    case "size":
      scale = 'sizeScale';
      break;
  }
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

Plot.prototype.xScale = scaleConfig('x');

Plot.prototype.yScale = scaleConfig('y');

Plot.prototype.colorScale = scaleConfig('color');

Plot.prototype.sizeScale = scaleConfig('size');

Plot.prototype.layers = function(layers) {
  if(!arguments.length) { return this.attributes.layers; }
  if(_.isArray(layers)) {
    // allow reseting of layers by passing empty array
    if(layers.length === 0){
      this.attributes = layers;
      return this;
    }
    var layer;
    _.each(layers, function(l) {
      if(_.isString(l)){
        // passed string to get geom with default settings
        layer = new ggd3.layer()
                      .aes(this.aes())
                      .plot(this)
                      .geom(l);

        this.attributes.layers.push(layer);
      } else if ( l instanceof ggd3.layer ){
        // user specified layer
        this.attributes.push(l.ownData(true).plot(this));
      }
    }, this);
  }
  return this;
};

Plot.prototype.dtypes = function(dtypes) {
  if(!arguments.length) { return this.attributes.dtypes; }
  this.attributes.dtypes = _.merge(this.attributes.dtypes, dtypes);
  return this;
};

// custom data getter setter to pass data to layer if null
Plot.prototype.data = function(data) {
  if(!arguments.length) { return this.attributes.data; }
  // clean data according to data types
  // and set top level ranges of scales.
  // dataset is passed through once here.
  // must have passed a datatypes object in before.
  data = ggd3.tools.clean(data, this);
  // after data is declared, nest it according to facets.
  this.attributes.data = this.nest(data.data);
  this.dtypes(data.dtypes);
  this.nested = true;
  this.dataNew = true;
  return this;
};


Plot.prototype.facet = function(spec) {
  if(!arguments.length) { return this.attributes.facet; }
  var data;
  if(spec instanceof ggd3.facet){
    this.attributes.facet = spec.plot(this);
    if(this.nested){
      // unnest from old facets
      console.log('nested');
      data = ggd3.tools.unNest(this.data());
      // nest according to new facets
      this.attributes.data = this.nest(data);
    } else {
      console.log('not nested');
      this.attributes.data = this.nest(this.data());
    }
  } else {
    this.attributes.facet = new ggd3.facet(spec)
                                    .plot(this);
    if(this.nested){
      data = ggd3.tools.unNest(this.data());
      this.attributes.data = this.nest(data);
    } else {
      this.attributes.data = this.nest(this.data());
    }
  }
  this.nested = true;
  return this;
};

Plot.prototype.aes = function(aes) {
  if(!arguments.length) { return this.attributes.aes; }
  _.each(this.layers(), function(l) {
    if(_.isNull(l.aes())){
      l.aes(aes);
    }
  }, this);
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
  var that = this;
  // should the first layer be special? its stat and the top-level
  // data would be used to calculate the scale ranges.
  // or, if any of the geoms have 'identity' as the stat
  // use identity, otherwise use the stat summary.
  // get basic info about scales/aes;
  this.setScales();
  // set fixed/free domains
  this.setDomains();
  function draw(sel) {
    sel.call(that.facet().updateFacet());
    // kinda labored way to get rid of unnecessary facets
    // empty cells are nice to have so the axes are hung
    // consistently
    // var divs = [],
    //     facets = _.pluck(that.dataList(), "selector");
    // sel.selectAll('.plot-div')
    //   .each(function(d) {
    //     divs.push(d3.select(this).attr('id'));
    //   });
    // divs = divs.filter(function(d) { return !_.contains(facets, d);});
    // divs.forEach(function(d) {
    //   sel.select("#" + d).select('svg.plot-svg').selectAll('*').remove();
    // });

    // drawing layers

    _.each(that.layers(), function(l, i) {
      sel.call(l.draw(i));
    });
  }
  this.dataNew = false;
  return draw;
};


Plot.prototype.nest = function(data) {
  if(_.isNull(data)) { return data; }
  var nest = d3.nest(),
      that = this,
      facet = this.facet();
  if(!_.isNull(facet.x())){
    nest.key(function(d) { return d[facet.x()]; });
  }
  if(!_.isNull(facet.y())){
    nest.key(function(d) { return d[facet.y()]; });
  }
  if(!_.isNull(facet.by())){
    nest.key(function(d) { return d[facet.by()]; });
  }
  data = nest.entries(data);
  return data; 
};

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
    this.opts(opts);
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
  return this;
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
    this.attributes.scale.rangeRoundBands(range, 0);
  } else {
    this.attributes.scale.range(range);
  }
  return this;
};

Scale.prototype.domain = function(domain) {
  if(!arguments.length) { return this.attributes.domain; }
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
var aesMap = {
        x: 'xScale',
        y: 'yScale',
        color: 'colorScale',
        size: 'sizeScale',
      },
    scales = ['x', 'y', 'color', 'size'];

function SetScales() {

  // do nothing if the object doesn't have aes, data and facet
  // if any of them get reset, the scales must be reset
  if(!this.data() || !this.aes() || !this.facet()){
    console.log('not setting scales');
    return false;
  }
  // obj is a layer or main plot
  console.log('setting scales');
  var aes = this.aes(),
      that = this,
      facet = this.facet(),
      data = this.dataList(),
      dtype,
      settings,
      // gather user defined settings in opts object
      opts = _.mapValues(aesMap, function(v, k) {
        // there is a scale "single" that holds the 
        // user defined opts and the fixed scale domain
        return that[v]().single._userOpts;
      });

  function makeScale(d, i) {
    for(var a in aes){
      if(_.contains(scales, a)){
        // user is not specifying a scale.
        if(!(that[aesMap[a]]() instanceof ggd3.scale)){
          // get plot level options set for scale.

          dtype = that.dtypes()[aes[a]];
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
          that[aesMap[a]]()[d.selector] = scale;
          if(i === 0) {
            that[aesMap[a]]().single = scale;
          }
        } else {
          // copy scale settings, merge with default info that wasn't
          // declared and create for each facet if needed.
        } 
      }
    }
  }
  _.map(data, function(d,i) {return makeScale(d, i);});
  for(var a in aes) {
    // give user-specified scale settings to single facet
    that[aesMap[a]]().single._userOpts = _.cloneDeep(opts[a]);
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
                  scale: {rangeRoundBands: ""}};
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
  var s;
  switch(aesthetic) {
    case "x":
      s = xyScale(dtype);
      s.axis.position = "bottom";
      s.axis.orient = "bottom";
      return s;
    case "y":
      s = xyScale(dtype);
      s.axis.position = "left";
      s.axis.orient = "left";
      return s;
    case "color":
      return {type:"category10", 
            axis: {position:'none'},
            scale: {}};
    case "size":
      return {type: 'linear', 
             axis: {position:'none'},
             scale: {}};
  }
};
ggd3.tools.domain = function(data, rule, zero,
                             variable) {
  var extent, range;
  if(_.isUndefined(variable)){
    extent = d3.extent(data);
  } else {
    extent = d3.extent(_.pluck(data, variable));
  }
  if(!_.isUndefined(rule) && !_.isDate(extent[0]) ){
    range = Math.abs(extent[1] - extent[0]);
    if(rule === "left" || rule === "both"){
      extent[0] +=  0.1 * range;
    }
    if(rule === "right" || rule === "both"){
      extent[1] += 0.1 * range;
    }
  }
  return extent;
};

Plot.prototype.setDomains = function() {
  var aes = this.aes(),
      that = this,
      facet = this.facet(),
      layer = this.layers()[0],
      stat = layer.stat(),
      linearScales = ['log', 'linear', 'time', 'date'],
      domain,
      data,
      scale;
  for(var a in aes) {
    var scales = this[aesMap[a]]();
    if(facet.scales() !== "free_" + a &&
       facet.scales() !== "free"){
      data = ggd3.tools.unNest(this.data());
      if(_.contains(linearScales, scales.single.opts().type)){
        domain = ggd3.tools.domain(data, 'both', false, aes[a]);
      } else {
        // nest according ordinal axes, group, and color
        domain = _.unique(_.pluck(data, aes[a]));
      }
      for(scale in scales) {
        scales[scale].domain(domain);
      }
    } else {
      data = this.dataList();
      for(var d in data) {
        scale = scales[data[d].selector];
        if(_.contains(linearScales, scales.single.opts().type)){
          scale.domain(ggd3.tools.domain(_.pluck(data[d].data, aes[a])));
        } else {
          scale.domain(_.unique(_.pluck(data[d].data, aes[a])));
        }

      }
    }
  }
};
Plot.prototype.setScales = SetScales;


// 
function Bar(spec) {
  var attributes = {
    name: "bar",
  };

  this.attributes = _.merge(attributes, this.attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
}

Bar.prototype = new Geom();

Bar.prototype.draw = function() {
  // bar takes an array of data, 
  // nests by a required ordinal axis, optional color and group
  // variables then calculates the stat and draws
  // horizontal or vertical bars.
  // stacked, grouped, expanded or not.
  // scales first need to be calculated according to output
  // of the stat. 
  var layer = this.layer(),
      plot = layer.plot(),
      facet = plot.facet(),
      margins = plot.margins(),
      aes = layer.aes(),
      that = this;
  function draw(sel, data, i) {
    var id = (facet.type() === "grid" || 
              facet.scales()==="fixed") ? "single":sel.attr('id'),
        x = plot.xScale()[id],
        y = plot.yScale()[id];
    // drawing and positioning axes probably shouldn't be on
    // the geom
    // but here, we're drawing
    if(i === 0){
      sel.select('.x.axis')
        .attr("transform", "translate(" + x.positionAxis() + ")")
        .transition().call(x.axis);
      sel.select('.y.axis')
        .attr("transform", "translate(" + y.positionAxis() + ")")
        .transition().call(y.axis);
    }
    data = that.stat(data);
    var bars = sel.select('.plot')
                  .selectAll('rect')
                  .data(data);
    // add canvas and svg functions.
    // bars.enter().append('rect')
    //     .attr('class', 'geom-bar');    
    // sel is svg, data is array of objects


  }
  return draw;
};

Bar.prototype.defaultStat = function() {
  return new ggd3.stats.count();
};

ggd3.geoms.bar = Bar;

// Base geom from which all geoms inherit
function Geom(aes) {
  var attributes = {
    layer:     null,
    stat: null,
  };
  this.attributes = attributes;
  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
}
Geom.prototype.defaultStat = function() {
  return null;
};

ggd3.geom = Geom;


function Layer(aes) {
  var attributes = {
    plot:     null,
    data:     null,
    geom:     null,
    stat:     null, // identity, sum, mean, percentile, etc.
    position: null, // jitter, dodge, stack, etc.
    aes:      null,
    ownData: false,
  };
  this.attributes = attributes;
  var getSet = ["plot", "data", "position", "aes"];
  for(var attr in this.attributes){
    if(!this[attr] && _.contains(getSet, attr) ){
      this[attr] = createAccessor(attr);
    }
  }
}

Layer.prototype.ownData = function(tf) {
  if(!arguments.length) { return this.attributes.ownData; }
  // eventually, when called, this may
  // nest the data appropriately
  // ie.
  // this.attributes.data = this.plot().nest(this.data());
  this.attributes.ownData = tf;
  return tf;
};

Layer.prototype.stat = function(stat) {
  if(!arguments.length) { return this.attributes.stat; }
  this.attributes.stat = stat;
  // usually, default stat is accepted from geom
  // but you can choose a stat and get a default geom
  if(_.isNull(this.attributes.geom)) {
    this.attributes.geom = stat.defaultGeom();
  }
  return this;
};

Layer.prototype.draw = function(i) {
  var that = this,
      facet = this.plot().facet();
  function draw(sel) {

    var dataList = that.ownData() ? that.dataList():that.plot().dataList(),
        divs = [];
    sel.selectAll('.plot-div')
      .each(function(d) {
        divs.push(d3.select(this).attr('id'));
      });
    _.each(divs, function(id){
      var s = sel.select("#" + id),
          d = dataList.filter(function(d) {
            return d.selector === id;
          });
      s.call(that.geom().draw(), d|| [], i);
    });
  }
  return draw;
};
Layer.prototype.dataList = DataList;

Layer.prototype.geom = function(geom) {
  if(!arguments.length) { return this.attributes.geom; }
  geom = new ggd3.geoms[geom]()
                .layer(this);
  if(_.isNull(this.attributes.stat)) {
    this.attributes.stat = geom.defaultStat();
  }
  this.attributes.geom = geom;
  return this;
};

ggd3.layer = Layer;

// 
function Point(spec) {
  var attributes = {
    name: "point",
  };

  this.attributes = _.merge(attributes, this.attributes);

  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
}
Point.prototype = new Geom();

Point.prototype.draw = function() {
  // bar takes an array of data, 
  // nests by a required ordinal axis, optional color and group
  // variables then calculates the stat and draws
  // horizontal or vertical bars.
  // stacked, grouped, expanded or not.
  // scales first need to be calculated according to output
  // of the stat. 
  var layer = this.layer(),
      plot = layer.plot(),
      facet = plot.facet(),
      margins = plot.margins(),
      aes = layer.aes(),
      that = this;
  function draw(sel, data, i) {
    var id = (facet.type() === "grid" || 
              facet.scales()==="fixed") ? "single":sel.attr('id'),
        x = plot.xScale()[id],
        y = plot.yScale()[id];
    // drawing and positioning axes probably shouldn't be on
    // the geom
    // but here, we're drawing
    if(i === 0){
      sel.select('.x.axis')
        .attr("transform", "translate(" + x.positionAxis() + ")")
        .transition().call(x.axis);
      sel.select('.y.axis')
        .attr("transform", "translate(" + y.positionAxis() + ")")
        .transition().call(y.axis);
    }
    data = that.stat(data);
    var bars = sel.select('.plot')
                  .selectAll('circle')
                  .data(data);
    // add canvas and svg functions.
    // bars.enter().append('rect')
    //     .attr('class', 'geom-bar');    
    // sel is svg, data is array of objects


  }
  return draw;
};

Point.prototype.defaultStat = function() {
  return new ggd3.stats.identity();
};

ggd3.geoms.point = Point;




function Stat() {
  var attributes = {
  };
  this.attributes = attributes;
  for(var attr in this.attributes){
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
      this[attr] = createAccessor(attr);
    }
  }
  return this;
}
// bin
function Bin() {

}
Bin.prototype = new Stat();
Bin.prototype.compute = function(data, nbins) {

};
Bin.prototype.name = function() {
  return "bin";
};
ggd3.stats.bin = Bin;


// count
function Count() {

}
Count.prototype = new Stat();
Count.prototype.compute = function(data) {
  return data.length;
};
Count.prototype.name = function() {
  return "count";
};
Count.prototype.defaultGeom = function() {
  return new ggd3.geom.bar();
};
ggd3.stats.count = Count;

// sum

// mean

// median

// max

// min 

// identity
function Identity() {

}
Identity.prototype = new Stat();
Identity.prototype.compute = function(data) {
  return data;
};
Identity.prototype.name = function() {
  return "identity";
};
Identity.prototype.defaultGeom = function() {
  return new ggd3.geom.point();
};
ggd3.stats.identity = Identity;


function unNest (data) {
  // recurse and flatten nested dataset
  // this means no dataset can have a 'values' column
  if(_.isNull(data)){ return data; }
  var branch = _.all(_.map(data, function(d){
    return d.hasOwnProperty('values');
  }));
  if(branch === false) { 
    return data; 
  }
  var vals = _.flatten(
              _.map(data, function(d) { return d.values; })
             );
  return ggd3.tools.unNest(vals);
}

ggd3.tools.unNest = unNest;
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
