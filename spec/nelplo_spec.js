var d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    data = require('../data/data.js');

function count(id, selector, length) {
  expect(d3.select("#" + id)
          .selectAll(selector)[0].length).toEqual(length);
}

describe("nelplo line chart with ribbon", 
  function() {
    // d3.select('body').selectAll('*').remove();
    var id = 'nelplo';
    var div = d3.select('body')
                .append('div')
                .attr('id', id);
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
                  .transition(false)
                  .width(300)
                  .height(150)
                  .dtypes({date: ['date', 'many', "%Y-%m"]})
                  .facet(facet)
                  .colorScale({type:'category20'})
                  .fillScale({type:'category20'})
                  .yScale({axis: {ticks: 4, position:'left',
                          orient: "left"}})
                  .margins({top: 5, bottom:30, left:50, right:5})
                  .xScale({axis: {ticks: 4, position: "bottom",
                          orient: "bottom"}})
                  .aes({x:'date', y:'value', color:'variable', fill: 'variable'})
    chart.data(data.nelplo_data());

    beforeAll(function(done) {
      chart.draw(div);
      setTimeout(function() {
        done();
    }, 2000);
  })
  afterAll(function() {
    d3.select('#' + id).remove();
  })
  it("has 14 lines", function() {
    count(id, '.geom-line', 14);
  });
  it("has 14 ribbons", function() {
    count(id, '.geom-ribbon', 14);
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