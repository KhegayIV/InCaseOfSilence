// --------------------
//

function Scenario() {
	this.initialize.apply(this, arguments)	
}

Scenario.prototype.initialize = function(file) {
	this._file = file
	loadFile(file)
}

Scenario.prototype.loadFile = function(file, onLoad) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', file);
	xhr.overrideMimeType('application/json');
	xhr.onload = function() {
		if (xhr.status < 400) {
			this.onLoad(JSON.parse(xhr.responseText));
		}
	};
	xhr.onerror = function() { throw new Error("There was an error loading the file '" + file + "'."); };
	xhr.send();
};

Scenario.prototype.onLoad = function(object) {
	this._source = parseFile(object);
}

Scenario.prototype.parseFile = function(object) {
	var result = {};
	
	var findInArr = function(arr, getter) {
		var item = arr.slice(0).reverse().find(function(v) {return getter(v) !== undefined});
		if (item !== undefined) {
			return getter(item);
		}
	}
	
	var parseRequirement = function(object, type) {
		if (!object) {
			return undefined
		}
		if (!type) {
			type = "and";
		}
		switch (type){
			case "and" :
				return Object.keys(object)
					.map(function(key) {return parseRequirement(object[key], key)})
					.join (" && ");
			case "or" :
				return "(" + Object.keys(object)
					.map(function(key) {return "(" + parseRequirement(object[key], key) + ")"})
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
		var arr = defaults.concat(object);
		var item = {
			weight : findInArr(arr, function(it) {return it.weight}) || 1,
			cooldown : findInArr(arr, function(it) {return it.cooldown}) || 0,
			ignoreDisabled : findInArr(arr, function(it) {return it.ignoreDisabled}) || false,
			requirement: arr.map(function(it) {return parseRequirement(it.requirement, "and")})
				.filter(function(it) {return it}).join(" && ")
		};
		if (typeof object === "string") {
			item["key"] = object;
		} else {
			item.key = object["key"];
		}
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
	return parseTree(object, "", []);
}