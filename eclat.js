/**
 * Eclat in pure JavaScript
 * 
 */

module.exports = Eclat;
function Eclat(data, options) {

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

Eclat.prototype = {
    
	log: function(s){
		if (this.options.log) {
            console.log (s);
        }
	},

	/**
	 * Initializes the vertical data structure
	 */
    initialize: function() {
		var frequentItems = {};
        var verticalItemsFrequent = this.generateInitialVerticalFormat ();
        
        // add single items to frequentItems
        Object.assign(frequentItems, verticalItemsFrequent);
        var i = 2;
        
        while (true){
            verticalItemsFrequent = this.nextFrequentVerticalItems(verticalItemsFrequent, i);
            // stopping condition
            if ( (!verticalItemsFrequent) || (Object.keys(verticalItemsFrequent).length === 0) || i===10){
                break; 
            }
            // add new items into frequentItems
            Object.assign(frequentItems, verticalItemsFrequent);
            i++;
        }
        this.frequentItems = frequentItems;
        //this.log ("Frequent Items --------------");
        //this.log (frequentItems);
        this.log ("Association Rules --------------");
        this.log (this.generateAssociationRules());
    },
    
    /**
     * Generates the next level of vrequent verticale items,
     * base on the given verticalItems. We will generate items
     * of size i.
     * 
     * Structure is an object keyed to a basic hash of the itemset values.
     * { itemSetHashValue: { TID_set: [list of transaction IDs supporting the itemSetHashValue] } }
     */
    nextFrequentVerticalItems: function (verticalItems, i){        
		var supportedUniqueItems = {};
        
        var itemSetHashValues = Object.keys(verticalItems);
        var index = 0;
        var len = itemSetHashValues.length;
        
        itemSetHashValues.forEach (function(itemSetHashValue){
            var TID_set = verticalItems[itemSetHashValue];
            for (var j = index + 1; j < len; j++) {
                var itemSetHashValue2 = itemSetHashValues[j];
                var TID_set2 = verticalItems[itemSetHashValue2];
                var joinedItemSet = this.joinItemSetStrings(itemSetHashValue, itemSetHashValue2);
                if (joinedItemSet.length === i) {
                    var hashValue = joinedItemSet.join();
                    var joinedTransactions = this.joinTransactions(TID_set, TID_set2);
                    if (!supportedUniqueItems[hashValue] && joinedTransactions.length >= this.options.minSupport) {
                        supportedUniqueItems[hashValue] = joinedTransactions;
                    }
                }
            }
            index++;
        }, this);
        return supportedUniqueItems;
    
    },
    
    /**
     * Given str1 and str2, return a joined list of items.
     *
     * String format: i1,i2,i3
     *
     * Example:
     *  str1 i1, i2
     *  str2 i2, i3
     *  returns [i1, i2, i3]
     */
    joinItemSetStrings: function(str1, str2){
        var arr1 = str1.split(",");
        var arr2 = str2.split(",");
        var result = arr1.slice();
        arr2.forEach(function(item){
            if (result.indexOf(item) === -1){
                result.push(item);
            }
        });        
        return result.sort();
    },
    
    joinTransactions: function(TID_set, TID_set2){
        var result = [];
        TID_set.forEach(function(set){
            if (TID_set2.indexOf(set) >= 0 && result.indexOf(set) === -1){
                result.push(set);
            }
        });        
        return result.sort();
    },
    
    /**
     * Generates vertical format from horizontal data, keeping only the frequent items.
     * Structure is an object keyed to a basic hash of the itemset values.
     * { itemSetHashValue: { TID_set: [list of transaction IDs supporting the itemSetHashValue] } }
     * 
     */
    generateInitialVerticalFormat: function(){
        var uniqueItems = {};
		var supportedUniqueItems = {};
        var trainingData = this.trainingData;

        for(var itemSet = 0; itemSet < trainingData.length; itemSet++) {
            for(var item = 0; item < trainingData[itemSet].length; item++) {
				var v = trainingData[itemSet][item];
				if (supportedUniqueItems[v]) {
                    supportedUniqueItems[v].push (itemSet+1);
                } else if (uniqueItems[v]) {
                    uniqueItems[v].push (itemSet+1);
					var supV = uniqueItems[v].length;
					if (supV >= this.options.minSupport) {
                        supportedUniqueItems[v] = uniqueItems[v]; // swap
						delete uniqueItems[v]; // delete
                    }
                } else {
                    uniqueItems[v] = [itemSet+1] ;					
				}
            }
        }

        return supportedUniqueItems;
    },
	
	/**
	 * Generates asssociation rules off of the frequentItems
	 * 
	 * Structure of frequent items
	 *  { 'I2': [ 1, 2, 3, 4, 6, 8, 9 ],
          'I1': [ 1, 4, 5, 7, 8, 9 ],
          'I4': [ 2, 4 ],
          'I3': [ 3, 5, 6, 7, 8, 9 ],
          'I2,I3': [ 3, 6, 8, 9 ],
          'I2,I5': [ 1, 8 ],
          'I1,I3': [ 5, 7, 8, 9 ],
          'I1,I5': [ 1, 8 ] }
        }
	 */
	generateAssociationRules: function(){
		var associationRules = [];
        var itemSetKeys = Object.keys(this.frequentItems);
        itemSetKeys.forEach(function(key){
            var transactionList = this.frequentItems[key];
            var transactionListCount = transactionList.length;
            var set = key.split(",");
            if (set.length == 1) return;
            var subSets = this.subSets(set,1);
            subSets.forEach(function(subSet){
                var subSetObj = this.frequentItems[subSet];
				if (!subSetObj) {
                    console.error ("No matching subset found for ",subSet);
					return;
                }
                var confidence = transactionListCount / subSetObj.length;
				if (confidence >= this.options.minConfidence) {
					//this.log (subSet+" -> "+confidence)
                    associationRules.push ({subSet: subSet, given: this.setDiff(set,subSet), confidence: confidence});
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
			var subs = Eclat.prototype.subSets(r,outCnt-1); // factor out the subsets
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
	 * For given arr, return a new arr with duplicates eliminated.
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
    
    eclat = new Eclat(trainingSet, {log: true});
    eclat.initialize();
}