var d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    data = require('../data/data.js');

function count(id, selector, length) {
  expect(d3.select("#" + id)
          .selectAll(selector)[0].length).toEqual(length);
}
describe("path with gradient", function() {
  var id = 'nelplo-columns';
  var div = d3.select('body')
              .append('div')
              .attr('id', id);

  var layers = [ggd3.geoms.path()
                    .lineWidth(4)
                    .freeColor(true)
                    .lineType("none"),
                ggd3.geoms.point()
                  .alpha(d3.functor(0))
                  .color('none')
                  .size(10)];

  var facet = ggd3.facet({x:'decade', ncols: 2}).scales('free');


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

  beforeAll(function(done) {
    chart.draw(div);
    setTimeout(function() {
      done();
    }, 1000);
  })
  afterAll(function() {
    d3.select('#' + id).remove();
  })
  it("has 71 paths", function() {
    count(id, '.geom-path', 71);
  });
  it("has 8 facets", function() {
    count(id, '.plot', 8);
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