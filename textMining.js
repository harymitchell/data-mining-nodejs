/**
 * Text Mining on Amazon Review using Kmeans
 */

var KMeans = require ("./kMeans");
var Baby = require ("babyparse");
var fs = require ("fs");
var execSync = require('child_process').execSync;

if (process.argv[2] === "RUNNER") {
    var dataSizes = [10, 20, 30, 40, 50];
    var ks = [3,4];
    // var iterators = [100, 5000, 1000, 2000, 5000, 10000, 20000, 50000];
    // var ks = [3, 4, 5, 6, 7, 8, 9, 10];
    
    dataSizes.forEach(function(s){
        ks.forEach(function(k){
		    execSync("node textMining.js "+s+" "+k, {stdio:[0,1,2]});
        }); 
    });
    console.log ("done");
	process.exit(0);
}

var dataSize = parseInt(process.argv[2]);
var K = parseInt(process.argv[3]);

if (Number.isNaN(dataSize)) {
    console.error ("First argument should be dataSize.", process.argv[2], dataSize);
	process.exit(1);
}
if (Number.isNaN(K)) {
    console.error ("Second argument should be K clusters.", process.argv[3], K);
	process.exit(1);
}

var parseConfig = {
	delimiter: ",",	// auto-detect
	newline: "",	// auto-detect
	quoteChar: '"',
	header: false,

}
var parsed = Baby.parseFiles("transformedText.txt", parseConfig);
var data = parsed.data.slice(0,dataSize);
var TermDocumentMap = { /** word: {documentIndex: countOfWord]  **/ };

var i = 0;
data.forEach(function(d){
    d[0].split(" ").forEach (function(word){
        var mapItem = TermDocumentMap[word];
        if (mapItem) {
            if (mapItem[i]) {
                mapItem[i]++;
            } else {
                mapItem[i] = 1;
            }
        } else {
            TermDocumentMap[word] = { };
            TermDocumentMap[word][i] = 1;
        }
    });
    i++;
});

/**
 * Build TermDocumentMatrix
 *
 * from TermDocumentMap =
 *  {
 *    disappointed: { '14': 1, '17': 1 },
 *    supposed: { '14': 1, '18': 1 } ...
 *  }
 */
var TermDocumentMatrix = new Array(data.length); /** [count, count, count ...] , [count, count, count ...] **/
var termIndex = 0;
var TermDocumentMapKeys = Object.keys(TermDocumentMap);
var len = TermDocumentMapKeys.length;
TermDocumentMapKeys.forEach(function(term){
    var docMap = TermDocumentMap[term];
    Object.keys(docMap).forEach(function(docIndex){
        if (typeof TermDocumentMatrix[docIndex] != "object") {
            TermDocumentMatrix[docIndex] = new Array(len);
            TermDocumentMatrix[docIndex].fill(0);
        }
        TermDocumentMatrix[docIndex][termIndex] = docMap[docIndex];
    });
    termIndex++;
});

kMeans = new KMeans(TermDocumentMatrix, { 
                                         k: K,
                                         log: true
                                     });
var clusters = kMeans.initialize();

var fileName = "kMeans_out_"+K+"_"+dataSize+".csv";
clusters.forEach (function(c){
	fs.appendFileSync(fileName, c.join(","));
	fs.appendFileSync(fileName, '\n');
});

