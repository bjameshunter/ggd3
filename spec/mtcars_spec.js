var d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    data = require('../data/data.js');

function count(id, selector, length) {
  expect(d3.select("#" + id)
          .selectAll(selector)[0].length).toEqual(length);
}

describe("mtcars scatterplot", function() {
  var id = 'mtcars';
  var div = d3.select('body').append('div')
              .attr('id', 'mtcars');
  var chart = ggd3.plot()
            .transition(false)
            .layers(['point', ggd3.geoms.smooth().method('lm')])
            .aes({x:'wt', y:'mpg', fill:'gear', color:'gear'})
            .facet({x:'cyl', scales:'free', ncols: 3})
            .data(data.mtcars_data())
  chart.draw(div);
  afterAll(function() {
    d3.select('#' + id).remove();
  })
  it("has 32 circles", function() {
    count(id, '.geom-point', 32);
  });
  it("has 3 facets", function() {
    count(id, '.plot', 3);
  });
  it("has 6 smooth lines", function() {
    count(id, '.geom-smooth', 6);
  });
  describe('transitioning to loess, different facets', function() {
    chart
      .facet({x:'am', ncols: 2, scales: 'free'})
      .layers()[1].geom().method('loess');
    beforeAll(function(done) {
      chart.draw(d3.select('#mtcars'));
      setTimeout(function() {
        done();
      }, 700)
    });
    it("has 2 facets after switching", function(done) {
      count(id, '.plot', 2);
      done();
    });
  })
});
