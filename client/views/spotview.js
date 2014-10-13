define(
    ['underscore', 'jquery', 'backbone', 'router', 'util', 'views/plotview', 'flot',
     'flot-orderBars'],
    function(_, $, Backbone, router, util, BasePlotView) {
        "use strict";
        var SpotPlotView, SpotView;

        /**
         * SpotPlotView
         *
         * Plot bar graph of OnDemand vs Spot Price across regions.
         *
         * this.spreads is an array of objects with the following attributes:
         *      demandPrice
         *      spotPrice
         *      region
         *
         */
        SpotPlotView = BasePlotView.extend({
            hoverLabelTemplate: _.template($("#hoverLabelTemplate").html()),
            initialize: function (options) {
                this.spreads = options.spreads;
                this.sort();
                this.plot = null;
            },
            sort: function () {
                var sortFunc = util.reverseComparator(function (o){return o.region});
                this.spreads.sort(sortFunc);
            },
            getGraphData: function () {
                var i, spotData = [], demandData = [];
                for (i = 0; i < this.spreads.length; i++) {
                    demandData.push([i, this.spreads[i].demandPrice]);
                    spotData.push([i, this.spreads[i].spotPrice]);
                }
                return [
                    {
                        label: "Demand Price",
                        data: demandData,
                        bars: {
                            order: 0
                        }
                    },
                    {
                        label: "Spot Price",
                        data: spotData,
                        bars: {
                            order: 1
                        }
                    }
                ]
            },
            getGraphOptions: function () {
                var i, xticks = [], options;
                for (i = 0; i < this.spreads.length; i++) {
                    xticks.push([i, this.spreads[i].region])
                }
                options = {
                    legend: {
                        labelBoxBorderColor: "none",
                        position: "nw"
                    },
                    grid: {
                        hoverable: true,
                        clickable: false,
                        borderWidth: 1
                    },
                    series: {
                        bars: {
                             show: true,
                             barWidth:.25
                        }
                    },
                    xaxis: {
                        ticks: xticks,
                        tickLength: 0
                    }
                };
                return options;
            },
            getLabel: function (e, loc, item) {
                var label, spread, discount;
                spread = this.spreads[item.dataIndex];
                discount = 100 * (spread.demandPrice - spread.spotPrice) / spread.demandPrice;
                this.trigger('hoverBar', e, loc, item);
                label = this.hoverLabelTemplate({
                    region: spread.region,
                    demandPrice: util.roundTo(spread.demandPrice, 2),
                    spotPrice: util.roundTo(spread.spotPrice, 2),
                    spotDiscount: Math.round(discount)
                });
                return label;
            }
        });

        /**
         * SpotView
         *
         * Analyze the demand/spot spread. Renders a number of SpotPlotViews on
         * demand.
         */
        SpotView = Backbone.View.extend({
            className: "spots-container",
            plotContainerTemplate: _.template($("#plotContainerTemplate").html()),
            events: {
                "click a.drill-down": "drilldownClick"
            },
            initialize: function (collection) {
                this.collection = collection;
            },
            renderByType: function (type) {
                var spreads, size, grouped, container, view,
                    filtered = this.collection.filter(function(model) {
                        return model.get("type") === type && model.get("spotPrice") !== null;
                    });
                grouped = _.groupBy(filtered, function (model) {
                    return model.get("size");
                });

                for (size in grouped){
                    if (grouped.hasOwnProperty(size)){
                        spreads = _.map(grouped[size], function (model){
                            var datum = {
                                "demandPrice": model.get("demandPrice"),
                                "spotPrice": model.get("spotPrice"),
                                "region": model.get("region")
                            };
                            return datum;
                        });

                        container = $(this.plotContainerTemplate({
                            "title": size,
                            "subtitle": ""
                        })).appendTo(this.$el);
                        view = new SpotPlotView({
                            "el": container.find(".plot").get(0),
                            "spreads": spreads
                        });
                        view.render();
                    }

                }
                return this;
            },
            drilldownClick: function (evt) {
                var type;
                router.navigate(evt.target.getAttribute("href"), {"trigger": false});
                type = evt.target.getAttribute("href").split("spot_spreads/")[1];
                this.$el.empty();
                this.renderByType(type);
                return false;
            },
            _renderType: function (type, regionGroups) {
                var region, datum, container, view, spreads = [];

                /* Aggregate across the regions */
                for (region in regionGroups) {
                    if (regionGroups.hasOwnProperty(region)){
                        datum = _.reduce(regionGroups[region], function (memo, model) {
                            memo["spotPrice"] += model.get("spotPrice");
                            memo["demandPrice"] += model.get("demandPrice");
                            return memo;
                        }, {"spotPrice": 0., "demandPrice": 0, "region": region});
                        datum.spotPrice /= regionGroups[region].length;
                        datum.demandPrice /= regionGroups[region].length;
                        spreads.push(datum);
                    }
                }

                /* Render the Nonsense */
                container = $(this.plotContainerTemplate({
                    "title": util.typeLabelMap[type],
                    "subtitle": '<a class="btn btn-default drill-down" ' +
                        'href="/spot_spreads/' + type + '">' +
                        'Drill down to instances</a>'
                })).appendTo(this.$el);
                view = new SpotPlotView({
                    "el": container.find(".plot").get(0),
                    "spreads": spreads
                });
                return view.render();
            },
            renderAggregated: function () {
                var i, region, typeGroups, regionGroups,
                    filtered;

                /* Filter to all models with spotPrice defined */
                filtered = this.collection.filter(function(model) {
                    return model.get("spotPrice") !== null;
                });

                /* Group and sort by Type */
                typeGroups = _.pairs(_.groupBy(filtered, function(model){
                    return model.get("type");
                }));
                typeGroups = _.sortBy(typeGroups, function (e) { return e[0];});

                /* compile the data */
                for (i = 0; i < typeGroups.length; i++) {
                    regionGroups = _.groupBy(typeGroups[i][1], function (model){
                        return model.get("region");
                    });
                    this._renderType(typeGroups[i][0], regionGroups);
                }

                return this;
            },
            render: function (args) {
                var type = args[0];
                this.$el.empty();
                if (type === null ){
                    this.renderAggregated()
                } else {
                    this.renderByType(type);
                }
                return this;
            }
        });

        return SpotView;
    }
);