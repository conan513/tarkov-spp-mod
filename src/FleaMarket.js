/*
MertCan
Oyun çok pahalı.
*/


"use strict";

var datasjson = "";  

class FLEA
{
	constructor()
	{
		this.mod = "MertCan-RealTimeFleaMarket";
		common_f.logger.logInfo(`Loading: ${this.mod}`);
		core_f.packager.onLoad[this.mod] = this.load.bind(this);
           
	}

	load()
	{
		const filepath = `${core_f.packager.getModPath(this.mod)}config/config.json`;
        ragfair_f.config = common_f.json.deserialize(common_f.vfs.readFile(filepath));	
		ragfair_f.controller.addOffer = this.addOffer;
		ragfair_f.controller.createOffer = this.createOffer;
		ragfair_f.controller.fetchItemFleaPrice = this.fetchItemFleaPrice;
		ragfair_f.controller.getPrice = this.getPrice;
        // get flea market price
        const https_ = require('https');
        function realtimefleamarket() {
        https_.get('https://realtimefleamarket.herokuapp.com/eft_market', (res) => {
            if (res.statusCode ==503)
            {
                common_f.logger.logError("RealTimeFleaMarket: Offline for maintenance");
            }
            else if (res.statusCode ==200)
            {
                var response = '';
                res.on('data', function(d) {
                response += d;
                });
                res.on('end', function(d) {
                var datas_json = JSON.parse(response);
                datasjson = datas_json;
                common_f.logger.logSuccess("RealTimeFleaMarket: Updated Market Data " + (Object.keys(datasjson.items).length));
                });
            }
            else 
            {
                common_f.logger.logError("RealTimeFleaMarket: Please check back later.");
            }
        
        }).on('error', (e) => {
            console.error(e);
        });
        }
        realtimefleamarket();
        // loop
        setInterval(realtimefleamarket, 600*1000);

	}
	
    addOffer(pmcData, info, sessionID)
    {
        return item_f.eventHandler.getOutput();
    }

	createOffer(template, onlyFunc, usePresets = true)
    {
        // Some slot filters reference bad items
        if (!(template in database_f.server.tables.templates.items))
        {
            common_f.logger.logWarning("Item " + template + " does not exist");
            return [];
        }

        let offerBase = common_f.json.clone(database_f.server.tables.ragfair.offer);
        let offers = [];

        // Preset
        if (usePresets && preset_f.controller.hasPreset(template))
        {
            let presets = common_f.json.clone(preset_f.controller.getPresets(template));

            for (let p of presets)
            {
                let offer = common_f.json.clone(offerBase);
                let mods = p._items;
                let rub = 0;

                for (let it of mods)
                {
                    rub += this.getPrice(it._tpl);
                }

                mods[0].upd = mods[0].upd || {}; // append the stack count
                mods[0].upd.StackObjectsCount = offerBase.items[0].upd.StackObjectsCount;

                offer._id = p._id;               // The offer's id is now the preset's id
                offer.root = mods[0]._id;        // Sets the main part of the weapon
                offer.items = mods;
                offer.requirements[0].count = Math.round(rub * ragfair_f.config.FleaPriceMultiplier);
                offers.push(offer);
            }
        }

        // Single item
        if (!preset_f.controller.hasPreset(template) || !onlyFunc)
        {
            let rubPrice = Math.round(this.getPrice(template) * ragfair_f.config.FleaPriceMultiplier);
            offerBase._id = template;
            offerBase.items[0]._tpl = template;
            offerBase.requirements[0].count = rubPrice;
            offerBase.itemsCost = rubPrice;
            offerBase.requirementsCost = rubPrice;
            offerBase.summaryCost = rubPrice;
            offers.push(offerBase);
        }

        return offers;
    }
	
	fetchItemFleaPrice(tpl)
    {
        return Math.round(this.getPrice(tpl) * ragfair_f.config.FleaPriceMultiplier);
    }
	
	getPrice(id) {
        return datasjson.items[id] ? datasjson.items[id] : helpfunc_f.helpFunctions.getTemplatePrice(id);
    }
}
module.exports.FLEA = FleaMarket;