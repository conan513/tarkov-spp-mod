"use strict";
const fs = require("fs");
const zlib = require("zlib");
const https = require("https");
const WebSocket = require("ws");

class LI {
    static config = {};

    static WIP() {
    }

    constructor() {
        LI.loadDynamicConfig();
        LI.WIP();
        LI.fixHttps();
        LI.fixInraid();
        LI.fixInsurance();
        LI.fixLocations();
        LI.fixLogger();
        LI.fixNotifier();
        LI.fixRagfair();
        LI.fixSave();
        LI.fixTrader();
    }

    static fixHttps() {
        if (!LI.config.fix_https_server || !LI.config.fix_https_server.enabled) {
            return;
        }
        ;
        HttpServer.handleRequest = function (req, resp) {
            const IP = req.connection.remoteAddress.replace("::ffff:", "");
            const sessionID = HttpServer.getCookies(req)["PHPSESSID"];
            if (req && req.url
                && !req.url.startsWith('/client/game/keepalive')
                && !req.url.startsWith('/player/health/sync')
                && !req.url.startsWith('/notifierServer/get/')
                && !req.url.startsWith('/singleplayer/settings/bot/')
            ) {
                Logger.log(`[${sessionID}][${IP}] ${req.url}`);
            }
            if (req.method === "GET") {
                HttpServer.sendResponse(sessionID, req, resp, "");
            }
            if (req.method === "POST") {
                req.on("data", (data) => {
                    zlib.inflate(data, (err, body) => {
                        HttpServer.sendResponse(sessionID, req, resp, body);
                    });
                });
            }
            if (req.method === "PUT") {
                req.on("data", (data) => {
                    if ("expect" in req.headers) {
                        const requestLength = parseInt(req.headers["content-length"]);
                        if (!HttpServer.putInBuffer(req.headers.sessionid, data, requestLength)) {
                            resp.writeContinue();
                        }
                    }
                });
                req.on("end", () => {
                    const data = HttpServer.getFromBuffer(sessionID);
                    HttpServer.resetBuffer(sessionID);
                    zlib.inflate(data, (err, body) => {
                        if (err) {
                            body = data;
                        }
                        HttpServer.sendResponse(sessionID, req, resp, body);
                    });
                });
            }
        };
    }

    static fixInraid() {
        if (!LI.config.fix_inraid_controller || !LI.config.fix_inraid_controller.enabled) {
            return;
        }
        ;
        InraidController.markFoundItems = function (pmcData, profile, isPlayerScav) {
            for (let offraidItem of profile.Inventory.items) {
                let found = false;
                if (!isPlayerScav) {
                    for (let item of pmcData.Inventory.items) {
                        if (offraidItem._id === item._id) {
                            found = true;
                            break;
                        }
                    }
                    if (found) {
                        if ("upd" in offraidItem && "SpawnedInSession" in offraidItem.upd) {
                            delete offraidItem.upd.SpawnedInSession;
                        }
                        continue;
                    }
                }
                if ("upd" in offraidItem && "Dogtag" in offraidItem.upd) {
                    offraidItem.upd.SpawnedInSession = true;
                }
            }
            return profile;
        };
    }

    static fixInsurance() {
        if (!LI.config.fix_insurance || !LI.config.fix_insurance.enabled) {
            return;
        }
        ;
        InsuranceController.storeLostGear = function (pmcData, offraidData, preRaidGear, sessionID) {
            const preRaidGearHash = {};
            const offRaidGearHash = {};
            let gears = [];
            for (const item of preRaidGear) {
                preRaidGearHash[item._id] = item;
            }
            for (const item of offraidData.profile.Inventory.items) {
                offRaidGearHash[item._id] = item;
            }
            for (let insuredItem of pmcData.InsuredItems) {
                if (preRaidGearHash[insuredItem.itemId]) {
                    if (!offRaidGearHash[insuredItem.itemId]) {
                        gears.push({
                            "pmcData": pmcData,
                            "insuredItem": insuredItem,
                            "item": preRaidGearHash[insuredItem.itemId],
                            "sessionID": sessionID
                        });
                    }
                }
            }
            for (let gear of gears) {
                gear.item.isFraud = true;
                InsuranceController.addGearToSend(gear.pmcData, gear.insuredItem, gear.item, gear.sessionID);
            }
        };
        InsuranceController.processReturn = function () {
            const time = TimeUtil.getTimestamp();
            for (const sessionID in SaveServer.profiles) {
                let insurance = SaveServer.profiles[sessionID].insurance;
                let i = insurance.length;
                while (i-- > 0) {
                    let insured = insurance[i];
                    if (time < insured.scheduledTime) {
                        continue;
                    }
                    let itemsToReturn = [];
                    let j = insured.items.length;
                    while (j-- > 0) {
                        let item = insured.items[j];
                        if (item.isFraud) {
                            delete item.isFraud;
                            itemsToReturn.push(item);
                            insured.items.splice(j, 1);
                        }
                    }
                    let toLook = [
                        "hideout",
                        "main",
                        "mod_scope",
                        "mod_magazine",
                        "mod_sight_rear",
                        "mod_sight_front",
                        "mod_tactical",
                        "mod_muzzle",
                        "mod_tactical_2",
                        "mod_foregrip",
                        "mod_tactical_000",
                        "mod_tactical_001",
                        "mod_tactical_002",
                        "mod_tactical_003",
                        "mod_nvg"
                    ];
                    let toDelete = [];
                    for (let insuredItem of insured.items) {
                        if ((toLook.includes(insuredItem.slotId) || !isNaN(insuredItem.slotId)) && RandomUtil.getInt(0, 99) >= InsuranceConfig.returnChance && !toDelete.includes(insuredItem._id)) {
                            toDelete.push.apply(toDelete, ItemHelper.findAndReturnChildrenByItems(insured.items, insuredItem._id));
                        }
                    }
                    for (let pos = insured.items.length - 1; pos >= 0; --pos) {
                        if (toDelete.includes(insured.items[pos]._id)) {
                            insured.items.splice(pos, 1);
                        }
                    }
                    itemsToReturn.forEach(item => insured.items.push(item));
                    if (insured.items.length === 0) {
                        const insuranceFailedTemplates = DatabaseServer.tables.traders[insured.traderId].dialogue.insuranceFailed;
                        insured.messageContent.templateId = RandomUtil.getArrayValue(insuranceFailedTemplates);
                    }
                    DialogueController.addDialogueMessage(insured.traderId, insured.messageContent, sessionID, insured.items);
                    insurance.splice(i, 1);
                }
                SaveServer.profiles[sessionID].insurance = insurance;
            }
        };
    }

    static fixLocations() {
        if (!LI.config.fix_location_generator || !LI.config.fix_location_generator.enabled) {
            return;
        }
        ;
        if (LI.config.loot_spawnrate && LI.config.loot_spawnrate.enabled) {
            ;
            LocationConfig.loot_spawnrate = LI.config.loot_spawnrate;
        }
        const peekSpawns = function (spawnType, itemId, itemName) {
            switch (itemId) {
                case '59faff1d86f7746c51718c9c':
                case '5bc9b720d4351e450201234b':
                case '5d03775b86f774203e7e0c4b':
                case '5bc9bdb8d4351e003562b8a1':
                case '5bc9b9ecd4351e3bac122519':
                case '59e3658a86f7741776641ac4':
                case '59e3647686f774176a362507':
                case '5bc9b355d4351e6d1509862a':
                case '5bc9c377d4351e3bac12251b':
                case '57347ca924597744596b4e71':
                case '5d0377ce86f774186372f689':
                case '5c0530ee86f774697952d952':
                case '59e3639286f7741777737013':
                case '5e54f6af86f7742199090bf3':
                case '5af0534a86f7743b6f354284':
                case '5e54f62086f774219b0f1937':
                case '5c052fb986f7746b2101e909':
                case '5bc9bc53d4351e00367fbcee':
                case '5c052f6886f7746b1e3db148':
                case '5d03794386f77420415576f5':
                case '5bc9be8fd4351e00334cae6e':
                case '590de7e986f7741b096e5f32':
                case '5f745ee30acaeb0d490d8c5b':
                case '5c1d0c5f86f7744bb2683cf0':
                case '5c1d0d6d86f7744bb2683e1f':
                case '5c1d0dc586f7744baf2e7b79':
                case '5c1d0efb86f7744baf2e7b7b':
                case '5c1d0f4986f7744bb01837fa':
                case '5c1e495a86f7743109743dfb':
                    Logger.log(`${spawnType} : ${itemName}`, "yellow", "blue");
                    break;
                default:
            }
        };
        LocationGenerator.generateDynamicLoot = function (dynamic, lootPositions, location) {
            let rndLootIndex = RandomUtil.getInt(0, dynamic.length - 1);
            let rndLoot = dynamic[rndLootIndex];
            if (!rndLoot.data) {
                dynamic.splice(rndLootIndex, 1);
                return {"result": "error"};
            }
            let rndLootTypeIndex = RandomUtil.getInt(0, rndLoot.data.length - 1);
            let data = rndLoot.data[rndLootTypeIndex];
            let position = data.Position.x + "," + data.Position.y + "," + data.Position.z;
            if (!LocationConfig.allowLootOverlay && lootPositions.includes(position)) {
                dynamic[rndLootIndex].data.splice(rndLootTypeIndex, 1);
                if (dynamic[rndLootIndex].data.length === 0) {
                    dynamic.splice(rndLootIndex, 1);
                }
                return {"status": "error"};
            }
            data.Id = HashUtil.generate();
            let lootItemsHash = {};
            let lootItemsByParentId = {};
            for (const i in data.Items) {
                let loot = data.Items[i];
                lootItemsHash[loot._id] = loot;
                if (!("parentId" in loot))
                    continue;
                if (lootItemsByParentId[loot.parentId] === undefined)
                    lootItemsByParentId[loot.parentId] = [];
                lootItemsByParentId[loot.parentId].push(loot);
            }
            for (const itemId of Object.keys(lootItemsHash)) {
                let newId = HashUtil.generate();
                lootItemsHash[itemId]._id = newId;
                if (itemId === data.Root)
                    data.Root = newId;
                if (lootItemsByParentId[itemId] === undefined)
                    continue;
                for (const childrenItem of lootItemsByParentId[itemId]) {
                    childrenItem.parentId = newId;
                }
            }
            const globalLootChanceModifier = DatabaseServer.tables.globals.config.GlobalLootChanceModifier;
            const locationLootChanceModifier = location.base.GlobalLootChanceModifier;
            const num = RandomUtil.getInt(0, 100);
            const spawnChance = DatabaseServer.tables.templates.items[data.Items[0]._tpl]._props.SpawnChance;
            let itemChance;
            if (LI.config.loot_spawnrate && LI.config.loot_spawnrate.enabled) {
                itemChance = spawnChance < LocationConfig.loot_spawnrate.dynamic ? LocationConfig.loot_spawnrate.dynamic : spawnChance;
            } else {
                itemChance = Math.round(spawnChance * globalLootChanceModifier * locationLootChanceModifier);
            }
            if (itemChance >= num) {
                if (LI.config.fix_location_generator.peek_spawn) {
                    for (const i in data.Items) {
                        peekSpawns("dynamic loot", data.Items[i]._tpl, DatabaseServer.tables.locales.global.en.templates[data.Items[i]._tpl].ShortName);
                    }
                }
                return {"status": "success", "data": data, "position": position};
            }
            return {"status": "fail"};
        };
        LocationGenerator.generateContainerLoot = function (items) {
            let container = JsonUtil.clone(DatabaseServer.tables.loot.statics[items[0]._tpl]);
            let parentId = items[0]._id;
            let idPrefix = parentId.substring(0, parentId.length - 4);
            let idSuffix = parseInt(parentId.substring(parentId.length - 4), 16) + 1;
            let container2D = Array(container.height).fill(0).map(() => Array(container.width).fill(0));
            let minCount = container.minCount;
            for (let i = 1; i < items.length; i++) {
                const item = ItemHelper.getItem(items[i]._tpl)[1];
                container2D = ContainerHelper.fillContainerMapWithItem(
                    container2D, items[i].location.x, items[i].location.y, item._props.Width, item._props.Height, items[i].location.r);
            }
            for (let i = minCount; i < container.maxCount; i++) {
                let roll = RandomUtil.getInt(0, 100);
                if (roll < container.chance) {
                    minCount++;
                }
            }
            for (let i = 0; i < minCount; i++) {
                let item = {};
                let containerItem = {};
                let rolledIndex = 0;
                let result = {success: false};
                let maxAttempts = 20;
                let maxProbability = container.items[container.items.length - 1].cumulativeChance;
                while (!result.success && maxAttempts) {
                    let roll = RandomUtil.getInt(0, maxProbability);
                    rolledIndex = container.items.findIndex(itm => itm.cumulativeChance >= roll);
                    const rolled = container.items[rolledIndex];
                    item = JsonUtil.clone(ItemHelper.getItem(rolled.id)[1]);
                    if (rolled.preset) {
                        item._props.presetId = rolled.preset.id;
                        item._props.Width = rolled.preset.w;
                        item._props.Height = rolled.preset.h;
                    }
                    result = ContainerHelper.findSlotForItem(container2D, item._props.Width, item._props.Height);
                    maxAttempts--;
                }
                if (!result.success)
                    break;
                container2D = ContainerHelper.fillContainerMapWithItem(
                    container2D, result.x, result.y, item._props.Width, item._props.Height, result.rotation);
                let rot = result.rotation ? 1 : 0;
                if (item._props.presetId) {
                    let preset = JsonUtil.clone(PresetController.getStandardPreset(item._id));
                    preset._items[0].parentId = parentId;
                    preset._items[0].slotId = "main";
                    preset._items[0].location = {"x": result.x, "y": result.y, "r": rot};
                    for (let p in preset._items) {
                        items.push(JSON.parse(JSON.stringify(preset._items[p])));
                        if (preset._items[p].slotId === "mod_magazine") {
                            let mag = ItemHelper.getItem(preset._items[p]._tpl)[1];
                            let cartridges = {
                                "_id": idPrefix + idSuffix.toString(16),
                                "_tpl": item._props.defAmmo,
                                "parentId": preset._items[p]._id,
                                "slotId": "cartridges",
                                "upd": {"StackObjectsCount": mag._props.Cartridges[0]._max_count}
                            };
                            items.push(cartridges);
                            idSuffix++;
                        }
                    }
                    container.items.splice(rolledIndex, 1);
                    continue;
                }
                containerItem = {
                    "_id": idPrefix + idSuffix.toString(16),
                    "_tpl": item._id,
                    "parentId": parentId,
                    "slotId": "main",
                    "location": {"x": result.x, "y": result.y, "r": rot}
                };
                if (item._parent !== "543be5dd4bdc2deb348b4569") {
                    container.items.splice(rolledIndex, 1);
                }
                let cartridges;
                if (item._parent === "543be5dd4bdc2deb348b4569" || item._parent === "5485a8684bdc2da71d8b4567") {
                    let stackCount = RandomUtil.getInt(item._props.StackMinRandom, item._props.StackMaxRandom);
                    containerItem.upd = {"StackObjectsCount": stackCount};
                } else if (item._parent === "543be5cb4bdc2deb348b4568") {
                    idSuffix++;
                    cartridges = {
                        "_id": idPrefix + idSuffix.toString(16),
                        "_tpl": item._props.StackSlots[0]._props.filters[0].Filter[0],
                        "parentId": containerItem._id,
                        "slotId": "cartridges",
                        "upd": {"StackObjectsCount": item._props.StackMaxRandom}
                    };
                } else if (item._parent === "5448bc234bdc2d3c308b4569") {
                    idSuffix++;
                    cartridges = {
                        "_id": idPrefix + idSuffix.toString(16),
                        "_tpl": item._props.Cartridges[0]._props.filters[0].Filter[0],
                        "parentId": containerItem._id,
                        "slotId": "cartridges",
                        "upd": {"StackObjectsCount": item._props.Cartridges[0]._max_count}
                    };
                }
                if (LI.config.fix_location_generator.peek_spawn) {
                    peekSpawns("container loot", containerItem._tpl, DatabaseServer.tables.locales.global.en.templates[containerItem._tpl].ShortName);
                }
                items.push(containerItem);
                if (cartridges) {
                    items.push(cartridges);
                }
                idSuffix++;
            }
        };
    }

    static fixLogger() {
        if (!LI.config.fix_logger || !LI.config.fix_logger.enabled) {
            return;
        }
        ;
        Logger.log = function (data, front = "", back = "") {
            if (data === '[DEBUG] Saved profiles') return;
            const colors = `${(Logger.colors.front[front] || "")}${Logger.colors.back[back] || ""}`;
            if (colors) {
                console.log(`${colors}${data}\x1b[0m`);
            } else {
                console.log(data);
            }
        };
    }

    static fixNotifier() {
        if (!LI.config.fix_notifier || !LI.config.fix_notifier.enabled) {
            return;
        }
        ;
        HttpRouter.onStaticRoute["/client/notifier/channel/create"] = {
            "aki": function (url, info, sessionID) {
                if (sessionID.includes('?')) {
                    sessionID = sessionID.split('?')[0];
                }
                if (HttpServer.webSockets[sessionID]) HttpServer.webSockets[sessionID].close();
                return NotifierCallbacks.createNotifierChannel(url, info, sessionID);
            }
        };
        HttpRouter.onStaticRoute["/client/game/profile/select"] = {
            "aki": function (url, info, sessionID) {
                if (sessionID.includes('?')) {
                    sessionID = sessionID.split('?')[0];
                }
                return NotifierCallbacks.selectProfile(url, info, sessionID);
            }
        };
    }

    static fixRagfair() {
        if (!LI.config.fix_ragfair || !LI.config.fix_ragfair.enabled) {
            return;
        }
        ;
        PresetController.initialize();
        RagfairServer.generateDynamicOffers = function () {
            const config = RagfairConfig.dynamic;
            const count = config.threshold + config.batchSize;
            const assort = JsonUtil.clone(DatabaseServer.tables.traders["ragfair"].assort);
            const assortItems = assort.items.filter((item) => {
                return item.slotId === "hideout";
            });
            while (RagfairServer.offers.length < count) {
                let item = RandomUtil.getArrayValue(assortItems);
                const isPreset = PresetController.isPreset(item._id);
                item.upd.StackObjectsCount = (isPreset) ? 1 : Math.round(RandomUtil.getInt(config.stack.min, config.stack.max));
                let getStandardPresetItems = function (item) {
                    const standard = PresetController.getStandardPreset(item._tpl);
                    const preset = JsonUtil.clone(standard._items);
                    item._id = standard._id;
                    return RagfairServer.reparentPresets(item, preset);
                };
                let items = (isPreset) ? getStandardPresetItems(item) : [...[item], ...ItemHelper.findAndReturnChildrenByAssort(item._id, assort.items)];
                const userID = HashUtil.generate();
                const barterScheme = RagfairServer.getOfferRequirements(items);
                const price = RagfairServer.getBarterPrice(barterScheme);
                RagfairServer.createOffer(
                    userID,
                    TimeUtil.getTimestamp(),
                    items,
                    barterScheme,
                    assort.loyal_level_items[item._id],
                    price,
                    isPreset);
            }
        };
        RagfairServer.getDynamicOfferPrice = function (items, currency) {
            let price = PaymentController.fromRUB(RagfairServer.prices.dynamic[items[0]._tpl], currency);
            price = Math.round(price * RandomUtil.getFloat(RagfairConfig.dynamic.price.min, RagfairConfig.dynamic.price.max));
            if (price < 1) {
                price = 1;
            }
            return price;
        };
    }

    static fixSave() {
        if (!LI.config.fix_save_server || !LI.config.fix_save_server.enabled) {
            return;
        }
        ;
        SaveServer.saveProfile = function (sessionID) {
            const file = `${SaveServer.filepath}${sessionID}.json`;
            for (const callback in SaveServer.onSave) {
                SaveServer.profiles[sessionID] = SaveServer.onSave[callback](sessionID);
            }
            try {
                const previous = JSON.stringify(JSON.parse(VFS.readFile(file)), true);
                const current = JSON.stringify(SaveServer.profiles[sessionID], true);
                if (current !== previous) {
                    Logger.debug(`Saved profile - ${sessionID}`);
                    VFS.writeFile(file, JsonUtil.serialize(SaveServer.profiles[sessionID], true));
                }
            } catch (e) {
                Logger.debug(`Saved profile - ${sessionID}`);
                VFS.writeFile(file, JsonUtil.serialize(SaveServer.profiles[sessionID], true));
            }
        };
    }

    static fixTrader() {
        if (!LI.config.fix_trader || !LI.config.fix_trader.enabled) {
            return;
        }
        ;
        TraderController.getPurchasesData = function (traderID, sessionID) {
            let pmcData = ProfileController.getPmcProfile(sessionID);
            let trader = DatabaseServer.tables.traders[traderID].base;
            let currency = PaymentController.getCurrency(trader.currency);
            let output = {};
            let marketEnabled = SaveServer.profiles[sessionID].characters.pmc.Info.Level >= DatabaseServer.tables.globals.config.RagFair.minUserLevel;
            for (let item of pmcData.Inventory.items) {
                let price = 0;
                if (item._id === pmcData.Inventory.equipment
                    || item._id === pmcData.Inventory.stash
                    || item._id === pmcData.Inventory.questRaidItems
                    || item._id === pmcData.Inventory.questStashItems
                    || ItemHelper.isNotSellable(item._tpl)
                    || TraderController.traderFilter(trader.sell_category, item._tpl) === false) {
                    continue;
                }
                let applyDiscount = true;
                for (const childItem of ItemHelper.findAndReturnChildrenAsItems(pmcData.Inventory.items, item._id)) {
                    const handbookItem = DatabaseServer.tables.templates.handbook.Items.find((i) => {
                        return childItem._tpl === i.Id;
                    });
                    const count = ("upd" in childItem && "StackObjectsCount" in childItem.upd) ? childItem.upd.StackObjectsCount : 1;
                    if (marketEnabled && traderID === '579dc571d53a0658a154fbec' && childItem.upd && childItem.upd.SpawnedInSession) {
                        applyDiscount = false;
                        price += LI.getMarketPrice(childItem._tpl) * count;
                    } else {
                        price += (!handbookItem) ? 1 : (handbookItem.Price * count);
                    }
                }
                if (item._tpl === '59faff1d86f7746c51718c9c') {
                    applyDiscount = false;
                    price = LI.getMarketPrice(item._tpl);
                }
                if ("upd" in item && "Dogtag" in item.upd && ItemHelper.isDogtag(item._tpl)) {
                    price *= item.upd.Dogtag.Level;
                }
                price *= ItemHelper.getItemQualityPrice(item);
                if (applyDiscount && trader.discount > 0) {
                    price -= (trader.discount / 100) * price;
                }
                price = PaymentController.fromRUB(price, currency);
                price = (price > 0) ? price : 1;
                output[item._id] = [[{"_tpl": currency, "count": price.toFixed(0)}]];
            }
            return output;
        };
    }

    static loadDynamicConfig() {
        LI.config = JSON.parse(VFS.readFile(`user\\mods\\tarkov-spp-mod\\db\\config.json`));
    }

    static getMarketPrice(tpl) {
        let ret = 1;
        if (DatabaseServer.tables.templates.prices[tpl] &&
            (!LI.config.hardcore_challenge || !LI.config.hardcore_challenge.enabled)) {
            ret = DatabaseServer.tables.templates.prices[tpl];
        } else {
            for (let x of DatabaseServer.tables.templates.handbook.Items) {
                if (x.Id === tpl) {
                    ret = x.Price;
                    break;
                }
            }
        }
        return ret;
    }

    static getRandomInt(min_val, max_val) {
        let min = Math.ceil(min_val);
        let max = Math.floor(max_val);
        let mod = max - min;
        return Math.floor((Math.random() * mod) % mod + min);
    }

    static getRandomIntInclusive(min_val, max_val) {
        let min = Math.ceil(min_val);
        let max = Math.floor(max_val);
        let mod = max - min + 1;
        return Math.floor((Math.random() * mod) % mod + min);
    }

    static debug(msg) {
        console.log(`LI Debug> ${msg}`);
    }

    static log(msg) {
        Logger.log(`LI> ${msg}`, `white`, `blue`);
    }
}

module.exports.LI = LI;
