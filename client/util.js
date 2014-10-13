define([], function () {
    var typeLabelMap = {
        "general": "General Purpose",
        "compute": "Compute Optimized",
        "gpu": "GPU Instances",
        "hiMem": "Memory Optimized",
        "storage": "Storage Optimized"
    };

    /* round to specified number of places */
    function roundTo(num, places) {
        var modifier = Math.pow(10, places);
        return Math.round(num * modifier) / modifier;
    }

    /* for reverse sorting */
    function reverseComparator(sortByFunc) {
        return function(a, b) {
            var aVal = sortByFunc(a);
            var bVal = sortByFunc(b);

            if (aVal === undefined){
                return -1;
            }
            if (bVal === undefined){
                return 1;
            }

            if (aVal < bVal){
                return 1;
            }
            if (aVal > bVal) {
                return -1;
            }
            return 0;
        };
    }

    /* arithmetic mean */
    function mean(arr) {
        var i, sum = 0.;
        if (!arr.length)
            return null;
        for (i = 0; i < arr.length; i++) {
            sum += arr[i];
        }
        return sum / arr.length;
    }

    return {
        typeLabelMap: typeLabelMap,
        roundTo: roundTo,
        reverseComparator: reverseComparator,
        mean: mean
    }
});