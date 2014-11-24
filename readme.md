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
  - ie. a layer will look for aesthetics on itself, then on the main plot object.
- fixed/free x/y scales and [fixed/free space]
- Pan and zoom on x and y axes.
- Brush on one axis or both axes
  - Scatterplot highlights according to datapoint value or id
- Context brush for either axis, [linear, ordinal, or time]
- opts is an object literal with assorted options
  - overriding margins of facets, perhaps
- Each geom has default stat. Stats have default geom. Relationship is not one to one. Many stats will have same geom.
  - There is only one stat, but each geom sets it differently.
  - All global aesthetics (fill, color, alpha, group, shape) are aggregated according to the facet and groupings, and the mean is calculated if it is numeric. If it is a factor and it was a grouping variable (fill, color, group), the first observation of the array is taken, because the will all be the same. If it was not a grouping variable (fill and color may not be), it is calculated. Other calculations are available. Min, max, mean, percentile. 
- More generic methods for aggregating data that has been nested
- tooltip should just display all known data for given point.
- Initial geoms:
  - geom bar with stack, group and expand options
  - point w/ jitter on ordinal axis
  - line, hline, vline, abline
  - box
  - geom error that mounts on geom point, bar, box, line, etc.
  - smooth with loess or lm methods


#### Problems:

- Cannot update clipPath - selecting "clipPath" does not work
  - currently getting around this by adding class "clip" and selecting that.
- Stack bar only works with default 'count' stat. Stacking according to mean or median doesn't make much sense, but should work.