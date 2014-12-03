// tooltip
function Tooltip (spec) {
  if(!(this instanceof Tooltip)){
    return new Tooltip(spec);
  }
  var attributes = {
    offset: {x: 15, y:15},
    styleClass: null,
    opacity: 1,
  };
  attributes.content = function(data) {
    var tt = [];
    for(var d in data) {
      tt.push(["<p><strong>" + d + "</strong>: " + data[d] + "</p>"]);
    }
    return tt.join('\n');
  };

  this.attributes = attributes;
  for(var attr in attributes) {
    if((!this[attr] && this.attributes.hasOwnProperty(attr))){
    this[attr] = createAccessor(attr);
    }
  }
}
Tooltip.prototype.find = function(el) {
  var parent = d3.select(el.parentNode);
  if(!parent.select('.ggd3tip').empty()) { return parent.select('.ggd3tip'); }
  return this.find(el.parentNode);
};
Tooltip.prototype.tooltip = function(selection) {
  that = this;
  selection.each(function(data) {
    var tooltipdiv = that.find(this);
    d3.select(this)
      .on('mouseover', function(d) {that.show(d, tooltipdiv); })
      .on('mousemove', function(d) {that.move(d, tooltipdiv); })
      .on('mouseout', function(d) {that.hide(d, tooltipdiv); });
  });
};

Tooltip.prototype.show = function(data, sel) {
  this.content()(sel, data);
};

Tooltip.prototype.move = function(data, sel) {
  sel
    .style('left', d3.event.offsetX + this.offset().x)
    .style('top', d3.event.offsetY + this.offset().y);
};

Tooltip.prototype.hide = function(data, sel) {
  sel.attr('class', 'ggd3tip')
    .transition().duration(200)
    .style('opacity', 0);
};

ggd3.tooltip = Tooltip;