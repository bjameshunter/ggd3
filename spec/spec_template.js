var d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    data = require('../data/data.js');

function count(id, selector, length) {
  expect(d3.select("#" + id)
          .selectAll(selector)[0].length).toEqual(length);
}
describe("name", function() {
  var id = 'id';
  var div = d3.select('body')
              .append('div')
              .attr('id', id);

  beforeAll(function(done) {
    // chart.draw(div);
    setTimeout(function() {
      done();
    }, 1000);
  })
  afterAll(function() {
    d3.select('#' + id).remove();
  })
  it("first spec", function() {
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