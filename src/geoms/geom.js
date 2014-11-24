// Base geom from which all geoms inherit
function Geom(aes) {
  var attributes = {
    layer: null,
    stat: null,
    fill: null,
    alpha: null,
    color: null,
    size: null,
  };
  this.attributes = attributes;
}
Geom.prototype.defaultPosition = function() {
  var n = this.name();
  return {
    "point": "identity",
    "text": "identity",
    "bar": "stack",
    }[n];
};
ggd3.geom = Geom;
