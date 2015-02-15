var d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    data = require('../data/data.js');

function count(id, selector, length) {
  expect(d3.select("#" + id)
          .selectAll(selector)[0].length).toEqual(length);
}
describe("name", function() {
  var id = 'wells-boxes';
  var div = d3.select('body')
              .append('div')
              .attr('id', id);
  var facet = ggd3.facet({x:"assoc", type:'grid',
                       ncols:2,
                      titleSize: [30, 0]});

  var chart = ggd3.plot()
              .facet(facet)
              .layers(['boxplot'])
              .dtypes({educ: ['number', 'few']})
              .height(500)
              .dtypes({'dist': ['number', 'many']})
              .width(300)
              .yScale({axis:{position:'left',
                      orient: 'left'},
                      scale:{domain:d3.range(18)}})
              .xScale({axis:{position:'bottom',
                      ticks:4,
                      orient: 'bottom'}})
              .fillScale({scale:
                {range:['darkseagreen', 'orange']}})
              .margins({right: 10, left:45, top:20, bottom:50})
              .color('none')
              .aes({y:'educ', x: 'arsenic', fill:'switch'})

  data = data.wells_data();
  chart.data(data);
  var xes = ['dist', 'arsenic'];
  var i = 0;

  beforeAll(function(done) {
    chart.draw(div);
    setTimeout(function() {
      done();
    }, 1000);
  })
  afterAll(function() {
    d3.select('#' + id).remove();
  })
  it("has 66 boxplot g elements", function() {
    count(id, '.geom-boxplot', 66);
  });
  it("has outliers", function() {
    var nPoints = d3.selectAll('.geom-point')[0].length;
    expect(nPoints).toBeGreaterThan(330);
  });
  it("has 190 boxplot path elements", function() {
    count(id, '.geom path', 198);
  });
  it("has 66 quantile box rects", function() {
    count(id, '.quantile-box', 66);
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