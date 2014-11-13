# GGD3
---

Grammar of graphics in D3.js

Roadmap:

- scaleX and scaleY accept objects with settings values for axes and scales
  - orientation, position, ticks, type etc.
- Scales should be reset any time a new aes, facet, or data is entered
  - if facet or aes requires variable name not in data, throw error.
- free scales and free space
- Pan and zoom on x and y axes.
- Brush on one or both axis
  - Scatterplot highlights according to datapoint value or id
- Context brush for either axis
- More generic methods for aggregating data that has been nested
- Additional geoms:
  - smooth with loess or lm methods
  - geom bar with stack, group and expand options
  - geom error that mounts on geom point, bar or line


#### Problems:

- Cannot update clipPath - selecting "clipPath" does not work
  - currently getting around this by adding class "clip" and selecting that.