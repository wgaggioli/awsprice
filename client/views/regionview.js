define(
    ['underscore', 'jquery', 'backbone', 'router', 'util', 'views/plotview', 'flot',
     'flot-selection'],
    function(_, $, Backbone, router, util, BasePlotView) {
        "use strict";
        var RegionView, RegionBarView, RegionLineView;

        /**
         * RegionBarView
         *
         * Display a bar graph of avg % deviation from the mean price for all
         * instances.
         *
         * plotData is an array of objects with the following attributes:
         *      region
         *      deviation
         */
        RegionBarView = BasePlotView.extend({
            className: "region-bar-plot",
            initialize: function (options) {
                this.plotData = options.data;
                this.sort();
            },
            sort: function () {
                this.plotData.sort(function (a, b) {
                    if (a.region > b.region) {
                        return -1;
                    }
                    if (a.region < b.region) {
                        return 1;
                    }
                    return 0;
                });
            },
            getGraphData: function () {
                var i, data = [];
                for (i = 0; i < this.plotData.length; i++) {
                    data.push([i, this.plotData[i].deviation]);
                }
                return [data]; // second series is the x axis
            },
            getGraphOptions: function () {
                var i, xticks = [];
                for (i = 0; i < this.plotData.length; i++) {
                    xticks.push([i, this.plotData[i].region]);
                }
                return {
                    legend: {
                        show: false
                    },
                    grid: {
                        hoverable: true,
                        clickable: false,
                        borderWidth: 1,
                        markings: [{yaxis: {from: 0, to: 0}, color: "#EBB724"}]
                    },
                    series: {
                        bars: {
                             show: true,
                             barWidth:.5,
                             align: "center"
                        }
                    },
                    xaxis: {
                        ticks: xticks,
                        tickLength: 0
                    }
                }
            },
            getLabel: function (e, loc, item) {
                var sign = item.datapoint[1] > 0 ? '+' : '';
                return sign + Math.round(item.datapoint[1]) + '%';
            }
        });

        /**
         * RegionLineView
         *
         * Display a line graph of price by instance for each region
         *
         * plotData is an object with the following attributes:
         *      regions  object with
         *          regionName:  array of data points corresponding to sizes
         *      sizes    array of size names
         */
        RegionLineView = BasePlotView.extend({
            className: "region-line-plot",
            events: {
                "plotselected": "_plotSelected",
                "dblclick": "_plotDblClick",
                "plothover": "_plotHover"
            },
            initialize: function (options) {
                this.plotData = options.data;
            },
            getGraphData: function () {
                var region, graphData = [], i, regionData;
                for (region in this.plotData.regions) {
                    if (this.plotData.regions.hasOwnProperty(region)) {
                        regionData = [];
                        for (i = 0; i < this.plotData.regions[region].length; i++) {
                            regionData.push([i, this.plotData.regions[region][i]]);
                        }
                        graphData.push({
                            label: region,
                            data: regionData
                        });
                    }
                }
                return graphData;
            },
            getGraphOptions: function () {
                var i, xticks = [];
                for (i = 0; i < this.plotData.sizes.length; i++) {
                    xticks.push([i, this.plotData.sizes[i]]);
                }
                return {
                    legend: {
                        labelBoxBorderColor: "none",
                        position: "nw"
                    },
                    grid: {
                        hoverable: true,
                        clickable: false,
                        borderWidth: 1
                    },
                    xaxis: {
                        ticks: xticks
                    },
                    selection: {
                        mode: "xy"
                    }
                }
            },
            getLabel: function (e, loc, item) {
                var label = item.series.label + ' @ ' +
                    this.plotData.sizes[item.dataIndex] + ': $' +
                    item.datapoint[1] + ' / hr';
                return label;
            },
            setZoom: function (xmin, xmax, ymin, ymax) {
                var plotOptions = this.plot.getOptions(),
                    axesOptions = {
                        xaxis: {
                            min: xmin,
                            max: xmax
                        },
                        yaxis: {
                            min: ymin,
                            max: ymax
                        }
                    };
                $.extend(true, plotOptions, axesOptions);
                $.extend(true, plotOptions.yaxes[0], axesOptions.yaxis);
                $.extend(true, plotOptions.xaxes[0], axesOptions.xaxis);
                this.plot.setupGrid();
                this.plot.draw();
                this.plot.clearSelection();
            },
            _plotSelected: function (event, ranges) {
                // clamp the zooming to prevent eternal zoom
                if (ranges.xaxis.to - ranges.xaxis.from < 0.00001) {
                    ranges.xaxis.to = ranges.xaxis.from + 0.00001;
                }
                if (ranges.yaxis.to - ranges.yaxis.from < 0.00001) {
                    ranges.yaxis.to = ranges.yaxis.from + 0.00001;
                }
                this.setZoom(ranges.xaxis.from, ranges.xaxis.to,
                             ranges.yaxis.from, ranges.yaxis.to);
            },
            _plotDblClick: function () {
                this.setZoom(null, null, null, null);
            }
        });

        /**
         * RegionView
         *
         * Displays the RegionBarView and RegionLineView views.
         */
        RegionView = Backbone.View.extend({
            className: "region-container",
            plotContainerTemplate: _.template($("#plotContainerTemplate").html()),
            initialize: function (collection) {
                this.collection = collection;
            },
            _getBarData: function (filteredData) {
                var data = [], grouped, size, avg, regionDevs = {}, region;
                grouped = _.groupBy(filteredData, function (model) {
                    return model.get("size");
                });
                for (size in grouped) {
                    if (grouped.hasOwnProperty(size)){
                        avg = util.mean(_.map(grouped[size], function (model) {
                            return model.get('demandPrice');
                        }));
                        grouped[size].forEach(function (datum) {
                            var region = datum.get("region"), dev;
                            if (!regionDevs.hasOwnProperty(region)) {
                                regionDevs[region] = [];
                            }
                            dev = 100 * (datum.get("demandPrice") - avg) / avg;
                            regionDevs[region].push(dev);
                        });
                    }
                }
                for (region in regionDevs) {
                    if (regionDevs.hasOwnProperty(region)) {
                        data.push({
                            region: region,
                            deviation: util.mean(regionDevs[region])
                        });
                    }
                }
                return data;
            },
            _getLineData: function (filteredData) {
                var data = {regions: {}, sizes: []}, grouped, region, sizeGrouped;
                filteredData = _.sortBy(filteredData, function (model) {
                    return model.get('demandPrice');
                });
                data.sizes = _.unique(_.map(filteredData, function (model) {
                    return model.get('size')
                }));
                grouped = _.groupBy(filteredData, function(model){
                    return model.get("region");
                });
                for (region in grouped) {
                    if (grouped.hasOwnProperty(region)) {
                        data.regions[region] = [];
                        sizeGrouped = _.indexBy(grouped[region], function (model) {
                            return model.get("size");
                        });
                        data.sizes.forEach(function (size) {
                            var val = sizeGrouped.hasOwnProperty(size) ?
                                      sizeGrouped[size].get("demandPrice") : null;
                            data.regions[region].push(val);
                        });
                    }
                }
                return data;
            },
            render: function () {
                var filteredData, barContainer, barView, lineContainer, lineView;
                this.$el.empty();

                filteredData = this.collection.filter(function (model){
                    return model.get("demandPrice") !== null;
                });

                /* Render Bar Graph */
                barContainer = $(this.plotContainerTemplate({
                    title: "Average Demand Price Deviation",
                    subtitle: '<p class="instruction">Displays the average for ' +
                        'a region of the % difference from the mean for each ' +
                        'instance.</p>'
                })).appendTo(this.$el);
                barView = new RegionBarView({
                    "el": barContainer.find(".plot").addClass("region-bar-plot").get(0),
                    "data": this._getBarData(filteredData)
                });
                barView.render();

                /* Render Line Graph */
                lineContainer = $(this.plotContainerTemplate({
                    title: "Price by Instance",
                    subtitle: '<p class="instruction">Displays the price ' +
                        'by instance for each region. Click and drag to zoom, ' +
                        'double click to reset.</p>'
                })).appendTo(this.$el);
                lineView = new RegionLineView({
                    "el": lineContainer.find(".plot").addClass("region-line-plot").get(0),
                    "data": this._getLineData(filteredData)
                });
                lineView.render();

                return this;
            }
        });

        return RegionView;
    }
);