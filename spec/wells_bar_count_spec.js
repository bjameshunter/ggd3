var d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    data = require('../data/data.js');

function count(id, selector, length) {
  expect(d3.select("#" + id)
          .selectAll(selector)[0].length).toEqual(length);
}
describe("wells bar count", function() {
  var id = 'wells';
  var div = d3.select('body')
              .append('div')
              .attr('id', id);

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
              .aes({y:'educ'})

  data = data.wells_data();
  chart.data(data);

  beforeAll(function(done) {
    chart.draw(div);
    setTimeout(function() {
      done();
    }, 1000);
  })
  afterAll(function() {
    d3.select('#' + id).remove();
  })
  it("has 66 bars", function() {
    count(id, '.geom-bar', 66);
  });
  it("has 4 facets", function() {
    count(id, '.plot', 4);
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