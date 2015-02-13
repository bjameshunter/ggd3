var vows = require('vows'),
    $ = require('../node_modules/jquery/dist/jquery.js'),
    assert = require('assert'),
    d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    data = require('../data/data.js'),
    plots = require('../plot_examples.js'),
    suite = vows.describe('ggd3.plot');

suite.addBatch({
  // a context, these are run in parallel/asynch.
  // contexts contain topics, which are run in sequence.
  'mtcars': {
    topic: function() {
      var div = d3.select('body').append('div')
                  .attr('id', 'mtcars');
      var p = ggd3.plot()
                .layers(['point'])
                .aes({x:'wt', y:'mpg', fill:'gear'})
                .facet({x:'cyl', scales:'free', ncols: 3})
                .data(data.mtcars_data())
      p.draw(div);
      return {div: div, plot:p};
    },
    "should have 32 circles": function(topic){
      console.log('hello');
      assert.equal(topic.div.selectAll('circle.geom')[0].length, 32);
    },
    "should have 3 facets": function(topic) {
      assert.equal(topic.div.selectAll('.plot-svg')[0].length, 3);
    }
    // ,
    // "should properly id dtypes": function(topic) {
    //   var dtypes = {
    //     wt: ['number', 'many'],
    //     mpg: ['number', 'many'],
    //     gear: ['number', 'few'], 
    //   };
    //   assert.deepEqual(topic.plot.dtypes(), dtypes);
    // }
  },
  "baseball": {
    topic: function() {
    var layers = ggd3.layer()
              .geom(ggd3.geoms.bar()
                      .offset('expand'))
              .position('stack')
              .stat({x:'mean', alpha: 'max'}),
        facet = ggd3.facet({titleSize:[0,0], vShift:40}),
        aes = {y: "team", x:'batting',
                    fill: "decade",
                    alpha: "hr"};
        var chart = ggd3.plot()
                  .facet(facet)
                  .width(300)
                  .height(800)
                  .color('white')
                  .rangeBand(0)
                  .rangePadding(0)
                  .subRangePadding(0.2)
                  .layers(layers)
                  .yGrid(false)
                  .xGrid(false)
                  .margins({right: 50, top:0})
                  .xScale({axis: {ticks:4, position: 'top',
                                  orient:'top'},
                                  offset:45})
                  .yScale({axis:{position:"right",
                                orient: "right"},
                                offset:45})
                  .aes(aes)
                  .facet(facet)
                  .data(data.baseball_data());
      var div = d3.select('body').append('div')
                      .attr('id', 'baseball');
      chart.draw(div);
      var gs = d3.selectAll('.plot');
      return {g: gs, chart:chart};
    },
    "should have 34 teams on y axis": function(topic) {
      var domainLength = topic.chart.yScale().single.domain().length;
      assert.equal(domainLength, 34);
    },
    "should be four plots": function(topic) {
      assert.equal(topic.g[0].length, 4);
    },
    "should have 90 rectangles": function(topic) {
      setTimeout(function() {
        var rects = d3.selectAll('rect.geom')[0].length;
        assert.equal(rects, 90);
      }, 1000)
    }
  }
});
// .addBatch({
//   "mtcars still exists": {
//     topic: function() {
//       return {};
//     },
//     "test for plot": function(topic){
//       assert.equal(d3.selectAll('.plot')[0].length, 4);
//     },
//   }
// });

suite.export(module);
