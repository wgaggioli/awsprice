require.config({
    "paths": {
        "underscore": "js/underscore-min",
        "backbone": "js/backbone-min",
        "jquery": "js/jquery-1.11.1.min",
        "bootstrap": "js/bootstrap.min",
        "flot": "js/jquery.flot.min",
        "flot-orderBars": "js/jquery.flot.orderBars",
        "flot-selection": "js/jquery.flot.selection.min"
    },
    "shim": {
        "backbone": ["underscore", "jquery"],
        "bootstrap": ["jquery"],
        "flot": ["jquery"],
        "flot-orderBars": ["flot"],
        "flot-selection": ["flot"]
    }
});

require(['views/app'], function (AppView) {
    var app = new AppView();  // start the app
});