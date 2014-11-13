var vows = require('vows'),
    jQuery = require('../node_modules/jquery/dist/jquery.js'),
    assert = require('assert'),
    d3 = require('d3'),
    _ = require('lodash'),
    ggd3 = require('../dist/ggd3.v.0.1.0.js'),
    d = [],
    suite = vows.describe('ggd3.plot');

for(var i = 0; i < 32; i ++){
  d.push( {
    "v1": _.random(20),
    "v2": Math.random(),
    "group": _.sample(['group1', 'group2', 'group3']),
    "facet": _.sample(['facet1', 'facet2', "facet3", 'facet4']),
  })
}

suite.addBatch({
  // a context, these are run in parallel/asynch.
  // contexts contain topics, which are run in sequence.
  'facet single x': {
    topic: function() {
      var ch = new ggd3.plot()
                    .layers(['bar'])
                    .data(d)
                    .facet({x: "facet", ncols: 2});
      d3.select("body").append('div').call(ch.draw());
      var svgs = d3.selectAll('svg');
      return {ch:ch, svgs: svgs};
    },
    "should be 32 long": function(topic){
      var flat = _.flatten(_.map(topic.ch.data(), 
                           function(d) { return d.values; }))
      assert.equal(flat.length, 32);
    },
    "should have 4 facets": function(topic) {
      assert.equal(topic.svgs[0].length, 4);
    }
  },
  "facet x and y": {
    topic: function() {
      d3.selectAll('svg').remove();
      var ch = new ggd3.plot()
                      .data(d)
                      .layers(['bar'])
                      .facet({x: 'facet', y: 'group'});
      d3.select('body').append('div').call(ch.draw());
      var svgs = d3.selectAll('svg');
      return {ch: ch, svgs: svgs};
    },
    "should have 12 facets": function(topic) {
      assert.equal(topic.svgs[0].length, 12);
    }
  }
});
suite.export(module);
