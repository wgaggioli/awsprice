define(
    ['jquery', 'backbone', 'flot'],
    function($, Backbone) {
        "use strict";
        var BasePlotView;

        BasePlotView = Backbone.View.extend({
            className: "plot",
            events: {
                "plothover": "_plotHover"
            },
            getGraphData: function () {
                return [];
            },
            getGraphOptions: function () {
                return {};
            },
            getLabel: function(e, loc, item) {
                return '';
            },
            _plotHover: function(e, loc, item){
                var label;
                if (item === null) {
                    if (e.target !== this.$tooltip) {
                        this.$tooltip.hide();
                    }
                    return;
                }
                label = this.getLabel(e, loc, item);
                this.$tooltip
                    .html(label)
                    .show()
                    .css({
                        'top': loc.pageY - this.$tooltip.outerHeight() - 10,
                        'left': loc.pageX - this.$tooltip.outerWidth() / 2,
                        'border-color': item.series.color
                    });
            },
            render: function () {
                var data = this.getGraphData(),
                    options = this.getGraphOptions();
                this.$tooltip = $('<div></div>')
                    .addClass('plotToolTip')
                    .appendTo($('body'))
                    .hide();
                this.plot = $.plot(this.$el, data, options);
                return this;
            }
        });

        return BasePlotView;
    }
);