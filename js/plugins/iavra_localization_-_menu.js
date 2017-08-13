/*:
 * @plugindesc Adds a "Language" option to the options menu, that can be used to change game language on the fly.
 * <Iavra Localization Menu>
 * @author Iavra
 *
 * @param Option Label
 * @desc Label to be used for the option in the options menu.
 * @default Language
 *
 * @param Language Labels
 * @desc Comma-separated list of "language:label" pairs, to be used for the language selection.
 * @default en:English
 *
 * @help
 * Simply place this plugin in your plugin list after "Iavra Localization - Core". The parameters "Option Label" and
 * "Language Labels" are used to define the text to be shown. You are free to use escape codes inside those parameters,
 * as well, though i recommend against localizing the language labels.
 */

var IAVRA = IAVRA || {};
if(!IAVRA.I18N) { throw new Error("This plugin needs 'Iavra Localization - Core' to work."); }

(function($) {
    "use strict";

    /**
     * Read plugin parameters independent from the plugin's actual filename.
     */
    var _p = $plugins.filter(function(p) { return p.description.contains('<Iavra Localization Menu>'); })[0].parameters;
    var _param_labelOption = _p['Option Label'];
    var _param_labelLanguages = _p['Language Labels'].split(/\s*,\s*/).reduce(function(map, entry) {
        var split = entry.split(':'); if(split.length === 2) { map[split[0]] = split[1]; } return map;
    }, {});

    /**
     * Returns the previous language in the list or the last language, if the current one is already the first.
     */
    var _prevLanguage = function(language) {
        var languages = $.I18N.languages(), index = languages.indexOf(language) + 1;
        return languages[index >= languages.length ? 0 : index];
    };

    /**
     * Returns the next language in the list or the first language, of the current one is already the last.
     */
    var _nextLanguage = function(language) {
        var languages = $.I18N.languages(), index = languages.indexOf(language) - 1;
        return languages[index < 0 ? languages.length - 1 : index];
    };

    /**
     * Applies the given language and returns it or the default fallback, if the given value was invalid. We don't
     * directly change the language, after it was selected in the options menu, because otherwise you would see a
     * mixed of different languages, while changing options.
     */
    var _applyLanguage = function(language) {
        IAVRA.I18N.language = language;
        return IAVRA.I18N.language;
    };

    //=============================================================================
    // Window_Options
    //=============================================================================

    (function($) {

        /**
         * Adds our command to the command list.
         */
        var alias_makeCommandList = $.prototype.makeCommandList;
        $.prototype.makeCommandList = function() {
            alias_makeCommandList.call(this);
            this.addCommand(_param_labelOption, 'language');
        };

        /**
         * Returns the status text as given in the "Language Labels" parameter.
         */
        var alias_statusText = $.prototype.statusText;
        $.prototype.statusText = function(index) {
            var symbol = this.commandSymbol(index);
            var value = this.getConfigValue(symbol);
            return symbol === 'language' ? _param_labelLanguages[value] : alias_statusText.call(this, index);
        };

        /**
         * On Ok, select the next language.
         */
        var alias_processOk = $.prototype.processOk;
        $.prototype.processOk = function() {
            var symbol = this.commandSymbol(this.index()), value = this.getConfigValue(symbol);
            if(symbol === 'language') { return this.changeValue(symbol, _nextLanguage(value)); }
            alias_processOk.call(this);
        };

        /**
         * On Left, select the previous language.
         */
        var alias_cursorLeft = $.prototype.cursorLeft;
        $.prototype.cursorLeft = function(wrap) {
            var symbol = this.commandSymbol(this.index()), value = this.getConfigValue(symbol);
            if(symbol === 'language') { return this.changeValue(symbol, _prevLanguage(value)); }
            alias_cursorLeft.call(this, wrap);
        };

        /**
         * On right, select the next language.
         */
        var alias_cursorRight = $.prototype.cursorRight;
        $.prototype.cursorRight = function(wrap) {
            var symbol = this.commandSymbol(this.index()), value = this.getConfigValue(symbol);
            if(symbol === 'language') { return this.changeValue(symbol, _nextLanguage(value)); }
            alias_cursorRight.call(this, wrap);
        };

    })(Window_Options);

    //=============================================================================
    // ConfigManager
    //=============================================================================

    (function($) {

        /**
         * The current language. Automatically gets kept in sync with the core plugin, whenever the current language
         * is written to or read from the config savefile.
         */
        var _language;

        /**
         * Store the currently selected language in the config savefile, so it's persisted between games. Before
         * saving the language, it gets applied, so we can correctly fallback to the default language, if needed.
         */
        var alias_makeData = $.makeData;
        $.makeData = function() {
            var config = alias_makeData.call(this);
            config.language = this.language = _applyLanguage(this.language);
            return config;
        };

        /**
         * Load the current language from the config savefile. Also, apply it, so we can display the correct language
         * and fallback to the default language, if the savefile entry doesn't exist or is invalid.
         */
        var alias_applyData = $.applyData;
        $.applyData = function(config) {
            alias_applyData.call(this, config);
            this.language = _applyLanguage(config.language);
        };

        /**
         * Read and set the current language. Language is managed locally, because otherwise we would experience some
         * strange sideffects in the options menu.
         */
        Object.defineProperty($, 'language', {
            get: function() { return _language; },
            set: function(value) { _language = value; }
        });

    })(ConfigManager);

})(IAVRA);