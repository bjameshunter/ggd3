var d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    data = require('../data/data.js');

function count(id, selector, length) {
  expect(d3.select("#" + id)
          .selectAll(selector)[0].length).toEqual(length);
}
var div, chart;

describe("baseball bars", function() {

  var id = 'baseball',
      layers = ggd3.layer()
            .geom(ggd3.geoms.bar()
                    .offset('expand'))
            .position('stack')
            .stat({x:'mean', alpha: 'max'}),
      facet = ggd3.facet({titleSize:[0,0], vShift:40}),
      aes = {y: "team", x:'batting',
                  fill: "decade",
                  alpha: "hr"},
      xaxis = {axis: {ticks:4, position: 'top',
                              orient:'top'},
                              offset:45};
      chart = ggd3.plot()
              .width(300)
              .height(800)
              .transition(false)
              .color('white')
              .rangeBand(0)
              .rangePadding(0)
              .subRangePadding(0.2)
              .layers(layers)
              .yGrid(false)
              .xGrid(false)
              .margins({right: 50, top:0})
              .xScale(xaxis)
              .yScale({axis:{position:"right",
                            orient: "right"},
                            offset:45})
              .aes(aes)
              .facet(facet)
              .dtypes({"year": ['date', 'many', "%Y"],
                  "decade": ['string'],
                  "stint": ['string'],
                  "batting": ["number", "many"]})
              .data(data.baseball_data());
  div = d3.select('body').append('div')
                  .attr('id', id);

  beforeAll(function(done) {
    chart.draw(div);
    setTimeout(function() {
      done();
    }, 1000);
  })
  afterAll(function() {
    d3.select('#' + id).remove();
  })


  it("has 90 bars", function() {
    count(id, '.geom-bar', 90);
  });
  it("has yscale with 34 teams", function() {
    expect(chart.yScale().single.scale().domain().length).toEqual(34);
  });
  describe('transitioning to dodge', function() {
    beforeAll(function(done) {
      chart.layers()[0].position('dodge')
        .geom()
        .offset('zero');
      chart.xScale(null).xScale(xaxis).draw(div);
      setTimeout(function() {
        done()
      }, 500)
    });
    it('has rects of height 7', function(done) {
      var h = [];
      div.selectAll('.geom-bar').each(function(d, i) {
        h.push(d3.select(this).attr('height'));
      });
      var all7 = _.all(h, function(d) { return d === '7'; });
      expect(all7).toBe(true);
      done();
    })
  })
});