define(
    ['underscore', 'jquery', 'backbone', 'util'],
    function(_, $, Backbone, util) {
        var InstanceModel, BaseInstanceCollection, DemandCollection,
            SpotCollection, UnifiedModel, UnifiedCollection;

        /**
         * InstanceModel
         *
         * Model for Demand and Spot Collections. Represents pricing and other
         * attributes for a demand or spot instance. Note that demand and spot
         * instances are separate here.
         *
         */
        InstanceModel = Backbone.Model.extend({
            defaults: function () {
                return {
                    "size": "",
                    "price": 0.,
                    "type": "general",
                    "region": ""
                }
            },
            parse: function (attrs) {
                var i, j, values = attrs["valueColumns"], price, num,
                    numberAttrs = ["vCPU", "ECU", "memoryGiB", "storageGB"];
                for (i = 0; i < values.length; i++) {
                    if (values[i].name === "linux" || values[i].name === "os") {
                        price = Number(values[i]["prices"]["USD"]);
                        break
                    }
                }
                for (j = 0; j < numberAttrs.length; j++) {
                    if (attrs.hasOwnProperty(numberAttrs[j])) {
                        num = Number(attrs[numberAttrs[j]]);
                        if (!isNaN(num)) {
                            attrs[numberAttrs[j]] = num;
                        }
                    }
                }
                attrs.type = attrs.type.replace("CurrentGen", "");
                attrs.price = price;
                delete attrs["valueColumns"];
                return attrs;
            }
        });

        /**
         * BaseInstanceCollection
         *
         * not directly used. A base class for the Demand and Spot Collections
         * below. Contains logic for parsing the data format and retrieving the
         * js data.
         *
         */
        BaseInstanceCollection = Backbone.Collection.extend({
            model: InstanceModel,
            parse: function (resp) {
                /* Parse those crazy data */
                var region, type, i, j, k, dataObj, data = [];
                if (!resp)
                    return [];
                for (i = 0; i < resp["config"]["regions"].length; i++){
                    region = resp["config"]["regions"][i];
                    for (j = 0; j < region["instanceTypes"].length; j++){
                        type = region["instanceTypes"][j];
                        for (k = 0; k < type["sizes"].length; k++) {
                            dataObj = _.extend({}, type["sizes"][k], {
                                region: region["region"],
                                type: type["type"]
                            });
                            dataObj.id = [dataObj.region, dataObj.type, dataObj.size].join('_');
                            data.push(dataObj);
                        }
                    }
                }
                return data;
            },
            sync: function (method, model, options) {
                if (method === 'read') {
                    /* although rather goofy, setting window.callback here is
                    * necessary to load the file as a script. Note that loading it
                    * as a string and trying to parse is not possible due to the
                    * Same Origin Policy.
                    * */
                    options.dataType = 'script';
                    window.callback = options.success;
                    delete options.success;
                }
                return Backbone.Collection.prototype.sync.apply(this, [method, model, options]);
            }
        });

        /**
         * DemandCollection
         *
         * Collection of the On Demand Data
         */
        DemandCollection = BaseInstanceCollection.extend({
            url: "http://a0.awsstatic.com/pricing/1/ec2/linux-od.min.js"
        });

        /**
         * SpotCollection
         *
         * Collection of the spot data.
         */
        SpotCollection = BaseInstanceCollection.extend({
            url: "http://spot-price.s3.amazonaws.com/spot.js"
        });

        /**
         * UnifiedModel
         *
         * Combines spot and demand data together with additional statistics
         * for ease of access.
         */
        UnifiedModel = Backbone.Model.extend({
            defaults: function () {
                return {
                    "size": "",
                    "vCPU": null,
                    "ECU": null,
                    "memoryGiB": null,
                    "storageGB": null,
                    "demandPrice": null,
                    "spotPrice": null,
                    "type": "",
                    "region": "",
                    "spotDiscount": null,
                    "pricePerCore": null,
                    "pricePerMemory": null
                }
            }
        });

        /**
         * UnifiedCollection
         *
         * Combines spot and on demand data in one collection.
         */
        UnifiedCollection = Backbone.Collection.extend({
            model: UnifiedModel,
            /* sortByFuncs should be strings or sortBy style functions */
            sortByFuncs: {
                "ECU": function (model) {
                    var val = model.get("ECU");
                    if (val === "variable") {
                        return -1000;
                    }
                    return val;
                },
                "storageGB": function (model) {
                    var val = model.get("storageGB"),
                        match,
                        regMult = /^(\d+) x (\d+) */,
                        regSimple = /^(\d+) */;
                    if (val === "ebsonly") {
                        return -1000;
                    }
                    match = regMult.exec(val);
                    if (match) {
                        return Number(match[1]) * Number(match[2])
                    }
                    match = regSimple.exec(val);
                    if (match) {
                        return Number(match[1]);
                    }
                    return -1001;
                },
                "spotPrice": function (model) {
                    return model.get("spotPrice") === null ? 1000 : model.get("spotPrice");
                },
                "spotDiscount": function (model) {
                    return model.get("spotDiscount") === null ? -10000 : model.get("spotDiscount");
                }
            },
            initialize: function () {
                this.demandCollection = new DemandCollection();
                this.spotCollection = new SpotCollection();
                this.sortCol = null;
                Backbone.Collection.prototype.initialize.apply(this, arguments);
            },
            _parseDemand: function (demandModel) {
                /* model should be a demandCollection model */
                var spotModel,
                    attrs = {
                        "id": demandModel.get("id"),
                        "vCPU": demandModel.get("vCPU"),
                        "ECU": demandModel.get("ECU"),
                        "memoryGiB": demandModel.get("memoryGiB"),
                        "storageGB": demandModel.get("storageGB"),
                        "demandPrice": demandModel.get("price"),
                        "type": demandModel.get("type"),
                        "region": demandModel.get("region"),
                        "size": demandModel.get("size")
                    };
                attrs.pricePerCore = attrs.demandPrice / attrs.vCPU;
                attrs.pricePerMemory = attrs.demandPrice / attrs.memoryGiB;
                spotModel = this.spotCollection.get(attrs.id);
                if (spotModel) {
                    attrs.spotPrice = spotModel.get("price");
                    if (attrs.spotPrice) {
                        attrs.spotDiscount = 100 * (attrs.demandPrice - attrs.spotPrice) / attrs.demandPrice;
                    }
                }
                return attrs;
            },
            compile: function () {
                /* Called after demand and spot data is collected and parsed */
                var models = this.demandCollection.map(this._parseDemand, this);
                this.reset(models);
            },
            fetch: function (options) {
                /* Fetches the two collections. This should happen in series due to
                namespace conflict of window.callback function. */
                var that = this, fetchPromise;

                /* Fetch the data for the two collections */
                fetchPromise = new Promise(function (resolve, reject) {
                    var demandXhr = that.demandCollection.fetch(options);
                    demandXhr.done(function () {
                        var spotXhr = that.spotCollection.fetch(options);
                        spotXhr.done(resolve).error(reject);
                    }).error(reject);
                });

                /* Set the hooks for adding the data to this collection when
                parsing is complete. */
                fetchPromise.then(function () {
                    that.compile();
                }, function () {
                    console.log("Something went awry");
                });

                return fetchPromise;
            },
            _getComparator: function () {
                var comparator,
                    isNeg = this.sortCol.charAt(0) === '-',
                    colName = isNeg ? this.sortCol.slice(1) : this.sortCol;
                if (this.sortByFuncs.hasOwnProperty(colName)) {
                    comparator = this.sortByFuncs[colName];
                } else {
                    comparator = colName;
                }
                if (isNeg){
                    if (typeof comparator === "string"){
                        comparator = function(model) { return model.get(colName);}
                    }
                    comparator = util.reverseComparator(comparator);
                }
                return comparator;
            },
            setSortCol: function (sortCol, options) {
                var params = {
                    toggle: false,
                    resort: true
                };
                _.extend(params, options);
                if (this.sortCol === sortCol){
                    if (params.toggle){
                        this.sortCol = '-' + this.sortCol;
                    } else {
                        return this;  // already sorted suchly
                    }
                } else {
                    this.sortCol = sortCol;
                }

                this.comparator = this._getComparator();
                if (params.resort) {
                    this.sort();
                }
                return this;
            }
        });

        return {
            "UnifiedModel": UnifiedModel,
            "UnifiedCollection": UnifiedCollection
        }
    }
);