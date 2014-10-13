define(
    ['underscore', 'jquery', 'backbone', 'router', 'util'],
    function(_, $, Backbone, router, util) {
        "use strict";
        var InstanceTableView;

        /**
         * InstanceTableView
         *
         * View all the data in a sortable table.
         *
         */
        InstanceTableView = Backbone.View.extend({
            tableData: {
                "Size": {
                    "attr": "size"
                },
                "Region": {
                    "attr": "region"
                },
                "Type": {
                    "attr": "type"
                },
                "vCPU": {
                    "attr": "vCPU"
                },
                "ECU": {
                    "attr": "ECU"
                },
                "Memory (GiB)": {
                    "attr": "memoryGiB"
                },
                "Storage (GB)": {
                    "attr": "storageGB"
                },
                "Demand Price ($/hr)": {
                    "attr": "demandPrice"
                },
                "Spot Price ($/hr)": {
                    "attr": "spotPrice"
                },
                "Spot Discount (%)": {
                    "attr": "spotDiscount"
                },
                "Price / vCPU": {
                    "attr": "pricePerCore"
                },
                "Price / Memory": {
                    "attr": "pricePerMemory"
                }
            },
            defaultSort: "pricePerCore",
            className: "instance-view-container",
            template: _.template($("#instancesTableTemplate").html()),
            initialize: function (collection) {
                this.bodyEl = null;
                this.collection = collection;
            },
            render: function () {
                var headerRow, that = this;
                this.$el.html(this.template());
                headerRow = this.$('table > thead > tr');
                $.each(this.tableData, function (name, spec) {
                    var headerEl = $('<th/>', {
                        text: name,
                        title: spec["title"]
                    });
                    if (that.defaultSort === spec.attr) {
                        headerEl.addClass("active");
                    }
                    headerEl.on("click", function(){
                        that.collection.setSortCol(spec.attr, {toggle: true});
                        that.renderRows();
                        headerRow.find("th").each(function(i, el) {
                            $(el).removeClass("active");
                        });
                        headerEl.addClass("active");
                    });
                    headerRow.append(headerEl);
                });
                if (this.defaultSort) {
                    this.collection.setSortCol(this.defaultSort);
                }
                this.bodyEl = this.$('tbody');
                this.renderRows();
                return this;
            },
            renderRows: function () {
                this.bodyEl.empty();
                this.collection.each(this.renderRow, this);
            },
            renderRow: function (model) {
                var i, rowEl = $('<tr/>'),
                    modelJSON = model.toJSON(),
                    floatCols = ['demandPrice', 'spotPrice', 'pricePerCore',
                                 'pricePerMemory'];
                for (i = 0; i < floatCols.length; i++) {
                    if (modelJSON[floatCols[i]] !== null){
                        modelJSON[floatCols[i]] = util.roundTo(modelJSON[floatCols[i]], 4);
                    } else {
                        modelJSON[floatCols[i]] = 'N/A'
                    }
                }
                modelJSON['spotDiscount'] = modelJSON['spotDiscount'] === null ? 'N/A' :
                                            Math.round(modelJSON['spotDiscount']);
                $.each(this.tableData, function (name, spec) {
                    rowEl.append('<td>' + modelJSON[spec.attr] + '</td>');
                });
                rowEl.on("click", function () {
                    alert("Clicked " + model.id);
                });
                this.bodyEl.append(rowEl);
            }
        });

        return InstanceTableView;
    }
);