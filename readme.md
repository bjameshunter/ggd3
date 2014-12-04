# GGD3
---

Grammar of graphics in D3.js

Roadmap:

- Fixed/free space
- Pan and zoom on x and y axes.
- Brush on one axis or both axes
  - Scatterplot highlights according to datapoint value or id
- Context brush for either axis, [linear, ordinal, or time]
- All global aesthetics (fill, color, alpha, size) are aggregated according to the facet and groupings, and the median is calculated if it is numeric. If it is a factor and it was a grouping variable (fill, color, group), the first observation of the array is taken, because the will all be the same. If it was not a grouping variable (fill and color may not be), it is calculated. Other calculations are available. Min, max, mean, percentile. 
- tooltip displays all known data for given point.
- Initial geoms:
  - geom bar with stack, group and expand options
  - point w/ jitter on ordinal axis
  - line, hline, vline, abline
  - box
  - geom error that mounts on geom point, bar, box, line, etc.
  - smooth with loess or lm methods
- Possible adoption of bin-summarize-smooth methods to replace plots that draw too many DOM elements.
- Sampling methods for large datasets

#### Problems and questions:

- Cannot update clipPath - selecting "clipPath" does not work
  - currently getting around this by adding class "clip" and selecting that.
or median doesn't make much sense, but should work.
- Is using the super formula worth it? 
  - does it cost more to draw and animate?
- Find smarter way to decide, during computation step, which axis is the number and which the factor. Currently my dtypes function returns a two tuple
  - the first is one of "number", "string", or "date"
  - the second is one of "few" or "many", 20 being the cutoff
  - if it's a date, a third element can be the format to be passed to axes.
  - doing it like this prohibits drawing 100 boxplots on a single facet