# GGD3
---

Grammar of graphics in D3.js

Roadmap:

- xScale and yScale accept objects with settings values for axes and scales
  - orientation, position, ticks, type etc.
- Scales should be reset any time a new aes, facet, or data is entered
  - if facet or aes requires variable name not in data, throw error.
- Come up with reasonable way to pass geoms to layers
  - .layers([ggd3.geoms.bar().aes({x: '1',y: '2'}).alpha(0.5),
  ggd3.geoms.point().aes({x: '1', y: '2'}).alpha(1)])
  - ie. a layer will look for aesthetics on it's geom, then on the main plot object.
- fixed/free x/y scales and fixed/free space
- Pan and zoom on x and y axes.
- Brush on one axis or both axes
  - Scatterplot highlights according to datapoint value or id
- Context brush for either axis, [linear, ordinal, or time]
- opts is an object literal with assorted options
  - overriding margins of facets, perhaps
- More generic methods for aggregating data that has been nested
- Initial geoms:
  - geom bar with stack, group and expand options
  - point w/ jitter on ordinal axis
  - line
  - box
  - geom error that mounts on geom point, bar, box, line, etc.
  - smooth with loess or lm methods


#### Problems:

- Cannot update clipPath - selecting "clipPath" does not work
  - currently getting around this by adding class "clip" and selecting that.
- When updating with new data, existing facets in rows may not be removed
  - manually select them based on facets with data and remove