var d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    data = require('../data/data.js');

function count(id, selector, length) {
  expect(d3.select("#" + id)
          .selectAll(selector)[0].length).toEqual(length);
}
describe("bar with text", function() {
  var id = 'id';
  var div = d3.select('body')
              .append('div')
              .attr('id', id);
  var bar = ggd3.geoms.bar()
              .subRangeBand(0.15)
  var layers = [ggd3.layer()
                  .geom(bar)
                  .stat({y:'median'}),
                ggd3.layer().geom(ggd3.geoms.text()
                  .size(10)
                  .color('none')
                  .position('jitter'))
                .aes({label: 'mm'})
                ];

  var facet = ggd3.facet({x:'am', y:"gear", type: 'grid'});

  var chart = ggd3.plot()
                      .width(280)
                      .height(280)
                      .facet(facet)
                      .aes({x:'cyl', y:'mpg',
                           fill: 'gear'})
                      .yScale({axis:{ position:'left', 
                              orient:'left', ticks: 4}})
                      .xScale({axis: {ticks: 3, position: "top"}})
                      .rangePadding(0.5)
                      .margins({top: 5, bottom:10, left:50, right:10})
                      .layers(layers);

  data = data.mtcars_data();
  chart.data(data)

  beforeAll(function(done) {
    chart.draw(div);
    setTimeout(function() {
      done();
    }, 100);
  })
  afterAll(function() {
    d3.select('#' + id).remove();
  })
  it("has 10 rectangles", function() {
    count(id, '.geom-bar', 10);
  });
  it("has 32 text elements", function() {
    count(id, '.geom-text', 32);
  });
  it("has 6 facets", function() {
    count(id, '.plot', 6);
  });
  describe('describe transition', function() {
    beforeAll(function(done) {
      setTimeout(function() {
        done()
      }, 1000)
    });
    it('transition spec', function(done) {
      done();
    })
  })
});