// tooltip
function Tooltip (spec) {
  if(!(this instanceof Tooltip)){
    return new Tooltip(spec);
  }
  var attributes = {
    offset: {x: 15, y:15},
    styleClass: null,
    opacity: 1,
    content: null,
    geom: null,
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

Tooltip.prototype.tooltip = function(selection, s) {
  var that = this;
  if(_.isUndefined(s)){
    s = this.geom().setup();
  }
  selection.each(function(data) {
    var tooltipdiv = that.find(this);
    d3.select(this)
      .on('mouseover', function(d) {that.show(d, tooltipdiv, s); })
      .on('mousemove', function(d) {that.move(d, tooltipdiv); })
      .on('mouseout', function(d) {that.hide(d, tooltipdiv); });
  });
};

Tooltip.prototype.show = function(data, sel, s) {
  var tt = sel.select('.tooltip-content');
  tt.selectAll('*')
    .remove();
  this.content()(tt.data([data]), s);
  sel.transition().duration(200)
    .style('opacity', 1);
};

Tooltip.prototype.move = function(data, sel) {
  sel
    .style('left', d3.event.offsetX + this.offset().x)
    .style('top', d3.event.offsetY + this.offset().y);
};

Tooltip.prototype.hide = function(data, sel) {
  sel.attr('class', 'ggd3tip')
    .transition().duration(200)
    .style('opacity', 0)
    .transition().delay(200).duration(0)
    .style("top", 0)
    .style("left", 0)
    .select('.tooltip-content').selectAll('*')
    .remove();
};

ggd3.tooltip = Tooltip;