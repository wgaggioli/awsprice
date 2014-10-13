define(['backbone'], function (Backbone){
    "use strict";
    var AWSRouter, router;

    /**
     * AWSRouter
     *
     * The router for the application. Instantiated in AppView.
     *
     */
    AWSRouter = Backbone.Router.extend({
        routes: {
            "spot_spreads(/)(:type)": "spots",
            "instances(/)(:instance)": "instances",
            "regions(/)(:region)": "regions",
            "": "home"
        },
        home: function () {
            this.navigate("spot_spreads", {"trigger": true});
        }
    });
    router = new AWSRouter();

    return router;
});
