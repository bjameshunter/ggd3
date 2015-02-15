var d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    data = require('../data/data.js');

function count(id, selector, length) {
  expect(d3.select("#" + id)
          .selectAll(selector)[0].length).toEqual(length);
}
describe("name", 
  function() {
    var id = 'mtcars-bullet';
    var div = d3.select('body')
                .append('div')
                .attr('id', id);

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
    var areaData;
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

    var facet = ggd3.facet().titleSize([0,0]);

    var chart = ggd3.plot()
                        .width(400)
                        .height(400)
                        .transition(false)
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
    var d = data.mtcars_data();
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
                });
    chart.data(d);
    areaData = chart.unNest(areaData.entries(d));
    area1.data(_.flatten(_.pluck(areaData, 'min')));
    area2.data(_.flatten(_.pluck(areaData, 'mean')));
    area3.data(_.flatten(_.pluck(areaData, 'max')));
    chart.layers([area1, area2, area3]);


    beforeAll(function(done) {
      chart.draw(div);
      setTimeout(function() {
        done();
      }, 1000);
  })
  afterAll(function() {
    d3.select('#' + id).remove();
  })
  it("has 24 area geoms", function() {
    count(id, '.geom-area', 24);
  });
  it("has 24 hline geoms", function() {
    count(id, '.geom-hline', 24);
  });
  it("has 8 bar geoms", function() {
    count(id, '.geom-bar', 8);
  });

  // describe('describe transition', function() {
  //   beforeAll(function(done) {
  //     setTimeout(function() {
  //       done()
  //     }, 1000)
  //   });
  //   it('transition spec', function(done) {
  //     done();
  //   })
  // })
});