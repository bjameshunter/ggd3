var vows = require('vows'),
    assert = require('assert'),
    d3 = require('d3'),
    charts = require('../chart/chart.js');

var suite = vows.describe('nuthin');

suite.addBatch({
  // a context, these are run in parallel/asynch.
  // contexts contain topics, which are run in sequence.
  'the answer': {
    topic: 42,
    "shouldn't be undefined": function(topic){
      assert.notEqual(topic, undefined);
    },
    "shouldn't be null": function(topic){
      assert.notEqual(topic, null);
    },
    "should be number": function(topic){
      assert.isNumber(topic);
    },
    "should be 42": function(topic){
      assert.equal(topic, 42);
    }
  }
});

suite.export(module);