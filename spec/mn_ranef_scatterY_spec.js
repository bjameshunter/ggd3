var d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    data = require('../data/data.js');

function count(id, selector, length) {
  expect(d3.select("#" + id)
          .selectAll(selector)[0].length).toEqual(length);
}
describe("scatter with y-error", function() {
  var id = 'mn-ranefs-y';
  var div = d3.select('body')
              .append('div')
              .attr('id', id);
  var lr = ggd3.layer().geom('linerange')
            .aes({ymin: function(d) {
                          return d.coef - 2*d.se;
                        },
                  ymax: function(d) {
                    return d.coef + 2*d.se;
                  }});

  var layers = [ggd3.layer().geom(ggd3.geoms.point().color('none')), 
                        lr];

  var facet = ggd3.facet({x:'coefficient', ncols: 2, type:'wrap'});

  var chart = ggd3.plot()
                .facet(facet)
                .width(500)
                .xScale({axis: {ticks: 5}, 
                        label: "Uranium (ppm)",
                        offset: 30})
                .height(200)
                .margins({top:0, bottom:100, left:130, right:10})
                .layers(layers)
                .aes({y:'coef', x: "Uppm"});  
  var sorted;
  data = data.MN_ranefs_data();
  chart.data(data)
       .yScale({axis:{ticks:4}});

  beforeAll(function(done) {
    chart.draw(div);
    setTimeout(function() {
      done();
    }, 1000);
  })
  afterAll(function() {
    d3.select('#' + id).remove();
  })
  it("has 170 points", function() {
    count(id, '.geom-point', 170);
  });
  it("has 170 lineranges", function() {
    count(id, '.geom-linerange', 170);
  });
  it("has 2 facets", function() {
    count(id, '.plot', 2);
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