# GGD3
---

Grammar of graphics in D3.js

Roadmap:

- scaleX and scaleY accept objects with settings values for axes and scales
  - orientation, position, ticks, type etc.
- Scales should be reset any time a new aes, facet, or data is entered
  - if facet or aes requires variable name not in data, throw error.
- fixed/free scales and fixed/free space
- Pan and zoom on x and y axes.
- Brush on one or both axis
  - Scatterplot highlights according to datapoint value or id
- Context brush for either axis
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