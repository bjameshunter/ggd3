var d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    data = require('../data/data.js');

function count(id, selector, length) {
  expect(d3.select("#" + id)
          .selectAll(selector)[0].length).toEqual(length);
}
describe("line gradient", function() {
  var id = 'ustimeseries';
  var div = d3.select('body')
              .append('div')
              .attr('id', id);
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
                .transition(false)
                .layers(layers)
                .height(250)
                .margins({left: 50})
                .dtypes({date: ['date', 'many']})
                .colorRange(['seagreen', 'orange'])
                .aes({x: 'date', y: 'value', color:'value',
                      group:'variable'})

  chart.data(data.ustimeseries_data());

  beforeAll(function(done) {
    chart.draw(div);
    setTimeout(function() { 
      done();
    }, 1000);
  });
  afterAll(function() {
    d3.select('#' + id).remove();
  })
  it("has 540 lines", function() {
    count(id, '.geom-line', 540);
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