/**
 * Frequent Itemset mining with Apriori, FP-growth, ECLAT
 */
var fs = require ("fs");
var execSync = require('child_process').execSync;
var Baby = require ("babyparse")
var Apriori = require ("./apriori");
var Eclat = require ("./eclat");
var FpGrowth = require ("./fpGrowth");
var ALGORITHMS = ["a", "f", "e"];
var RESULTS_FILE = "frequentItemset.csv";

///////////////////////////////
// Main
if (process.argv[2] === "RUNNER") {
    fs.writeFileSync(RESULTS_FILE, "algorithm,dataSize,minSupport, minConfidence,column,time");
	var Ds = [500, 1000, 3000, 5000, 7000];
	var columnIndexes = [17,16,15];
	
    //var minSupports = [2,3];
    //var minConfidences = [.3,.4];
    	
    var minSupports = [3,4,5];
    var minConfidences = [.3,.4,.5];
    
    Ds.forEach(function(D){
		ALGORITHMS.forEach(function(a){
			minSupports.forEach(function(s){
				minConfidences.forEach(function(c){
					columnIndexes.forEach(function(i){
						execSync("node frequentItemsetMining.js "+a+" "+D+" "+s+" "+c+" "+i, {stdio:[0,1,2]});
					});
				});
			});
		});
    });
    console.log ("done");
	process.exit(0);
}
var algorithm = process.argv[2];
var dataSize = parseInt(process.argv[3]);
var minSupport = parseInt(process.argv[4]);
var minConfidence = parseFloat(process.argv[5]);
var COLUMN_INDEX = parseFloat(process.argv[6]);
if (ALGORITHMS.indexOf(algorithm) == -1) {
    console.error ("First argument should be algorith: a, f, or e");
	process.exit(1);
}
if (Number.isNaN(dataSize)) {
    console.error ("Second argument should be number of dataSize.");
	process.exit(1);
}
if (Number.isNaN(minSupport)) {
    console.error ("Third argument should be number of minSupport.");
	process.exit(1);
}
if (Number.isNaN(minConfidence)) {
    console.error ("Fourth argument should be number of minConfidence, 0 < n < 1");
	process.exit(1);
}
if (Number.isNaN(COLUMN_INDEX)) {
    console.error ("Fifth argument should be number COLUMN_INDEX");
	process.exit(1);
}

/**
 * Eliminate duplicates in given array
 */
var eliminateDuplicates = function(arr) {
	var i,
		len=arr.length,
		out=[],
		obj={};
	
	for (i=0;i<len;i++) {
		obj[arr[i]]=0;
	}
	for (i in obj) {
		out.push(i);
	}
	return out;
};

/**
 * Import the CSV
 */
var parseConfig = {
	delimiter: ",",	// auto-detect
	newline: "",	// auto-detect
	quoteChar: '"',
	header: false,

}
var parsed = Baby.parseFiles("testSalesData.csv", parseConfig);

/**
 * Build relevant objects
 */
var ORDER_ID_COLUMN_INDEX = 1;
var rows = parsed.data.slice(1);
var orderProductMap = {/** orderID: [product1, product2, etc] **/};
var orderProducts = [/** product1, product2, etc **/]
rows.forEach(function(row){
	var t = orderProductMap[row[ORDER_ID_COLUMN_INDEX]];
	if (t) {
        t.push (row[COLUMN_INDEX].replace(/,/g,""));
    } else if (row[COLUMN_INDEX]){
		orderProductMap[row[ORDER_ID_COLUMN_INDEX]] = [row[COLUMN_INDEX].replace(/,/g,"")];
	}
});
Object.keys(orderProductMap).forEach(function(k){
	orderProducts.push (eliminateDuplicates(orderProductMap[k]));	
});
orderProductMap = null; // won't need this anymore.
//console.log (orderProducts);

/**
 * Perform frequent itemset mining.
 */
var config = {
        minConfidence: minConfidence,
        minSupport: minSupport,
		log: true
    };
function writeOutFile(t) {
	fs.appendFileSync(RESULTS_FILE, "\n");
	// algorithm,dataSize,minSupport, minConfidence,column,time
	fs.appendFileSync(RESULTS_FILE, ([algorithm,dataSize, minSupport, minConfidence, COLUMN_INDEX,t]).join(","));
}
if (algorithm == "a") {
	var start = (new Date).getTime();
	apriori = new Apriori(orderProducts.slice(0,dataSize), config);
	apriori.initialize();
	apriori.generateAssociationRules();
	var t = (new Date).getTime() - start;
	console.log ("Done with Apriori in ",t ," ms")	
	writeOutFile (t);	
	process.exit(0);
}
if (algorithm == "f") {
	var start = (new Date).getTime();
	fp = new FpGrowth(orderProducts.slice(0,dataSize), config);
	fp.initialize();
	var t = (new Date).getTime() - start;
	console.log ("Done with FP growth in ",t ," ms");
	writeOutFile (t);	
	process.exit(0);
}
if (algorithm == "e") {
	var start = (new Date).getTime();
	eclat = new Eclat(orderProducts.slice(0,dataSize), config);
	eclat.initialize();
	eclat.generateAssociationRules();
	var t = (new Date).getTime() - start;
	console.log ("Done with eclat in ",t," ms");
	writeOutFile (t);	
	process.exit(0);
}
