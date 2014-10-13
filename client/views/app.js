define(
    ['jquery', 'backbone', 'router', 'views/spotview', 'views/regionview', 'views/tableview', 'model'],
    function ($, Backbone, router, SpotView, RegionView, InstanceTableView, model) {
        "use strict";
        var AppView;

        /***
         * AppView
         *
         * Responsible for coordinating the rendering of the entire application.
         *
         */
        AppView = Backbone.View.extend({
            el: $("#mainContainer"),
            navList: null,
            initialize: function () {
                this.collection = new model.UnifiedCollection();
                this.loadedPromise = this.collection.fetch();

                this.$container = this.$("#mainContent");
                this.views = {
                    "spots": new SpotView(this.collection),
                    "instances": new InstanceTableView(this.collection),
                    "regions": new RegionView(this.collection)
                };
                this.curView = null;

                /* bind events */
                this.bindNav();

                /* initialize routing */
                this.listenTo(router, "route", this.renderView);
                Backbone.history.start({pushState: true, root: "/"});
            },
            renderView: function (viewType, args) {
                var that = this;
                if (this.views.hasOwnProperty(viewType)){
                    this.trigger("renderView:" + viewType, args);
                    this.trigger("renderView", viewType, args);
                    this.loadedPromise.then(function (){
                        var curView = that.views[viewType],
                            isNew = that.curView !== curView;
                        if (isNew){
                            that.$container.html(curView.el);
                        }
                        curView.render(args);
                        if (isNew){
                            that.curView = curView;
                            that.curView.delegateEvents();
                        }
                    });
                }
                return this;
            },
            activateNav: function (viewType) {
                /* viewType should be one of: spots, instances, regions */
                var navClass = viewType + "-nav-item";
                this.navList.find("li").each(function (i, li){
                    var $li = $(li);
                    if ($li.hasClass(navClass)) {
                        $li.addClass("active");
                    } else {
                        $li.removeClass("active");
                    }
                });
            },
            bindNav: function () {
                this.navList = this.$("#mainNav").find("ul");
                this.navList.find("a").on("click", function () {
                    router.navigate($(this).attr("href"), {"trigger": true});
                    return false;
                });
                this.listenTo(this, "renderView", function (viewType){
                    this.activateNav(viewType);
                });
            }
        });

        return AppView;
    }
);