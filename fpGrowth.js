/**
 * Full FpGrowth in pure JavaScript
 * 
 */

if (typeof module != 'undefined') module.exports = FpGrowth;
function FpGrowth(data, options) {

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

FpGrowth.prototype = {
    
	log: function(s){
		if (this.options.log) {
            console.log (s);
        }
	},

	/**
	 * Initializes the 1-frequestItems and tree
	 *
	 */
    initialize: function() {		
        //The first scan of database is same as Apriori, which derives the set of 1-itemsets & their support counts.
        //The set of frequent items is sorted in the order of descending support count
		this.singleUniqueDataItems = this.findUniqueDataItemsSingle();
		this.log ("singleUniqueDataItems");
        this.log (this.singleUniqueDataItems);
                
        //  Scan the database D a second time.
        // (First time we scanned it to create 1-itemset and then L).
        this.fpScan();
        
        this.mineFpTree();
        
        console.log ("allFrequentPatterns\n",this.allFrequentPatterns)
        
        //console.log ("association Rules\n",this.generateAssociationRules());
        
    },
	
	/**
	 * Generates asssociation rules off of the frequentItems
	 *
	 * allFrequentPatterns =
	 * {'I2,I5': 2,
        'I1,I5': 2,
        'I1,I2,I5': 2,
        'I2,I4': 2,
        'I2,I3': 4,
        'I1,I3': 4,
        'I1,I2,I3': 2,
        'I1,I2': 4 }
	 */
	generateAssociationRules: function(){
		var associationRules = [];
		Object.keys(this.allFrequentPatterns).forEach(function(key){
            var count = this.allFrequentPatterns[key];
            var items = key.split (",");
			var subSets = this.subSets(items,1);
			subSets.forEach(function(subSet){
				var subSetObj = this.allFrequentPatterns[subSet] || this.getSubSetFromSingleUniqueDataItems(subSet);
				if (!subSetObj) {
                    console.error ("No matching subset found for ",subSet);
					return;
                }
				var confidence = count / subSetObj.count;
				if (confidence >= this.options.minConfidence) {
                    associationRules.push ({subSet: subSet, given: this.setDiff(items,subSet), confidence: confidence});
                }
			}, this);			
		}, this);        
        return associationRules;
	},
    
	/**
	 * Given a subSet, find this subSet in our frequentItems,
	 * and return the whole object, which contains the count.
	 */
	getSubSetFromSingleUniqueDataItems: function(subSet){
		var result;
		this.singleUniqueDataItems.some(function(item){
			if (item.label === subSet.join(',')) {
                result = item;
				return true;
            }
		});
		return result;
	},
    
    mineFpTree: function(){
        var allFrequentPatterns = {};
        var l = this.singleUniqueDataItems.length;
        // iternate singleUniqueDataItems (L) bottom up
        for (var i = l-1; i >= 0; i--) {
            //this.log (this.singleUniqueDataItems[i])
            
            var targetNode = this.singleUniqueDataItems[i];
            
            // [{count: N, items: [{label: x}]}]
            var conditionalPatternBase = this.conditionalPatternBaseForNode(targetNode);
     
            this.log ("\nconditionalPatternBase for "+targetNode.label);
            this.log (conditionalPatternBase);
            
            // {label: count}
            var conditionalFpTree = this.conditionalFpTreeForBase (conditionalPatternBase);
     
            this.log ("conditionalFpTree for "+targetNode.label);
            this.log ( JSON.stringify(conditionalFpTree) );
            
            var frequentPatterns = this.generateFrequentPatterns (conditionalFpTree, targetNode.label);
            
            this.log ("frequentPatterns for "+targetNode.label);
            this.log ( JSON.stringify(frequentPatterns) );
            
            Object.assign (allFrequentPatterns, frequentPatterns);
        }
        this.allFrequentPatterns = allFrequentPatterns;
    },
    
    /**
     * conditionalFpTree:
     * [
     *   {"label":"I2","count":4,"children":
     *     [{"label":"I1","count":2,"children":[]}]
     *   },
     *   {"label":"I1","count":2,"children":[]}
     *  ]
     */
    generateFrequentPatterns: function(conditionalFpTree, label){
        var result = {};
        conditionalFpTree.forEach(function(branch){
            var patternMap = this.mineBranchForAllPatterns(branch); // {I2: 2, I1: 2}
            var subSetsInc = this.subSets(Object.keys(patternMap).concat (label),2,true).filter(function(f){ if (f.indexOf (label)>=0) return f; });
            subSetsInc.forEach (function(sub){
                var val;
                sub.forEach(function(itm){
                    if (!val) {
                        val = patternMap[itm];
                    } else if (patternMap[itm]) {
                        val = Math.min (val,patternMap[itm]);
                    }
                }, this);
                var key = sub.sort().join(',');
                if (result [key]){
                    result [key] = result [key] + val;
                } else {
                    result [key] = val;
                }
            }, this);
        }, this);
        return result;
    },
    
    mineBranchForAllPatterns: function (branch){
        var result = {};
        var cond = true;
        var node = branch
        while (cond) {
            if (node.count >= this.options.minSupport) {
                result[node.label] = node.count;
            }
            if (!node.children[0]) {
                cond = false;
            } else {
                node = node.children[0];
            }
        }
        return result;
    },
    
    /**
     * Base: [  { items: [ 'I2' ], count: 2 },
                { items: [ 'I1' ], count: 2 },
                { items: [ 'I2', 'I1' ], count: 2 } ]
     * Result: 
     * 
     */
    conditionalFpTreeForBase: function (base){
        // First, create the root of the tree, labeled with “null”.
        var fpTreeRoot = {"children": [], label: null};
        // Go across each pattern in the base
        base.forEach(function(row){
            // row: { items: [ 'I2', 'I1' ], count: 2 }
            var lastNode = fpTreeRoot ;
            row.items.forEach(function(item){
                // go across each item in the pattern row
                // item: 'I2'
                var existingNode = this.commonPrefixForItemAndNode (item, lastNode);
                if (existingNode) { // if existing node is found, increment its count, this becomes the lastNode
                    existingNode.count = existingNode.count + row.count;
                    lastNode = existingNode;
                } else { // create a new node with count row.count and this is our lastNode
                    var obj = {label: item, count: row.count, children: []};
                    lastNode.children.push (obj);
                    //obj.parent = lastNode;
                    lastNode = obj;             
                }
            },this);
        }, this);
        return fpTreeRoot.children;
    },
        
    conditionalPatternBaseForNode: function(node){
        var leaves = this.supportedUniqueItemsMap[node.label].leaves;
        var paths = []; // building a list of paths for node, based on all leaves
        leaves.forEach (function(leaf){
            var path = {items: [], count: leaf.count}; // path obj, we will add each label to item
            var currentNode = leaf;
            while (true) {
                if (! (currentNode == leaf)) { // we dont want the suffix
                    path.items.push (currentNode.label);
                }
                if (currentNode.parent && !(currentNode.parent.label == null)) {
                    currentNode = currentNode.parent;
                } else {
                    break;
                }
            }
            path.items.reverse();
            if (path.items.length > 0) {
                paths.push(path);
            }
        }, this);
        return paths;
    },
    
    fpScan: function(){
        var id = 1000;
        // First, create the root of the tree, labeled with “null”.
        this.fpTreeRoot = {"children": [], label: null};
        // The items in each transaction are processed in L order
        // (i.e., sorted according to descending support count),
        // and a branch is created for each transaction.
        this.trainingData.forEach(function(row){
            var _this = this;
            row = row.sort (function(a,b){ // L sort
                return (_this.supportedUniqueItemsMap[b] ? _this.supportedUniqueItemsMap[b].count : _this.unsupportedUniqueItemsMap[b].count) -
                        (_this.supportedUniqueItemsMap[a] ? _this.supportedUniqueItemsMap[a].count : _this.unsupportedUniqueItemsMap[a].count);
            });
            var lastNode = _this.fpTreeRoot;
            row.forEach(function(item){
                var existingNode = this.commonPrefixForItemAndNode (item, lastNode);
                if (existingNode) { // if existing node is found, increment its count, this becomes the lastNode
                    existingNode.count++;
                    lastNode = existingNode;
                } else { // create a new node with count 1 and this is our lastNode
                    var obj = {label: item, count: 1, children: [], id: id};
                    id ++;
                    lastNode.children.push (obj);
                    obj.parent = lastNode;
                    lastNode = obj;             
                }
                var existingLeaf;
                var targetItem = (this.supportedUniqueItemsMap[item] || this.unsupportedUniqueItemsMap[item]);
                targetItem.leaves.some(function(l){
                    if (l.id == lastNode.id){
                        existingLeaf = l;
                        return true;
                    }
                });
                if (!existingLeaf) {
                    targetItem.leaves.push (lastNode);
                }
            },_this);
        }, this);
    },
    
    /**
     * Looks for "item" as a common prefix in the children of node,
     * and returns one if found.
     */
    commonPrefixForItemAndNode: function (item, node){
        if ( (!node.children) || node.children.length === 0 ) {
            return;
        }
        var result;
        node.children.some(function(childNode){
            if (childNode.label === item){
                result = childNode;
                return true;   
            }
        },this);
        return result;
    },
    
    printTreeAtIndex: function(i){
        //this.log (JSON.stringify(this.fpTreeRoot.children));
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
                    supportedUniqueItems[v].count ++;
                } else if (uniqueItems[v]) {
                    uniqueItems[v].count ++;
					var supV = uniqueItems[v].count;
					if (supV >= this.options.minSupport) {
                        supportedUniqueItems[v] = uniqueItems[v]; // swap
						delete uniqueItems[v]; // delete
                    }
                } else {
                    uniqueItems[v] = {count: 1, leaves: []};
				}
            }
        }
        this.supportedUniqueItemsMap = supportedUniqueItems;
        this.unsupportedUniqueItemsMap = uniqueItems;
        var result = Object.keys(supportedUniqueItems).map(function (key) {
			return {label: key, count: supportedUniqueItems[key].count}
		});
        result = result.sort(function(a,b){
            return b.count - a.count;
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
			var subs = FpGrowth.prototype.subSets(r,outCnt-1); // factor out the subsets
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
	subSets: function(a, min, includeA) {
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
        if (includeA) {
            all.push(a);
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

if (typeof require === 'undefined' || require.main === module) {
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
    
    fpGrowth = new FpGrowth(trainingSet, { 
                                            minConfidence: .4,
                                            minSupport: 2,
                                            log: true
                                        });
    fpGrowth.initialize();
}