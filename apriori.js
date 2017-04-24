/**
 * Full Apriori in pure JavaScript, which generates the frequent item sets
 * as well as the coorseponding association rules.
 *
 * Adapted from a very incomplete version of JavaScript Apriori:
 * 		https://github.com/dmarges/apriori/
 */
module.exports = Apriori;

function Apriori(data, options) {

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

Apriori.prototype = {
	
	log: function(s){
		if (this.options.log) {
            console.log (s);
        }
	},

	/**
	 * Initializes the frequestItems
	 */
    initialize: function() {
		var frequentItems = [];
		
		var singleUniqueDataItems = this.findUniqueDataItemsSingle();
		//this.log (singleUniqueDataItems);
		
		frequentItems = frequentItems.concat(singleUniqueDataItems);
		
		var singleJoinedUnique = this.joinedUniqueItems(singleUniqueDataItems);
		//this.log (singleJoinedUnique);
		
		var singleCountedUnique = this.countedUniqueSets(singleJoinedUnique, true)
		//this.log (singleCountedUnique);
		
		frequentItems = frequentItems.concat(singleCountedUnique);
		
		var lastCounted = singleCountedUnique;
		var joined, lastJoined;
		while (true) {
			lastJoined = joined;
			joined = this.joinedUniqueItemsMulti(lastCounted);
			//this.log (joined);
			if ( (! joined ) || joined.length <= 0) {
                break;
            }
			lastCounted = this.countedUniqueSets(joined, true);
			frequentItems = frequentItems.concat(lastCounted);
			//this.log (lastCounted);
		};
		
		this.log ("Frequent items generated:");
		this.log (frequentItems);
		this.frequentItems = frequentItems;
        
        this.log ("Association rules items generated:");
        console.log (this.generateAssociationRules());
    },
	
	/**
	 * Generates asssociation rules off of the frequentItems
	 */
	generateAssociationRules: function(){
		var associationRules = [];
		this.frequentItems.forEach(function(item){
			var subSets = this.subSets(item.items,1);
			subSets.forEach(function(subSet){
				var subSetObj = this.getSubSetFromFrequentItems(subSet);
				if (!subSetObj) {
                    console.error ("No matching subset found for ",subSet);
					return;
                }
				var confidence = item.count / subSetObj.count;
				if (confidence >= this.options.minConfidence) {
                    associationRules.push ({subSet: subSet, given: this.setDiff(item.items,subSet), confidence: confidence});
                    //associationRules.push ({subSet: subSet, confidence: confidence});
                }
			}, this);			
		}, this);        
        return associationRules;
	},
	
	/**
	 * Given a subSet, find this subSet in our frequentItems,
	 * and return the whole object, which contains the count.
	 */
	getSubSetFromFrequentItems: function(subSet){
		var result;
		this.frequentItems.some(function(item){
			if (item.items.sort().join(',') === subSet.sort().join(',')) {
                result = item;
				return true;
            }
		});
		return result;
	},

	/**
	 * DB scan for unique single items
	 *
	 * We maintain 2 structures:
	 * 		uniqueItems is the first strucure to capture uniques
	 * 		supportedUniqueItems contains the uniqueItems that are supported
	 * 
	 */
    findUniqueDataItemsSingle: function() {
        var uniqueItems = {};
		var supportedUniqueItems = {};
        var trainingData = this.trainingData;

        for(var itemSet = 0; itemSet < trainingData.length; itemSet++) {
            for(var item = 0; item < trainingData[itemSet].length; item++) {
				var v = trainingData[itemSet][item];
				if (supportedUniqueItems[v]) {
                    supportedUniqueItems[v] ++;
                } else if (uniqueItems[v]) {
                    uniqueItems[v] ++;
					var supV = uniqueItems[v];
					if (supV >= this.options.minSupport) {
                        supportedUniqueItems[v] = uniqueItems[v]; // swap
						delete uniqueItems[v]; // delete
                    }
                } else {
                    uniqueItems[v] = 1;					
				}
            }
        }

        return Object.keys(supportedUniqueItems).map(function (key) {
			return {items: [key], count: supportedUniqueItems[key]}
		});;
    },
	
	/**
	 * Given an item set, iterate the training data and count
	 * the occurences of the item sets in the data.
	 * Modifies and Returns the given set.
	 */
    countedUniqueSets: function(set, prune) {
        var uniqueItems = {};
		var supportedUniqueItems = {};
        var trainingData = this.trainingData;

        for(var itemSet = 0; itemSet < trainingData.length; itemSet++) {
			// executed for each data row in the data
			var row = trainingData[itemSet]; // list of string
            for(var item = 0; item < set.length; item++) {
				// executed for each item in the given unique items set
				var setItems = set[item].items;
				var included = true;
				var count = 0;
	            for(var v = 0; v < setItems.length; v++) {
					// executed for each unique item from the unique item set
					var setItem = setItems[v];
					included = included && (row.indexOf(setItem) > -1)
					if (!included) {
						break;
					}
				}
				if (included) {
					set[item].count ++;                    
                }
            }
        }
		
		if (prune) {
			var minSupport = this.options.minSupport;
            set = set.filter(function(i){ if (i.count >= minSupport) return i });
        }
		return set;
    },
	
	/**
	 * Results in list of unique itemSets
	 */
	joinedUniqueItems: function(itemsMap){
		var res = [];
		for (var i = 0; i < itemsMap.length; i++){
			for (var k = i+1; k < itemsMap.length; k++){
				res.push ({ items: itemsMap[i].items.concat(itemsMap[k].items), count: 0});
			} 
		}
		return res;
	},
	
	/**
	 * Results in list of unique itemSets
	 */
	joinedUniqueItemsMulti: function(itemsMap){
		if (itemsMap.length <= 0) return;
		var res = [];
		var outCnt = itemsMap[0].items.length + 1;
		for (var i = 0; i < itemsMap.length; i++){
			for (var k = i+1; k < itemsMap.length; k++){
                var foo = this.eliminateDuplicates(itemsMap[i].items.concat(itemsMap[k].items))
				if (foo.length == outCnt) res.push (foo.sort());
			} 
		}
		res = this.multiDimensionalUnique(res);
		
		// prune
		var resPruned = [];
		res.forEach(function(r){ // for each item in the set
			var subs = Apriori.prototype.subSets(r,outCnt-1); // factor out the subsets
			var itemMatch = true;
			subs.some(function(s){ // we only want to keep items where all subsets are optimal
				var subMatch = false;
				itemsMap.some(function(i){
                    subMatch = i.items.sort().join(',') === s.sort().join(',');
					if (subMatch) {
                        return true;
                    }
				});
				if (!subMatch) {
					itemMatch = false;
                    return true;
                }
			});
			if (itemMatch) {
				resPruned.push ({ items: r, count: 0});
			}
		});
		
		return resPruned;
	},
	
	/**
	 * Given an array a and a min value,
	 * returns all subsets of a that are of at least min length,
	 * excluding a.
	 */
	subSets: function(a, min) {
		var fn = function(n, src, got, all) {
			if (n == 0) {
				if (got.length > 0) {
					all[all.length] = got;
				}
				return;
			}
			for (var j = 0; j < src.length; j++) {
				fn(n - 1, src.slice(j + 1), got.concat([src[j]]), all);
			}
			return;
		}
		var all = [];
		for (var i = min; i < a.length; i++) {
			fn(i, a, [], all);
		}
		return all;
	},
	
	/**
	 * Given multi-d arr, returns only the unique items.
	 */
	multiDimensionalUnique: function(arr) {
		var uniques = [];
		var itemsFound = {};
		for(var i = 0, l = arr.length; i < l; i++) {
			var stringified = JSON.stringify(arr[i]);
			if(itemsFound[stringified]) { continue; }
			uniques.push(arr[i]);
			itemsFound[stringified] = true;
		}
		return uniques;
	},
	
	/**
	 * For given arr, eliminate duplicates.
	 */
	eliminateDuplicates: function(arr) {
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
	},
    
    
    /**
     * Returns given set wtih subSet Removed
     */
    setDiff: function(set,subSet){
        var result = []
        set.forEach(function(item){
            if (subSet.indexOf(item) == -1) {
                result.push (item);
            }
        });
        return result;
    }

};

if (require.main === module) {
	var trainingSet = [
		['I1','I2','I5'],
		['I2','I4'],
		['I2','I3'],
		['I1','I2','I4'],
		['I1','I3'],
		['I2','I3'],
		['I1','I3'],
		['I1','I2','I3','I5'],
		['I1','I2','I3']
	];
	
	apriori = new Apriori(trainingSet, {log: true});
	apriori.initialize();
}