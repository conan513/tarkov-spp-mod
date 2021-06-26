"use strict";

class SellToFleaMarket
{
		constructor()
	{
		this.mod = "Flea Market Sync";
		Logger.info("Syncronize flea market price with https://tarkov-market.com/");
		ModLoader.onLoad[this.mod] = SellToFleaMarket.onLoad;
	}
	
	static onLoad()
	{
		SellToFleaMarket.config = JsonUtil.deserialize(VFS.readFile(`user\\mods\\spp-mod\\db\\fleamarket.json`));
		RagfairController.processOffers = SellToFleaMarket.processOffers;
		RagfairServer.generateDynamicOffers = SellToFleaMarket.generateDynamicOffers;
		
		SellToFleaMarket.updatePrices();
		setInterval(SellToFleaMarket.updatePrices, 3600*1000);
	}
	
	// Code from MertCan's RealTimeFleaMarket mod
	static updatePrices() {
		const https_ = require('https');
		
		https_.get('https://tarkov-market.com/api/v1/items/all?x-api-key=djAKPjWYWASzJCyS', (res) => {
			if (res.statusCode == 503)
			{
				Logger.error("TarkovMarket: Offline for maintenance");
			}
			else if (res.statusCode == 200)
			{
				var response = '';
				res.on('data', function(d) {
					response += d;
				});
				res.on('end', function(d) {
					try {
						var datas_json = JSON.parse(response);
						var updatedCount = 0;
						
						for (let item of datas_json)
						{
							if (item.isFunctional)
							{
								let id = item.bsgId;
								let price = item.avg24hPrice;
								RagfairServer.prices.dynamic[id] = price || 1;
								updatedCount++;
							}
						}
						
						Logger.success("TarkovMarket: Updated Market Data " + updatedCount);
						
						RagfairServer.offers = [];
						RagfairServer.addTraders();
						RagfairServer.addPlayerOffers();
						RagfairServer.update();
					} catch (error) {
						Logger.error("TarkovMarket: Failed to update prices.");
					}
				});
			}
			else 
			{
				Logger.error("TarkovMarket: Failed to update prices. Trying again in 1 minute");
				setTimeout(SellToFleaMarket.updatePrices, 60000);
			}
		}).on('error', (e) => {
			console.error(e);
		});
    }
	
	// Add rating growing flag
	static processOffers(sessionID)
    {
        const timestamp = TimeUtil.getTimestamp();
        
        for (const sessionID in SaveServer.profiles)
        {
            const profileOffers = RagfairController.getProfileOffers(sessionID);

            if (!profileOffers || !profileOffers.length)
            {
                continue;
            }

            for (const [index, offer] of profileOffers.entries())
            {
				while (offer.sellResult && offer.sellResult.length > 0 && timestamp >= offer.sellResult[0].sellTime)
				{
					// Item sold
					let totalItemsCount = 1;
                    let boughtAmount = 1;
					
					if (!offer.sellInOnePiece)
					{
                        totalItemsCount = offer.items[0].upd.StackObjectsCount;
                        boughtAmount = offer.sellResult[0].amount;
					}
					
					// Increase rating
					SaveServer.profiles[sessionID].characters.pmc.RagfairInfo.rating += RagfairConfig.sell.reputation.gain * offer.summaryCost / totalItemsCount * boughtAmount;
					SaveServer.profiles[sessionID].characters.pmc.RagfairInfo.isRatingGrowing = true;

					RagfairController.completeOffer(sessionID, offer, boughtAmount);
					offer.sellResult.splice(0, 1);
				}
            }
        }

        return true;
	}

	static generateDynamicOffers()
    {
        const config = RagfairConfig.dynamic;
        const count = config.threshold + config.batchSize;
        const assort = JsonUtil.clone(DatabaseServer.tables.traders["ragfair"].assort);
        const assortItems = assort.items.filter((item) =>
        {
			// Blacklist feature
            return item.slotId === "hideout" && !SellToFleaMarket.config.blacklist.includes(item._tpl);
        });

        while (RagfairServer.offers.length < count)
        {
            // get base item and stack
            let item = RandomUtil.getArrayValue(assortItems);
            const isPreset = PresetController.isPreset(item._id);

            // create offer
            item.upd.StackObjectsCount = (isPreset) ? 1 : Math.round(RandomUtil.getInt(config.stack.min, config.stack.max));
            
            const userID = HashUtil.generate();
            const items = (isPreset) ? RagfairServer.getPresetItems(item) : [...[item], ...ItemHelper.findAndReturnChildrenByAssort(item._id, assort.items)];
            const barterScheme = RagfairServer.getOfferRequirements(items);
            const price = RagfairServer.getBarterPrice(barterScheme);

            RagfairServer.createOffer(
                userID,                                     // userID
                TimeUtil.getTimestamp(),                    // time
                items,                                      // items
                barterScheme,                               // barter scheme
                assort.loyal_level_items[item._id],         // loyal level
                price,                                      // price
                isPreset);                                  // sellAsOnePiece
        }
    }
}

module.exports = SellToFleaMarket;