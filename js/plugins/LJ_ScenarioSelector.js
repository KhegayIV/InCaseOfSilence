/*:
 * @plugindesc Base for other scripts that need random selector with weights and cooldowns
 * @author L'James
 */


var $ljScenarioCooldowns = $ljScenarioCooldowns || {};
var $ljScenarios = $ljScenarios || {};
 
function Scenario() {
	this.initialize.apply(this, arguments)	
}

Scenario.prototype.initialize = function(file) {
	this._file = file
	this.loadFile(file)
	$ljScenarioCooldowns[this._file] = $ljScenarioCooldowns[this._file] || {}
}

Scenario.get = function(name) {
	return $ljScenarios[name];
}

Scenario.create = function(name, file) {
	if (!file) {
		file = "data/"+name+".json";
	}
	$ljScenarios[name] =  new Scenario(file);
}

Scenario.prototype.onLoad = function(object) {
	this._source = this.parseFile(object);
}

Scenario.prototype.loadFile = function(file, onLoad) {
	var self = this;
	var xhr = new XMLHttpRequest();
	xhr.open('GET', file);
	xhr.overrideMimeType('application/json');
	xhr.onload = function() {
		if (xhr.status < 400) {
			self.onLoad(JSON.parse(xhr.responseText));
		}
	};
	xhr.onerror = function() { throw new Error("There was an error loading the file '" + file + "'."); };
	xhr.send();
};



Scenario.prototype.parseFile = function(object) {
	var result = {};
	
	var findInArr = function(arr, getter) {
		for (var i = arr.length - 1; i >= 0; --i) {
			var item = arr[i];
			if (getter(item) !== undefined) {
				return getter(item);
			}
		}
	}
	
	var parseCondition = function(object, type) {
		if (!object) {
			return undefined
		}
		if (!type) {
			type = "and";
		}
		switch (type){
			case "and" :
				return Object.keys(object)
					.map(function(key) {return parseCondition(object[key], key)})
					.join (" && ");
			case "or" :
				return "(" + Object.keys(object)
					.map(function(key) {return "(" + parseCondition(object[key], key) + ")"})
					.join (" || ") + ")";
			case "custom" :
				return object.toString();
			case "present":
				return [].concat(object)
					.map(function(key) {return "$gameParty.members().contains(a["+key+"])"})
					.join(" && ");
			case "absent":
				return [].concat(object)
					.map(function(key) {return "!$gameParty.members().contains(a["+key+"])"})
					.join(" && ");
			case "alive":
				return [].concat(object)
					.map(function(key) {return "$gameParty.aliveMembers().contains(a["+key+"])"})
					.join(" && ");
			case "dead":
				return [].concat(object)
					.map(function(key) {return "$gameParty.deadMembers().contains(a["+key+"])"})
					.join(" && ");
			case "switch":
				return [].concat(object)
					.map(function(key) {return "s["+key+"]"})
					.join(" && ");
			case "switchOff":
				return [].concat(object)
					.map(function(key) {return "!s["+key+"]"})
					.join(" && ");
			case "tag":
				return [].concat(object)
					.map(function(key) {return "tags.contains(\""+key+"\")"})
					.join(" && ");
		}
	}
	
	var parseItem = function(object, defaults) {
		var ikey;
		var arr;
		if (!object) {
			ikey = null;
			arr = defaults;
		} else if (typeof object === "string") {
			ikey = object;
			arr = defaults;
		} else {
			ikey = object["key"];
			arr = defaults.concat(object);
		}
		var item = {
			key: ikey,
			weight : findInArr(arr, function(it) {return it.weight}) || 1,
			cooldown : findInArr(arr, function(it) {return it.cooldown}) || 0,
			ignoreDisabled : findInArr(arr, function(it) {return it.ignoreDisabled}) || false,
			condition: arr.map(function(it) {return parseCondition(it.condition, "and")})
				.filter(function(it) {return it}).join(" && ") || "true"
		};
		return item;
	}
	
	var parseTree = function(object, path, defaults) {
		if (object instanceof Array) {
			var items = object.map(function(it) {return parseItem(it, defaults)});
			result[path] = items;
			return;
		}
		if (object[""]){
			defaults = defaults.concat(object[""]);
			if (object[""]["keys"]) {
				var items = object[""]["keys"].map(function(it) {return parseItem(it, defaults)});
				result[path] = items;
			}
		}
		for (var key in object) {
			if (key !== ""){
				var newPath = path ? path+"."+key : key;
				parseTree(object[key], newPath, defaults);
			}
		}
	}
	parseTree(object, "", []);
	return result;
}

// Arguments - list of scenario keys
Scenario.prototype.select = function() {
	return this.selectWithTags([], Array.prototype.slice.call(arguments));
}

Scenario.prototype.tags = function(){
	return {
		scenario: this,
		tagList: Array.prototype.slice.call(arguments),
		tags: function(){
			this.tagList.push(Array.prototype.slice.call(arguments));
			return this;
		},
		select: function(){
			return this.scenario.selectWithTags(tagList, Array.prototype.slice.call(arguments));
		}
	}
}

Scenario.prototype.selectWithTags = function(tags, keys) {
	var source = this._source
	var options = [];
	for (var i = 0; i < keys.length; ++i) {
		var key = keys[i];
		$ljScenarioCooldowns[this._file][key] = $ljScenarioCooldowns[this._file][key] || []
		var cooldowns = $ljScenarioCooldowns[this._file][key]
		options = options.concat(source[key].map(function(obj, arrIndex) {
			var cond = Scenario.checkCondition(obj, tags);
			if (!cooldowns[arrIndex]){
				cooldowns[arrIndex] = 0;
			}
			var enabled = cond && (cooldowns[arrIndex] === 0);
			if (cond && cooldowns[arrIndex] > 0) {
				cooldowns[arrIndex] = cooldowns[arrIndex] - 1;
			}
			return {
				obj: obj,
				groupKey: key,
				groupIndex: arrIndex,
				enabled: enabled,
				weight: obj.weight
			}
		}));
	}
	var active = options.filter(function(opt) {
		return opt.enabled || !opt.obj.ignoreDisabled});
		
	console.log(active)
	console.log($ljScenarioCooldowns)
	
	if (active.length === 0) {
		return null;
	}
	var weightSum = active.reduce(function(a,b) {return a + b.weight}, 0);
	var number = Math.floor(Math.random() * weightSum);
	var next = 0;
	console.log(weightSum);
	for (i = 0; i < active.length; ++i){
		var cur = active[i];
		next = next + cur.weight;
		//console.log(next);
		if (number < next) {
			$ljScenarioCooldowns[this._file][cur.groupKey][cur.groupIndex] = cur.obj.cooldown;
			return cur.enabled ? cur.obj.key : null;
		}
	}
	return null;
}

Scenario.checkCondition = function(obj, tags){
	var a = $gameActors._data;
	var s = $gameSwitches._data;
	var v = $gameVariables._data;
	var party = $gameParty;
	console.log($gameParty.members().contains(a[1]))
	return eval(obj.condition)
}


Scenario.create('Remark')