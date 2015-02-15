var d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    data = require('../data/data.js');

function count(id, selector, length) {
  expect(d3.select("#" + id)
          .selectAll(selector)[0].length).toEqual(length);
}
describe("bar with error", function() {
  var id = 'mn-ranefs';
  var div = d3.select('body')
              .append('div')
              .attr('id', id);
  var lr = ggd3.layer().geom(ggd3.geoms.linerange()
                               .lineWidth(3)
                               .gPlacement('append'))
              .aes({xmin: function(d) {
                            return d.coef - 2*d.se;
                          },
                    xmax: function(d) {
                      return d.coef + 2*d.se;
                    }});

  var layers = [ggd3.layer().geom(ggd3.geoms.bar()
                                  .lineWidth(0)
                                  .color('blue'))
                    .stat({x: 'identity'}), lr];

  var facet = ggd3.facet({x:'coefficient', ncols: 2, type:'grid'});

  var chart = ggd3.plot()
                .facet(facet)
                .width(300)
                .xScale({axis: {ticks: 5}, label: ""})
                .rangePadding(0) // not working
                .height(1000)
                .xGrid(false)
                .margins({top:0, bottom:30, left:130, right:10})
                .layers(layers)
                .aes({y:'county', x: "coef"});  
  var sorted;
  data = data.MN_ranefs_data();

  sorted = _.filter(data, 
                  function(d) { return d.coefficient === "intercept";})
  sorted = _.map(sorted.sort(function(a,b) {
    return b.coef - a.coef;
  }), "county");
  sorted.reverse();

  chart.data(data)
       .yScale({axis:{ticks:4}, 
                scale: {domain: sorted}, 
                label: ""});

  beforeAll(function(done) {
    chart.draw(div);
    setTimeout(function() {
      done();
    }, 400);
  })
  afterAll(function() {
    d3.select('#' + id).remove();
  })
  it("has 170 bars", function() {
    count(id, '.geom-bar', 170);
  });
  it("has error 170 lines", function() {
    count(id, '.geom-linerange', 170);
  });
  it("has facets", function() {
    count(id, ".plot", 2);
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