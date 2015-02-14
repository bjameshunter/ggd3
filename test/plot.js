var vows = require('vows'),
    $ = require('../node_modules/jquery/dist/jquery.js'),
    assert = require('assert'),
    d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    data = require('../data/data.js'),
    suite = vows.describe('ggd3.plot'),
    baseball, 
    mtcars,
    iris,
    bullet,
    ranefs,
    ranefsPointY;

function countElements(id, selector, length) {
  assert.equal(d3.select(id).selectAll(selector)[0].length, length);
}
suite.addBatch({
  // a context, these are run in parallel/asynch.
  // contexts contain topics, which are run in sequence.
  'mtcars': {
    topic: function() {
      var div = d3.select('body').append('div')
                  .attr('id', 'mtcars');
      mtcars = ggd3.plot()
                .layers(['point', ggd3.geoms.smooth().method('lm')])
                .aes({x:'wt', y:'mpg', fill:'gear', color:'gear'})
                .facet({x:'cyl', scales:'free', ncols: 3})
                .data(data.mtcars_data())
      mtcars.draw(div);
      return mtcars;
    },
    "should have 32 circles": function(topic){
      countElements('#mtcars', 'circle.geom', 32);
    },
    "should have 6 smooth lines": function(topic){
      countElements("#mtcars", "path.geom.geom-smooth", 6)
    },
    "should have 6 ribbons": function(topic){
      countElements("#mtcars", "path.geom.geom-smooth-error", 6)
    },
    "should have 3 facets": function(topic) {
      countElements("#mtcars", ".plot-svg", 3);
    },
    "should properly id dtypes": function(topic) {
      var dtypes = {
        wt: ['number', 'many'],
        mpg: ['number', 'many'],
        gear: ['number', 'few'], 
      };
      assert.deepEqual(topic.dtypes(), dtypes);
    },
    "changing facet, smooth loess":{
      topic: function(topic1){
        topic1
          .facet({x:'am', ncols: 2, scales: 'free'})
          .layers()[1].method('loess');
        topic1.draw(d3.select('#mtcars'));
        return topic1;
      },
      "should have 4 lines, no ribbon": function(topic) {
        setTimeout(function(){
          countElements("#mtcars", ".geom-smooth", 4);
          countElements("#mtcars", ".geom-smooth-error", 0);
        }, 500);
      }
    }
  },
  "baseball": {
    topic: function() {
    var layers = ggd3.layer()
              .geom(ggd3.geoms.bar()
                      .offset('expand'))
              .position('stack')
              .stat({x:'mean', alpha: 'max'}),
        facet = ggd3.facet({titleSize:[0,0], vShift:40}),
        aes = {y: "team", x:'batting',
                    fill: "decade",
                    alpha: "hr"};
    baseball = ggd3.plot()
                .width(300)
                .height(800)
                .color('white')
                .rangeBand(0)
                .rangePadding(0)
                .subRangePadding(0.2)
                .layers(layers)
                .yGrid(false)
                .xGrid(false)
                .margins({right: 50, top:0})
                .xScale({axis: {ticks:4, position: 'top',
                                orient:'top'},
                                offset:45})
                .yScale({axis:{position:"right",
                              orient: "right"},
                              offset:45})
                .aes(aes)
                .facet(facet)
                .data(data.baseball_data());
      var div = d3.select('body').append('div')
                      .attr('id', 'baseball');
      baseball.draw(div);
      return baseball;
    },
    "should have 34 teams on y axis": function(topic) {
      setTimeout(function(){
        var domainLength = topic.yScale().single.domain().length;
        assert.equal(domainLength, 34);
      }, 500);
    },
    "should be four plots": function(topic) {
      countElements("*", '.plot', 4);
    },
    "should have 90 rectangles": function(topic) {
      setTimeout(function() {
        countElements('#baseball', 'rect.geom', 90);
      }, 1200)
    }, 
    "changing stack to dodge, stat x median": {
      topic: function(topic1){
        var layers = ggd3.layer()
                  .geom(ggd3.geoms.bar())
                  .position('dodge')
                  .stat({x:'median', alpha: 'min'});
        topic1.layers([])
          .layers(layers)
          .xScale(null)
          .xScale({axis: {ticks:4, position: 'top',
                              orient:'top'},
                              offset:45})
          .draw(d3.select('#baseball'));
        return topic1;
      },
      "should have 90 rectangles height 7": function(topic){
        var rects = d3.select('#baseball').selectAll('rect.geom');
        var h = [];
        rects.each(function(d) {
          h.push(d3.select(this).attr('height'));
        });
        assert.equal(_.all(h, function(d) { return d==="7";}), true);
      }
    }
  } 
})
.addBatch({
  "iris": {
    topic: function() {
      var div = d3.select('body').append('div')
                  .attr('id', 'iris');
      var layers = [ggd3.geoms.histogram()
                      .frequency(false),
                    ggd3.geoms.density()
                      .kernel('gaussianKernel'),
                    ggd3.layer()
                      .geom(ggd3.geoms.density()
                          .kernel('gaussianKernel')
                      .color('black'))
                      .aes({fill:null,
                            color:null })
                    ];
      var facet = ggd3.facet({titleSize: [0,0]});
      iris = ggd3.plot()
                .aes({x:"Sepal.Length", fill:"Species", color:"Species"})
                .margins({left: 80})
                .facet(facet)
                .layers(layers)
                .yScale({axis:{
                  ticks: 4,
                }})
      return iris;
    },
    "1 plot": function(topic) {
      setTimeout(function() {
        countElements('*', '.plot', 1);
      }, 300)
    },
    "47 bars, 4 densities": function(topic){
      setTimeout(function() {
        var id = "#iris";
        countElements(id, '.geom-bar', 47);
        countElements(id, '.geom.g3.geom-density', 3);
        countElements(id, '.geom.g3.geom-density', 1);
      }, 400)
    },
  }
})
.addBatch({
  "bullet": {
    topic: function() {
      var div = d3.select('body').append('div')
                  .attr('id', 'bullet');
      var mean = ggd3.geoms.hline()
                    .color('black')
                    .lineType("none")
                    .lineWidth(3)
                    .alpha(0.5);
      var max = ggd3.geoms.hline()
                    .color('black')
                    .lineType("none")
                    .lineWidth(3)
                    .alpha(0.5);
      var min = ggd3.geoms.hline()
                    .color('black')
                    .lineType("none")
                    .lineWidth(3)
                    .alpha(0.5);
      var area1 = ggd3.layer().geom(ggd3.geoms.area()
                                      .alpha(0.5))
      var area2 = ggd3.layer().geom(ggd3.geoms.area()
                                      .alpha(0.3))
      var area3 = ggd3.layer().geom(ggd3.geoms.area()
                                      .alpha(0.1))
      var bar = ggd3.geoms.bar()
                  .subRangePadding(0.4)
                  .subRangeBand(0.7)
                  .alpha(1);
      var layers = [ggd3.layer()
                      .geom(bar)
                      .aes({x:'cyl', y:'mpg', fill:'gear'})
                      .stat({y:'median'}),
                    ggd3.layer().geom(mean).stat({y: 'mean'}),
                    ggd3.layer().geom(max).stat({y: 'max'}),
                    ggd3.layer().geom(min).stat({y: 'min'})
                    ];

      var facet = {titleSize:[0, 0]};
      var bullet = ggd3.plot()
                    .width(400)
                    .height(400)
                    .aes({x:'cyl', y:'mpg', fill:'gear'})
                    .yScale({axis:{ position:'left', 
                            orient:'left'},
                            scale: {domain:[0, 40]}})
                    .xScale({axis: {ticks: 4, position: "top"},
                            offset: 25})
                    .dtypes({
                      cyl: ['number', 'few', ',.0d'],
                      gear:['number', 'few', ',.0d'],
                      mpg: ['number', 'many', ',.1f']
                    })
                    .rangePadding(0)
                    .facet(facet)
                    .rangeBand(0.1)
                    .margins({top: 50, bottom:10, left:50, right:10})
                    .layers(layers);

      function makeOneZero(o, v) {
        o2 = _.clone(o);
        o2[v] = 0;
        return [o, o2];
      }
      var data = data.mtcars_data();
      areaData = d3.nest()
                        .key(function(d) { return d.cyl; })
                        .key(function(d) { return d.gear; })
                        .rollup(function(d) {
                          var o = {},
                          arr = _.pluck(d, "mpg"),
                          max = _.filter(d, function(r) {
                            return r.mpg === d3.max(arr);
                          })[0],
                          min = _.filter(d, function(r) {
                            return r.mpg === d3.min(arr);
                          })[0],
                          mean = d[0];
                          o.max = makeOneZero(max, 'mpg')
                          o.min = makeOneZero(min, 'mpg');
                          o.mean = makeOneZero(mean, 'mpg');
                          return o;
                        })
      bullet.data(data);
      areaData = bullet.unNest(areaData.entries(data));
      console.log(areaData[0]);
      area1.data(_.flatten(_.pluck(areaData, 'min')));
      area2.data(_.flatten(_.pluck(areaData, 'mean')));
      area3.data(_.flatten(_.pluck(areaData, 'max')));
      bullet.layers([area1, area2, area3]).draw(div);
      return bullet;
    },
    "24 area, 8 bars": function(topic) {
      setTimeout(function() {
        countElements('#bullet', '.geom-area', 24);
        countElements('#bullet', '.geom-bar', 8);
      }, 500);
    }
  },
  "bar with error": {
    topic: function() {
      var div = d3.select('body').append('div')
                  .attr('id', 'mn-coefs'),
          lr = ggd3.layer().geom(ggd3.geoms.linerange()
                                 .lineWidth(3)
                                 .gPlacement('append'))
                .aes({xmin: function(d) {
                              return d.coef - 2*d.se;
                            },
                      xmax: function(d) {
                        return d.coef + 2*d.se;
                      }});
      var layers = [ggd3.layer().geom(ggd3.geoms.bar()
                                      .lineWidth(0)
                                      .color('blue'))
                        .stat({x: 'identity'}), lr];

      var facet = ggd3.facet({x:'coefficient', ncols: 2, type:'grid'});

      ranefs = ggd3.plot()
                  .facet(facet)
                  .width(300)
                  .xScale({axis: {ticks: 5}, label: ""})
                  .rangePadding(0)
                  .height(1000)
                  .xGrid(false)
                  .margins({top:0, bottom:30, left:130, right:10})
                  .layers(layers)
                  .aes({y:'county', x: "coef"});  
      var data = data.MN_ranefs_data();
      var sorted = _.filter(data, 
                      function(d) { return d.coefficient === "intercept";})
      sorted = _.map(sorted.sort(function(a,b) {
        return b.coef - a.coef;
      }), "county");
      sorted.reverse();

      chart.data(data)
           .yScale({axis:{ticks:4}, 
                    scale: {domain: sorted}, 
                    label: ""})
           .draw(div);
      return chart;
    },
    "170 bars and 170 error bars": function(topic){
      setTimeout(function() {
        countElements('#mn-coefs', '.geom-bar', 170)
        countElements('#mn-coefs', '.geom-linerange', 170)
      }, 400)
    }
  },
  "point with y-error": {
    topic: function() {
      var div = d3.select('body')
                    .append('div')
                    .attr('id', 'mn-points-y'),
          lr = ggd3.layer().geom('linerange')
                .aes({ymin: function(d) {
                              return d.coef - 2*d.se;
                            },
                      ymax: function(d) {
                        return d.coef + 2*d.se;
                      }});

      var layers = [ggd3.layer().geom(ggd3.geoms.point().color('none')), 
                            lr];

      var facet = ggd3.facet({x:'coefficient', ncols: 2, type:'wrap'});

      var ranefsPointY = ggd3.plot()
                    .facet(facet)
                    .width(500)
                    .xScale({axis: {ticks: 5}, 
                            label: "Uranium (ppm)",
                            offset: 30})
                    .height(200)
                    .margins({top:0, bottom:100, left:130, right:10})
                    .layers(layers)
                    .aes({y:'coef', x: "Uppm"});  
      var data = data.MN_ranefs_data();
      ranefsPointY.data(data)
           .yScale({axis:{ticks:4}})
           .draw(div);

    },
    "170 points and 170 linerange":function(topic) {
      setTimeout(function() {
        countElements("#mn-points-y", ".geom-point", 170);
        countElements("#mn-points-y", ".geom-linerange", 170);
      }, 300);
    }
  },
  "point with x-y-error": {
    topic: function() {
      var div = d3.select('body')
                  .append('div')
                  .attr('id', 'mn-points-xy'),
          lr = ggd3.layer().geom(ggd3.geoms.linerange()
                                    .alpha(0.2))
                .aes({xmin: function(d) {
                              return d.intercept_coef - 2*d.intercept_se;
                            },
                      xmax: function(d) {
                        return d.intercept_coef + 2*d.intercept_se;
                      }}),
          lr2 = ggd3.layer().geom(ggd3.geoms.linerange()
                                    .alpha(0.2))
                .aes({ymin: function(d) {
                              return d.floor_coef - 2*d.floor_se;
                            },
                      ymax: function(d) {
                        return d.floor_coef + 2*d.floor_se;
                      }});


      var layers = [ggd3.layer().geom(ggd3.geoms.point().color('none')), 
                            lr, lr2];

      var facet = ggd3.facet();

      var chart = ggd3.plot()
                    .facet(facet)
                    .width(500)
                    .xScale({axis: {ticks: 5}, 
                            label: "Intercept +/- 2 se"})
                    .yScale({axis:{ticks:4},
                            label: "Floor coefficient +/- 2 se"})
                    .height(500)
                    .margins({top:0, bottom:100, left:130, right:10})
                    .layers(layers)
                    .aes({y:'floor_coef', 
                         x: "intercept_coef", group: "county"});
      data = data.MN_ranefs_data();
      chart.data(data)
           .draw(div);
      return chart;
    },
    "85 points and 170 linerange": function(topic) {
      setTimeout(function() {
        countElements("#mn-points-xy", ".geom-point", 85);
        countElements("#mn-points-xy", ".geom-linerange", 170);
      })
    }
  }
})
.addBatch({
  "nelplo": {
    topic: function() {
      var div = d3.select('body')
                  .append('div')
                  .attr('id', 'nelplo'),
          chart, data;

      var facet = {x: 'group', nrows: 3, scales: 'free'};
      var p75 = function(d) { return d3.quantile(d, 0.75); }
      var p25 = function(d) { return d3.quantile(d, 0.25); }
      var l1 = ggd3.geoms.hline()
                  .lineType('3,1')
                  .lineWidth(1)
                  .alpha(1);
      var l2 = ggd3.geoms.hline()
                  .lineType('3,1')
                  .lineWidth(1)
                  .alpha(1);
      var sd = function(arr) {
        var m = d3.mean(arr);
        return Math.sqrt(d3.mean(arr.map(function(d) { 
          return Math.pow(d - m, 2); })));
      };

      var layers = [ggd3.geoms.line()
                      .lineWidth(1)
                      .lineType(null)
                      .alpha(0.8)
                      .interpolate('step'), 
                    ggd3.layer().geom(l1)
                      .stat({y: p75}),
                    ggd3.layer().geom(l2)
                    .stat({y: p25}),
                    ggd3.geoms.point()
                      .color(d3.functor(null))
                      .alpha(d3.functor(0))
                      .size(4),
                    ggd3.layer()
                      .geom(ggd3.geoms.ribbon()
                            .color('black'))
                      .aes({ymin: sd, ymax: sd, fill: 'variable'})
                      ];

      var chart = ggd3.plot()
                    .layers(layers)
                    .width(300)
                    .dtypes({date: ['date', 'many', "%Y-%m"]})
                    .facet(facet)
                    .height(150)
                    .colorScale({type:'category20'})
                    .fillScale({type:'category20'})
                    .yScale({axis: {ticks: 4, position:'left',
                            orient: "left"}})
                    .margins({top: 5, bottom:30, left:50, right:5})
                    .xScale({axis: {ticks: 4, position: "bottom",
                            orient: "bottom"}})
                    .aes({x:'date', y:'value', color:'variable', fill: 'variable'})
      data = data.nelplo_data();
      chart.data(data).draw(div);
      return chart;
    },
    "14 lines and ribbons": function(topic){
      setTimeout(function() {
        countElements('#nelplo', ".geom-line", 14);
        countElements('#nelplo', ".geom-ribbon", 14);
      });
    }
  },
  "nelplo columns": {
    topic: function() {
      var div = d3.select('body')
                  .append('div')
                  .attr('id', 'np-columns');
      var layers = [ggd3.geoms.path()
                        .lineWidth(4)
                        .freeColor(true)
                        .lineType("none"),
                    ggd3.geoms.point()
                      .alpha(d3.functor(0))
                      .color('none')
                      .size(10)];
      var facet = ggd3.facet({x:'decade', ncols: 2})
                      .scales('free');
      var chart = ggd3.plot()
                    .colorRange(['orange', 'blue'])
                    .layers(layers)
                    .facet(facet)
                    .margins({left: 60, bottom:30})
                    .xScale({axis:{ticks:4}})
                    .yScale({axis:{ticks:4}})
                    .dtypes({"date": ['date', 'many', "%Y-%m"]})
                    .width(300)
                    .height(300);
      data = data.nelplo_columns_data();
      chart.aes({x:"real.wages", y: "unemp",
              label: "date", color: 'date'})
           .data(data);
      chart.draw(div);
      return chart
    },
    "71 paths and 79 points": function(topic) {
      setTimeout(function() {
        countElements('#np-columns', '.geom-path', 71);
        countElements('#np-columns', '.geom-point', 79);
      }, 500);
    }
  },
  "us time series": {
    topic: function() {
      var div = d3.select('body')
                  .append('div')
                  .attr('id', 'usts');
      var layers = [ggd3.geoms.line().lineWidth(2)
                      .freeColor(true)
                      .lineType('none'),
                    ggd3.geoms.point()
                      .color(d3.functor('none'))
                      .size(10)
                      .alpha(d3.functor(0))];
      var facet = ggd3.facet({y:"group", nrows:2, scales: 'free'});
      var chart = ggd3.plot()
                    .facet(facet)
                    .layers(layers)
                    .height(250)
                    .margins({left: 50})
                    .dtypes({date: ['date', 'many']})
                    .colorRange(['seagreen', 'orange'])
                    .aes({x: 'date', y: 'value', color:'value',
                          group:'variable'})

      data = data.ustimeseries_data();
      chart.data(data).draw(div);
      return chart;
    },
    "has all the geoms": function(topic){
      setTimeout(function() {
        countElements("#usts", ".geom-line", 540);
        countElements("#usts", ".geom-point", 544);

      }, 500)
    }
  },
  "wells": {
    topic: function() {
      var div = d3.select('body')
                  .append('div')
                  .attr('id', 'wells');
      var facet = ggd3.facet({x:"assoc", y:"switch", type:'grid',
                            titleSize: [30,30]});
      var chart = ggd3.plot()
                    .facet(facet)
                    .layers([ggd3.layer().geom('bar')])
                    .dtypes({educ: ['number', 'few']})
                    .height(300)
                    .width(300)
                    .rangePadding(0.8)
                    .rangeBand(0.05)
                    .yScale({axis:{position:'left',
                            orient: 'left'}})
                    .xScale({axis:{position:'bottom',
                            orient: 'bottom'}})
                    // .fillScale({type:'category20b'})
                    .margins({right: 10, left:45, top:20, bottom:50})
                    .color('none')
                    .aes({y:'educ', x: "n. observations"})
      data = data.wells_data();
      chart.data(data).draw(div);
      return chart;
    },
    "has all the geoms": function(topic){
      setTimeout(function() {

      }, 500)
    }
  }
})

suite.export(module);
