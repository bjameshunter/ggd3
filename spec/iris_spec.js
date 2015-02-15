var d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    data = require('../data/data.js');

function count(id, selector, length) {
  expect(d3.select("#" + id)
          .selectAll(selector)[0].length).toEqual(length);
}

describe("histogram with density", 
  function() {

    var id = 'iris';
    var div = d3.select('body')
                .append('div')
                .attr('id', id);
    var layers = [ggd3.geoms.histogram()
                    .frequency(false),
                  ggd3.geoms.density()
                    .kernel('gaussianKernel'),
                  ggd3.layer()
                    .geom(ggd3.geoms.density()
                        .kernel('gaussianKernel')
                    .color('black'))
                    .aes({fill:null,
                          color:null })
                  ];

    var facet = ggd3.facet({titleSize: [0,0]});

    var chart = ggd3.plot()
                  .aes({x:"Sepal.Length", 
                       fill:"Species", 
                       color:"Species"})
                  .margins({left: 80})
                  .facet(facet)
                  .layers(layers)
                  .yScale({axis:{
                    ticks: 4,
                  }});

    chart.data(data.iris_data());

    beforeAll(function(done) {
      chart.draw(div);
      setTimeout(function() {
        done();
    }, 200);
  })
  afterAll(function() {
    d3.select('#' + id).remove();
  })
  it("has 47 bars", function() {
    count(id, '.geom-bar', 47);
  });
  it("has 4 density lines", function() {
    count(id, '.geom-density', 4);
  });
  it("has 3 layers", function() {
    count(id, 'g.g', 3);
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