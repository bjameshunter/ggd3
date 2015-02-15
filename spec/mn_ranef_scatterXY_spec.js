var d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    data = require('../data/data.js');

function count(id, selector, length) {
  expect(d3.select("#" + id)
          .selectAll(selector)[0].length).toEqual(length);
}
describe("scatter with x and y errors", function() {
  var id = 'id';
  var div = d3.select('body')
              .append('div')
              .attr('id', id);
  var lr = ggd3.layer().geom(ggd3.geoms.linerange()
                                .alpha(0.2))
            .aes({xmin: function(d) {
                          return d.intercept_coef - 2*d.intercept_se;
                        },
                  xmax: function(d) {
                    return d.intercept_coef + 2*d.intercept_se;
                  }}),
      lr2 = ggd3.layer().geom(ggd3.geoms.linerange()
                                .alpha(0.2))
            .aes({ymin: function(d) {
                          return d.floor_coef - 2*d.floor_se;
                        },
                  ymax: function(d) {
                    return d.floor_coef + 2*d.floor_se;
                  }});


  var layers = [ggd3.layer().geom(ggd3.geoms.point().color('none')), 
                        lr, lr2];

  var facet = ggd3.facet();

  var chart = ggd3.plot()
                .facet(facet)
                .width(500)
                .xScale({axis: {ticks: 5}, 
                        label: "Intercept +/- 2 se"})
                .yScale({axis:{ticks:4},
                        label: "Floor coefficient +/- 2 se"})
                .height(500)
                .margins({top:0, bottom:100, left:130, right:10})
                .layers(layers)
                .aes({y:'floor_coef', x: "intercept_coef", group: "county"});  
  data = data.MN_ranefs2_data();
  chart.data(data);

  beforeAll(function(done) {
    chart.draw(div);
    setTimeout(function() {
      done();
    }, 200);
  })
  afterAll(function() {
    d3.select('#' + id).remove();
  })
  it("has 85 points", function() {
    count(id, '.geom-point', 85);
  });
  it("has 170 linerange", function() {
    count(id, '.geom-linerange', 170);
  });
  it("has 4 xgrid paths", function() {
    count(id, '.xgrid path', 4);
  });
  it("has 3 ygrid paths", function() {
    count(id, '.ygrid path', 3);
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