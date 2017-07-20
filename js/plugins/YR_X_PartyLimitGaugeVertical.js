//=============================================================================
 /*:
 * @plugindesc v1.0 Extension to YEP_X_PartyLimitGauge
 * Makes gauge vertical
 * @author Yorae Rasante
 *
 * @param Gauge Orientation
 * @desc Do you want it vertical or horizontal?
 * horizontal vertical
 * @default vertical
 * 
 * @param Party Height
 * @desc Formula for the gauge heigth for the player party.
 * Due to message boxes, will be shortened by a third but function the same.
 * @default max.clamp(100, 400)
 *
 * @param Party Icon Align
 * @desc Where do you want the icon to be aligned?
 * top     center     bottom
 * @default bottom
 * 
 * @param Troop Height
 * @desc Formula for the gauge heigth for the enemy party.
 * Due to message boxes, will be shortened by a third but function the same.
 * @default max.clamp(100, 400)
 *
 * @param Troop Icon Align
 * @desc Where do you want the icon to be aligned?
 * top     center     bottom
 * @default bottom
 * 
 * @help
 * Version 1.1
 * Set Orientation and the position of Party and Troop icons on gauge
 * Vertically as well as the standard horizontal.
 * Now with Plugin Commands!
 *
 * PartyLimitGaugeOrientation Vertical
 * Makes it vertical
 *
 * PartyLimitGaugeOrientation Horizontal
 * Makes it horizontal
 *
 * PartyLimitGaugeOrientation Clear
 * Makes it just as set in the plugin parameters again
 */
//=============================================================================
 
var Imported = Imported || {};
Imported.YR_X_PartyLimitGaugeVertical = true;

var YR = YR || {};
YR.PLGV = YR.PLGV || {};

if (Imported.YEP_X_PartyLimitGauge) { 

YR.Parameters = PluginManager.parameters('YR_X_PartyLimitGaugeVertical');
YR.Param = YR.Param || {};

YR.Param.PLGVGaugeOrient = String(YR.Parameters['Gauge Orientation']);
YR.Param.PLGVPartyHeight = String(YR.Parameters['Party Height']);
YR.Param.PLGVPartyAlign = String(YR.Parameters['Party Icon Align']);
YR.Param.PLGVTroopHeight = String(YR.Parameters['Troop Height']);
YR.Param.PLGVTroopAlign = String(YR.Parameters['Troop Icon Align']);


YR.PLGV.GaugeOrientation = function() {
    if (YR.PLGV.pluginOrient === undefined) {
            return YR.Param.PLGVGaugeOrient.toLowerCase();
    } else {
        return YR.PLGV.pluginOrient;
    }
};

//=============================================================================
// Window_Base
//=============================================================================

Window_Base.prototype.drawVerticalGauge = function(x, y, width, height, rate, color1, color2) {
    var fillH = Math.floor(height * rate);
    var fillY = y + height - fillH;
    this.contents.fillRect(x, y, width, height, this.gaugeBackColor());
    this.contents.gradientFillRect(x, fillY, width, fillH, color1, color2, true);
};

YR.PLGV.drawPartyLimitSet = Window_Base.prototype.drawPartyLimitSet;
Window_Base.prototype.drawPartyLimitSet = function(unit, x, y, w, h) {
	if (YR.PLGV.GaugeOrientation() === 'horizontal') {
		YR.PLGV.drawPartyLimitSet.call(this, unit, x, y, w, h);
	} else {
	    var width = Math.min(Window_Base._iconWidth * 2, w);
    	this.drawPartyLimitIcon(this._unit, x, y, width, h);
    	this.drawPartyLimitValue(this._unit, x, y, width, h);
    	this.drawPartyLimitGauge(this._unit, x, h, w);
	}
};

YR.PLGV.drawPartyLimitIcon = Window_Base.prototype.drawPartyLimitIcon;
Window_Base.prototype.drawPartyLimitIcon = function(unit, x, y, w, h) {
	if (YR.PLGV.GaugeOrientation() === 'horizontal') {
		YR.PLGV.drawPartyLimitIcon.call(this, unit, x, y, w, h);
	} else {
    	var icon = unit.partyLimitGaugeIcon();
    	if (icon <= 0) return;
    	var size = w;
    	if (unit.partyLimitGaugeIconAlign() === 'center') {
    	  y += (h - size) / 2;
    	} else if (unit.partyLimitGaugeIconAlign() === 'bottom') {
    	  y += h - size;
    	}
    	if (unit.isTroop()) {
    		x += this.width - Window_Base._iconWidth * 2;
    	}
    	var bitmap = ImageManager.loadSystem('IconSet');
    	var pw = Window_Base._iconWidth;
    	var ph = Window_Base._iconHeight;
    	var sx = icon % 16 * pw;
    	var sy = Math.floor(icon / 16) * ph;
    	this.contents._context.imageSmoothingEnabled = false;
	    this.contents.blt(bitmap, sx, sy, pw, ph, x, y, size, size);
    	this.contents._context.imageSmoothingEnabled = true;
	}
};

YR.PLGV.drawPartyLimitValue = Window_Base.prototype.drawPartyLimitValue;
Window_Base.prototype.drawPartyLimitValue = function(unit, x, y, w, h) {
	if (YR.PLGV.GaugeOrientation() === 'horizontal') {
		YR.PLGV.drawPartyLimitValue.call(this, unit, x, y, w, h);
	} else {
    	var size = w;
    	if (unit.partyLimitGaugeIconAlign() === 'center') {
    	  y += (h - size) / 2;
    	} else if (unit.partyLimitGaugeIconAlign() === 'bottom') {
    	  y += h - size;
    	}
    	if (unit.isTroop()) {
    		x += this.width - Window_Base._iconWidth * 2;
    	}
   	x += unit.partyLimitGaugeBufferX();
    	y += unit.partyLimitGaugeBufferY();
    	var value = Yanfly.Util.toGroup(unit.partyLimitGaugeCurrent());
    	this.drawText(value, x, y, size, 'center');
	}
};

YR.PLGV.PartyLimitGauge = Window_Base.prototype.drawPartyLimitGauge;
Window_Base.prototype.drawPartyLimitGauge = function(unit, x, y, w) {
	if (YR.PLGV.GaugeOrientation() === 'horizontal') {
		YR.PLGV.PartyLimitGauge.call(this, unit, x, y, w);
	} else {
    	var gauges = unit.partyLimitGaugeIncrements();
    	var rates = unit.partyLimitGaugeLastRates();
    	var c1 = this.textColor(unit.partyLimitGaugeColor1());
    	var c2 = this.textColor(unit.partyLimitGaugeColor2());
    	var gw = 6;
	    if (Imported.YEP_CoreEngine) gw = Yanfly.Param.GaugeHeight;
    	var gh = Math.floor(this.height / gauges);
    	var gx = x;
    	if (unit.isParty()) {
    		gx += this.width - gw;
    	}
    	if (gh >= 5) {
    	  for (var i = 0; i < gauges; ++i) {
    	    var rate = rates[i] || 0;
    	    this.drawVerticalGauge(gx, y - gh, gw, gh, rate, c1, c2);
    	    y -= gh;
    	  }
    	} else {
    	  var rate = unit.partyLimitGaugeRate();
    	  this.drawVerticalGauge(gx, y, gw, w, rate, c1, c2);
    	}
	}
};

//=============================================================================
// Game_Unit
//=============================================================================

Game_Unit.prototype.isParty = function() {
	return false;
};

Game_Unit.prototype.isTroop = function() {
	return false;
};

//=============================================================================
// Game_Party
//=============================================================================

Game_Party.prototype.isParty = function() {
	return true;
};

YR.PLGV.PartyIconAlign = Game_Party.prototype.partyLimitGaugeIconAlign;
Game_Party.prototype.partyLimitGaugeIconAlign = function() {
	if (YR.PLGV.GaugeOrientation() === 'horizontal') {
		return YR.PLGV.PartyIconAlign.call(this);
	} else {
		    return YR.Param.PLGVPartyAlign.toLowerCase();
	}
};

Game_Party.prototype.partyLimitGaugePosHeight = function() {
    return YR.Param.PLGVPartyHeight;
};

//=============================================================================
// Game_Troop
//=============================================================================

Game_Troop.prototype.isTroop = function() {
	return true;
};

YR.PLGV.TroopIconAlign = Game_Troop.prototype.partyLimitGaugeIconAlign;
Game_Troop.prototype.partyLimitGaugeIconAlign = function() {
	if (YR.PLGV.GaugeOrientation() === 'horizontal') {
		return YR.PLGV.TroopIconAlign.call(this);
	} else {
	    return YR.Param.PLGVTroopAlign.toLowerCase();
	}
};

Game_Troop.prototype.partyLimitGaugePosHeight = function() {
    return YR.Param.PLGVTroopHeight;
};

//=============================================================================
// Window_PartyLimitGauge
//=============================================================================

YR.PLGV.PLWwindowHeight = Window_PartyLimitGauge.prototype.windowHeight;
Window_PartyLimitGauge.prototype.windowHeight = function() {
	if (YR.PLGV.GaugeOrientation() === 'horizontal') {
		return YR.PLGV.PLWwindowHeight.call(this);
	} else {
	    var max = this._unit.partyLimitGaugeMax();
    	return Math.floor(eval(this._unit.partyLimitGaugePosHeight()) * 2 / 3);
    }
};

YR.PLGV.PLWwindowWidth = Window_PartyLimitGauge.prototype.windowWidth;
Window_PartyLimitGauge.prototype.windowWidth = function() {
	if (YR.PLGV.GaugeOrientation() === 'horizontal') {
		return YR.PLGV.PLWwindowWidth.call(this);
	} else {
	    var gaugeHeight = 6;
    	if (Imported.YEP_CoreEngine) gaugeHeight = Yanfly.Param.GaugeHeight;
    	var width = gaugeHeight + Window_Base._iconWidth * 2;
    	return Math.max(width, this.fittingHeight(2));
    }
};

//=============================================================================
// Game_Interpreter
//=============================================================================

YR.PLGV.Game_Interpreter_pluginCommand =
    Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
  YR.PLGV.Game_Interpreter_pluginCommand.call(this, command, args);
  if (command.toLowerCase() === 'partylimitgaugeorientation') {
    var str = String(args[0]).toLowerCase();
    if (str === 'clear') str = undefined;
    YR.PLGV.pluginOrient = str;
  }
};

};