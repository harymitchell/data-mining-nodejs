/**
 * Full KMeans in pure JavaScript
 * 
 */

var euclideanDistance = require ("euclidean-distance");

if (typeof module != 'undefined') module.exports = KMeans;
function KMeans(data, options) {

    this.trainingData = data;

    options = options || {};

    defaults = {
        minConfidence: .4,
        minSupport: 2
    };

    this.options = extend(options, defaults);

    function extend(supplied, defaults) {
        if(supplied) {
            for(var key in defaults) {
                var val = supplied[key];

                if(typeof val === "undefined") {
                    supplied[key] = defaults[key];
                }
            }
        }

        return supplied;
    }
}

KMeans.prototype = {
    
	log: function(s){
		if (this.options.log) {
            console.log (s);
        }
	},

	/**
	 * Performs k-Means on trainingData
	 * 
        //var centers = [this.trainingData[1], this.trainingData[4], this.trainingData[6]]; // data at D2, D5, D7
        //var centers = [this.trainingData[0], this.trainingData[3], this.trainingData[6]];
	 *
	 */
    initialize: function() {		
        // Random seeds
        var k = this.options.k;
        var centers = [];
        var randomIndexes = [];
        while (randomIndexes.length < k) {
            var rand = Math.floor(Math.random() * this.trainingData.length);
            if (randomIndexes.indexOf (rand) == -1) {
                centers.push (this.trainingData[rand]);
                randomIndexes.push (rand);
            }               
        }
        
        var cond = true;
        var lastClusters = [];
        var round = 1;
        while (cond) {
            var clusters = new Array (k);
            var distMatrix = [];
            var i = 0;
            // cluster the data points
            this.trainingData.forEach(function(d){
                // for each data item
                distMatrix[i] = []; // [d1, d2, ... dn, minDist, movement]
                var minDist = -1
                var movement;
                // calculate euclidean distance to each center
                var centerIndex = 0;
                centers.forEach(function(center){ // center is Array of data points 
                    var dist = euclideanDistance(d, center);
                    // add the distance to the distMatrix
                    distMatrix[i].push(dist);
                    // keep up with the minimum distance as we go
                    if (minDist<0) {
                        minDist = dist;
                        movement = centerIndex;
                    } else if (dist < minDist) {
                        minDist = dist;   
                        movement = centerIndex;                 
                    }
                    centerIndex++;
                },this);
                distMatrix[i].push(minDist);
                distMatrix[i].push(movement);
                if (clusters[movement]) {
                    clusters[movement].push (i);
                } else {
                    clusters[movement] = [i];
                }
                i++;
            },this);       
            //console.log ("distMatrix\n", distMatrix);
            
            if (JSON.stringify(clusters) == JSON.stringify(lastClusters)) {
                cond = false;
                //console.log ("clusters\n", clusters);
                break;
            }
            lastClusters = clusters;
            
            // re-calculate centroid means
            // clusters = [ [ 0, 1, 5, 8, 9 ], [ 4, 7 ], [ 2, 3, 6 ] ]
            var newCenters= []; // [[m1,m2...]...[m1,m2,m3]]
            i = 0;
            clusters.forEach(function(cluster){
                // cluster = [ 0, 1, 5, 8, 9 ]
                var newC = [];
                for (var w=0; w < this.trainingData[0].length; w++){
                    var sum = 0;
                    cluster.forEach(function(dataIndex){
                        sum += this.trainingData[dataIndex][w];    
                    }, this);
                    var mean = sum / cluster.length;
                    newC.push(mean);
                }
                newCenters.push(newC);
                i++;  
            },this);
            
            //console.log ("newCenters\n", newCenters);
            centers = newCenters;
            round++;
        }
        this.log ("Finished in "+round+" rounds");
        return clusters;
    },
};

if (typeof require === 'undefined' || require.main === module) {


    var trainingSet = [
//       online, festival, book, flight, delhi
/** D1 **/       [1,0,1,0,1],
/** D2 **/       [2,1,2,1,1],
/** D3 **/       [0,0,1,1,1],
/** D4 **/       [1,2,0,2,0],
/** D5 **/       [3,1,0,0,0],
/** D6 **/       [0,1,1,1,2],
/** D7 **/       [2,0,1,2,1],
/** D8 **/       [1,1,0,1,0],
/** D9 **/       [1,0,2,0,0],
/** D10**/       [0,1,1,1,1]
    ];
    
    var trainingSet2 = [ [2,10], [2,5], [8,4], [5,8], [7,5], [6,4], [1,2], [4,9] ];

    
    kMeans = new KMeans(trainingSet, { 
                                         k: 3,
                                         log: true
                                     });
    kMeans.initialize();
}