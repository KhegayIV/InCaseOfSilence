/*:
 * @plugindesc The core plugin for localization, which contains all logic to load text and convert escape codes.
 * <Iavra Localization Core>
 * @author Iavra
 *
 * @param Escape Code
 * @desc Code, that will be used to retrieve localized strings. "{key}" serves as placeholder for the text key.
 * @default #{{key}}
 *
 * @param Languages
 * @desc Comma-separated list of languages, that should be supported. The first entry will be used as the default.
 * @default en
 *
 * @param File Path
 * @desc Path to the language files to load. The sequence "{lang}" will be replaced with the languages entered above.
 * @default {lang}.json
 *
 * @help
 * To setup this plugin, register all supported languages inside the "Languages" parameter, separated by commas. You
 * also need to place the corresponding files inside your project folder. So, for example, if you want to support the
 * languages "en" (english) and "de" (german) and the parameter "File Path" is set to its default value, you'll need
 * to add the two files "de.json" and "en.json" to the root folder of your project.
 *
 * The first language will automatically used as the default langage.
 *
 * During runtime, every instance of "#{...}" (can be changed via plugin parameter "Escape Code") will get replaced
 * with a localized string, where "..." stands for a text key. So, if your language file looks like this:
 *
 * {
 *     "text.test": "This is a test text"
 * }
 *
 * Every instance of "#{text.test}" will be replaced with "This is a test text". For better maintainability, it's also
 * possible to split keys at dots:
 *
 * {
 *     "text": {
 *         "test": "This is a test text"
 *     }
 * }
 *
 * The above example will result in the same key as the first one, but makes it easier to construct nested keys, for
 * example for the names of all actors. Instead of objects, you can also use arrays, like this:
 *
 * {
 *     "text": ["Text 1", "Text 2", "Text 3"]
 * }
 *
 * This will create the keys "text.0", "text.1" and "text.2", each pointing to the text listed at that array index. If
 * needed, you are free to combine the object and array notations.
 *
 * Keys can also contain keys themselves, which will be replaced recursively. This allows you, to define important
 * strings, like city names, at a single position and reference it everywhere else:
 *
 * {
 *     "text": "Hi, my name is #{actor}",
 *     "actor": "Harold"
 * }
 *
 * You can use all escape characters, like "\V[...]" inside the files, but will need to double the backslashes. Line
 * breaks can be entered by using "\n", since JSON doesn't support real linebreaks inside strings.
 *
 * The plugin offers the following script calls:
 *
 * IAVRA.I18N.language;         Returns the current language.
 * IAVRA.I18N.language = lang;  Sets the current language to lang.
 * IAVRA.I18N.languages();      Returns a list of all available languages.
 * IAVRA.I18N.localize(text);   Localizes the given text.
 */

 var IAVRA = IAVRA || {};

(function($) {
    "use strict";

    /**
     * Read plugin parameters independent from the plugin's actual filename.
     */
    var _p = $plugins.filter(function(p) { return p.description.contains('<Iavra Localization Core>'); })[0].parameters;
    var _param_escape = _p['Escape Code'];
    var _param_languages = _p['Languages'].split(/\s*,\s*/).filter(function(lang) { return !!lang; });
    var _param_filePath = _p['File Path'];

    /**
     * Regex used to replace escape codes with localized data.
     */
    var _regex = new RegExp(_param_escape.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&").replace('\\{key\\}', '([\\w\\.]+?)'), 'g');

    /**
     * The current language.
     */
    var _lang = _param_languages[0];

    /**
     * Contains all localized data read from the data files defined "File Path". We intentionally don't use the object
     * literal {}, but create a new Object with a null prototype, so we don't inherit any properties.
     */
    var _data = _param_languages.reduce(function(map, lang) { map[lang] = null; return map; }, Object.create(null));

    /**
     * Indicated, whether we are currently inside of "drawTextEx". Not thread-/async-safe!
     */
    var _inDrawTextEx = false;

    /**
     * Initializes the language data by reading all files and storing their content inside the _data object. The
     * undefined data serves as fallback, if no language is given in the "Languages" plugin parameter.
     */
    var _initialize = function() {
        _param_languages.forEach(function(lang) {
            _loadFile(_param_filePath.replace('{lang}', lang), function(data) { _data[lang] = _flatten(data); });
        });
        _data[undefined] = {};
    };

    /**
     * Loads a JSON file and executes the given callback with the parsed file contents as a parameter.
     */
    var _loadFile = function(url, callback) {
        var request = new XMLHttpRequest();
        request.open('GET', url);
        request.overrideMimeType('application/json');
        request.onload = function() { callback(JSON.parse(request.responseText)); };
        request.onerror = function() { throw new Error("There was an error loading the file '" + url + "'."); };
        request.send();
    };

    /**
     * Flattens the given data object by joining nested object keys and array indizes with "." and returns a single-
     * level object, whose keys can be used in escape codes.
     */
    var _flatten = function(object) {
    	var result = {}, temp, value;
    	for(var key in object) {
    		if(typeof (value = object[key]) === 'object') {
    			temp = _flatten(value);
    			for(var x in temp) { result[key + '.' + x] = temp[x]; }
    		} else { result[key] = value; }
    	}
    	return result;
    };

    /**
     * Returns true, if all language files have been loaded.
     */
    var _isReady = function() { return _param_languages.every(function(lang) { return !!_data[lang]; }); };

    /**
     * Recursively replaces all escape codes in the text with the localized data. Note, that we also do an implicit
     * conversion of the given data to String, since otherwise the function would crash, when invoked with a number.
     */
    var _replace = function(text) {
        if(text === undefined || text === null) { return text; }
        var f = true, d = _data[_lang], r = '' + text;
        while(f) { f = false; r = r.replace(_regex, function(m, k) { f = true; return d[k]; }); }
        return r;
    };

    //=============================================================================
    // IAVRA.I18N
    //=============================================================================

    $.I18N = {
        /**
         * Localizes a given text. Can be used, when the automatic localization happens too late (or not at all):
         */
        localize: function(text) { return _replace(text); },

        /**
         * Returns the list of all registered languages. Can be used to create an option menu or similar.
         */
        languages: function() { return _param_languages; }
    };

    /**
     * Property used to read and set the current language. If the given value wasn't registered in the "Languages"
     * plugin parameter, fallback to the first language, instead. Also, when changing the language, we need to update
     * the document title, since the game title might be localized.
     */
    Object.defineProperty($.I18N, 'language', {
        get: function() { return _lang; },
        set: function(value) {
            _lang = _param_languages.contains(value) ? value : _param_languages[0];
            Scene_Boot.prototype.updateDocumentTitle();
        }
    });

    //=============================================================================
    // Scene_Boot
    //=============================================================================

    (function($) {

        /**
         * When creating Scene_Boot, also start loading all language files to initialize the plugin.
         */
        var alias_create = $.prototype.create;
        $.prototype.create = function() { alias_create.call(this); _initialize(); };

        /**
         * Also wait, until all language data has been read.
         */
        var alias_isReady = $.prototype.isReady;
        $.prototype.isReady = function() { return _isReady() && alias_isReady.call(this); };

        /**
         * We override this method, because we may have to convert the game title, before setting the document title.
         * Make sure, that $dataSystem is already initialized, because an option menu will set the current language,
         * before data has been loaded. But don't worry, the correct title will be set during Scene_Boot.start.
         */
        $.prototype.updateDocumentTitle = function() {
            if($dataSystem) { document.title = _replace($dataSystem.gameTitle); }
        };

    })(Scene_Boot);

    //=============================================================================
    // Window_Base
    //=============================================================================

    (function($) {

        /**
         * Set a marker indicating, that we are currently inside drawTextEx. This marker is not threadsafe, so the
         * plugin likely won't work with other plugins, that are asynchronously drawing text.
         */
        var alias_drawTextEx = $.prototype.drawTextEx;
        $.prototype.drawTextEx = function(text, x, y) {
            _inDrawTextEx = true;
            var result = alias_drawTextEx.call(this, text, x, y);
            _inDrawTextEx = false;
            return result;
        };

        /**
         * Replaces all escape codes, before AND after converting escape characters. We have to do this twice, because
         * otherwise we would miss escape codes in character names, that have been added via escape characters.
         */
        var alias_convertEscapeCharacters = $.prototype.convertEscapeCharacters;
        $.prototype.convertEscapeCharacters = function(text) {
            return _replace(alias_convertEscapeCharacters.call(this, _replace(text)));
        };

    })(Window_Base);

    //=============================================================================
    // Bitmap
    //=============================================================================

    (function($) {

        /**
         * When drawing text, replace escape codes unless we are currently inside drawTextEx. Without this check, we
         * would effectively call our replace method for every single character of the text given to drawTextEx.
         */
        var alias_drawText = $.prototype.drawText;
        $.prototype.drawText = function(text, x, y, maxWidth, lineHeight, align) {
            alias_drawText.call(this, _inDrawTextEx ? text : _replace(text), x, y, maxWidth, lineHeight, align);
        };

        /**
         * Measuring text is done, before drawing it, so escape codes won't be resolved, yet.
         */
        var alias_measureTextWidth = $.prototype.measureTextWidth;
        $.prototype.measureTextWidth = function(text) {
            return alias_measureTextWidth.call(this, _replace(text));
        };

    })(Bitmap);

    //=============================================================================
    // String
    //=============================================================================

    (function($) {

        /**
         * Needs to be aliased, so the state and skill messages (among others) works correctly.
         */
        var alias_format = $.prototype.format;
        $.prototype.format = function() {
            return alias_format.apply(_replace(this), arguments);
        };

    })(String);

})(IAVRA);