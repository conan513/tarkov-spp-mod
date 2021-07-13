"use strict";
const fs = require("fs");
const IMMEDIATE_SPAWN = -1;

class LC {
    static config = {};
    static traders = {};
    static backup = {
        "bots": {
            "assault": {}, "assaultgroup": {}, "pmcbot": {}, "bear": {}, "usec": {}
        },
        "boss": {
            "bigmap": {}, "factory4_day": {}, "factory4_night": {}, "interchange": {},
            "laboratory": {}, "rezervbase": {}, "shoreline": {}, "woods": {}
        },
        "waves": {
            "bigmap": {}, "factory4_day": {}, "factory4_night": {}, "interchange": {},
            "laboratory": {}, "rezervbase": {}, "shoreline": {}, "woods": {}
        },
        "slots": {
            "bigmap": {"min": 7, "max": 11}, "factory4_day": {"min": 3, "max": 4},
            "factory4_night": {"min": 3, "max": 5}, "interchange": {"min": 9, "max": 13},
            "laboratory": {"min": 5, "max": 9}, "rezervbase": {"min": 8, "max": 11},
            "shoreline": {"min": 9, "max": 12}, "woods": {"min": 7, "max": 13}
        }
    }
    static bot_difficulty_history = [];

    constructor() {
        Logger.info(`[SPP]Community mod is loading...`);
        this.load();
        Logger.info(`[SPP]Community mod is loaded.`);
    }

    static WIP() {
    }

    load() {
        LC.loadConfig();
        LC.WIP();
        LC.traders.prapor = DatabaseServer.tables.traders["54cb50c76803fa8b248b4571"];
        LC.traders.therapist = DatabaseServer.tables.traders["54cb57776803fa99248b456e"];
        LC.traders.skier = DatabaseServer.tables.traders["58330581ace78e27b8b10cee"];
        LC.traders.fence = DatabaseServer.tables.traders["579dc571d53a0658a154fbec"];
        LC.traders.peacekeeper = DatabaseServer.tables.traders["5935c25fb3acc3127c3d8cd9"];
        LC.traders.mechanic = DatabaseServer.tables.traders["5a7c2eca46aef81a7ca2145d"];
        LC.traders.ragman = DatabaseServer.tables.traders["5ac3b934156ae10c4430e83c"];
        LC.traders.jaeger = DatabaseServer.tables.traders["5c0647fdd443bc2504c2d371"];
        LC.traders.ragfair = DatabaseServer.tables.traders["ragfair"];
        LC.cheatSecureContainer();
        LC.cheatStims();
        LC.fixTraders();
        LC.fixInsurance();
        LC.fixRates();
        LC.fixScavCooldown();
        LC.fixLoadTimer();
        LC.fixHideoutSpeed();
        LC.fixContainers();
        LC.fixMeds();
        LC.fixWeather()
        LC.fixLocations();
        LC.fixBosses();
        LC.fixBotGeneration();
        LC.fixLocales();
        LC.fixQuests();
        LC.fixAssorts();
        LC.fixBarterTrades();
        RagfairServer.load();
        LC.fixWeapons();
        LC.fixMods();
        LC.fixAmmunitions();
        LC.applyHardcoreChallenge();
        LC.backupDatabase();
        LC.applyDynamicConfig();
        if (LC.config.fix_sniper_skill && LC.config.fix_sniper_skill.enabled) {
            HttpRouter.onStaticRoute["/launcher/profile/login"] = {
                "aki": function (url, info, sessionID) {
                    LC.fixSniperSkill(sessionID);
                    return LauncherCallbacks.login(url, info, sessionID);
                }
            };
        }
        if (LC.config.fix_save_server && LC.config.fix_save_server.enabled) {
            HttpRouter.onStaticRoute["/client/game/logout"] = {
                "aki": function (url, info, sessionID) {
                    if (sessionID) SaveServer.saveProfile(sessionID);
                    return GameCallbacks.gameLogout(url, info, sessionID);
                }
            };
            SaveServer.loadProfile = function (sessionID) {
                const file = `${SaveServer.filepath}${sessionID}.json`;
                if (VFS.exists(file)) {
                    SaveServer.profiles[sessionID] = JsonUtil.deserialize(VFS.readFile(file));
                }
                for (const callback in SaveServer.onLoad) {
                    SaveServer.profiles[sessionID] = SaveServer.onLoad[callback](sessionID);
                }
                let profile = SaveServer.profiles[sessionID];
                const quests = profile.characters.pmc.Quests;
                const completedQuests = {};
                for (let idx in quests) {
                    if (quests[idx].status === 'Success') completedQuests[quests[idx].qid] = true;
                }
                const bcs = profile.characters.pmc.BackendCounters;
                for (let key in bcs) {
                    if (completedQuests.hasOwnProperty(bcs[key].qid)) delete bcs[key];
                }
            };
        }
        if (
            (LC.config.fix_insurance && LC.config.fix_insurance.enabled) ||
            (LC.config.check_inventory_integrity && LC.config.check_inventory_integrity.enabled)
        ) {
            HttpRouter.onStaticRoute["/client/checkVersion"] = {
                "aki": function (url, info, sessionID) {
                    if ((LC.config.fix_insurance && LC.config.fix_insurance.enabled))
                        InsuranceController.processReturn();
                    if ((LC.config.check_inventory_integrity && LC.config.check_inventory_integrity.enabled))
                        LC.checkInventoryIntegrity(sessionID);
                    return GameCallbacks.validateGameVersion(url, info, sessionID);
                }
            };
        }
        if (LC.config.pmc_conversion_chance && LC.config.pmc_conversion_chance.enabled) {
            BotConfig.pmc.isUsec = LC.config.pmc_conversion_chance.usec_chance;
            ;
            HttpRouter.onDynamicRoute["/client/location/getLocalloot"] = {
                "aki-name": InraidCallbacks.registerPlayer,
                "aki-loot": function (url, info, sessionID) {
                    let location = info.locationId;
                    ;
                    LC.applyDynamicConfig(sessionID, location);
                    if (location) {
                        if (LC.config.pmc_conversion_chance.as_assault || LC.config.pmc_conversion_chance.as_boss) {
                            LC.config.pmc_conversion_chance.apply_assault_group = false;
                            LC.config.pmc_conversion_chance.from = 0;
                            LC.config.pmc_conversion_chance.to = 0;
                        }
                        LC.setPmcConversionChance(location, sessionID);
                    }
                    return LocationCallbacks.getLocation(url, info, sessionID);
                }
            };
        }
        if (LC.config.no_save_ticket && LC.config.no_save_ticket.enabled) {
            DatabaseServer.tables.locales.global.en.templates["no_save_ticket"] = JSON.parse('{"Name":"NO SAVE ticket","ShortName":"no save","Description":"Possessing this prevents your profile from being saved after raid."}');
            DatabaseServer.tables.templates.handbook.Items.push(JSON.parse('{"Id":"no_save_ticket","ParentId":"5c518ed586f774119a772aee","Price":100}'));
            DatabaseServer.tables.templates.items["no_save_ticket"] = JSON.parse('{"_id":"no_save_ticket","_name":"no_save_ticket","_parent":"5c164d2286f774194c5e69fa","_type":"Item","_props":{"Name":"item_keycard_lab_single_use","ShortName":"item_keycard_lab_single_use","Description":"item_keycard_lab_single_use","Weight":0.01,"BackgroundColor":"red","Width":1,"Height":1,"StackMaxSize":1,"Rarity":"Not_exist","SpawnChance":6,"CreditsPrice":100,"ItemSound":"item_plastic_generic","Prefab":{"path":"assets/content/items/spec/item_keycard_lab/item_keycard_lab_white_sanitar.bundle","rcid":""},"UsePrefab":{"path":"","rcid":""},"StackObjectsCount":1,"NotShownInSlot":false,"ExaminedByDefault":false,"ExamineTime":1,"IsUndiscardable":false,"IsUnsaleable":false,"IsUnbuyable":false,"IsUngivable":false,"IsLockedafterEquip":false,"QuestItem":false,"LootExperience":20,"ExamineExperience":10,"HideEntrails":false,"RepairCost":0,"RepairSpeed":0,"ExtraSizeLeft":0,"ExtraSizeRight":0,"ExtraSizeUp":0,"ExtraSizeDown":0,"ExtraSizeForceAdd":false,"MergesWithChildren":false,"CanSellOnRagfair":true,"CanRequireOnRagfair":true,"ConflictingItems":[],"FixedPrice":false,"Unlootable":false,"UnlootableFromSlot":"FirstPrimaryWeapon","UnlootableFromSide":[],"ChangePriceCoef":1,"AllowSpawnOnLocations":["laboratory","Shoreline"],"SendToClient":false,"AnimationVariantsNumber":0,"DiscardingBlock":false,"RagFairCommissionModifier":1,"IsAlwaysAvailableForInsurance":false},"_proto":"5751916f24597720a27126df"}');
            LC.addAssort(LC.traders.therapist, 'therapist_no_save_ticket', 1, null,
                '{"_id":"therapist_no_save_ticket","_tpl":"no_save_ticket","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":999999999}}',
                '[[{"count":100,"_tpl":"5449016a4bdc2d6f028b456f"}]]',
                null);
            HttpRouter.onStaticRoute["/raid/profile/save"] = {
                "aki": function (url, info, sessionID) {
                    let pmcData = ProfileController.getPmcProfile(sessionID);
                    const isPlayerScav = info.isPlayerScav;
                    const preRaidGear = (isPlayerScav) ? [] : InraidController.getPlayerGear(pmcData.Inventory.items);
                    for (const item of preRaidGear) {
                        if (item._tpl === 'no_save_ticket') {
                            ;
                            return HttpResponse.nullResponse();
                        }
                    }
                    return InraidCallbacks.saveProgress(url, info, sessionID);
                }
            };
        }
    }

    static applyHardcoreChallenge() {
        if (!LC.config.hardcore_challenge || !LC.config.hardcore_challenge.enabled) {
            return;
        }
        ;
        if (LC.config.hardcore_challenge.rules === 1 || LC.config.hardcore_challenge.rules === 2) {
            DatabaseServer.tables.globals.config.SavagePlayCooldown = 31536000;
        }
        if (LC.config.hardcore_challenge.rules === 1 || LC.config.hardcore_challenge.rules === 2) {
            DatabaseServer.tables.locations.bigmap.base.Insurance = false;
            DatabaseServer.tables.locations.factory4_day.base.Insurance = false;
            DatabaseServer.tables.locations.factory4_night.base.Insurance = false;
            DatabaseServer.tables.locations.interchange.base.Insurance = false;
            DatabaseServer.tables.locations.rezervbase.base.Insurance = false;
            DatabaseServer.tables.locations.shoreline.base.Insurance = false;
            DatabaseServer.tables.locations.woods.base.Insurance = false;
        }
        if (LC.config.hardcore_challenge.rules === 1) {
            const currencies = ["5449016a4bdc2d6f028b456f", "5696686a4bdc2da3298b456a", "569668774bdc2da2298b4568"];
            const exceptions = [
                "training_stim_01", "training_stim_02", "training_stim_03", "training_stim_04",
                "5449016a4bdc2d6f028b456f", "5696686a4bdc2da3298b456a", "569668774bdc2da2298b4568",
                "5c093e3486f77430cb02e593", "59fb042886f7746c5005a7b2", "5aafbcd986f7745e590fff23", "5b7c710788a4506dec015957",
                "544a11ac4bdc2d470e8b456a", "5aafbde786f774389d0cbc0f", "5c127c4486f7745625356c13",
                "5991b51486f77447b112d44f", "544fb5454bdc2df8738b456a", "5ac78a9b86f7741cca0bbd8d", "5b4391a586f7745321235ab2"
            ];
            const removeMoneyTrades = function (trader) {
                let items = trader.assort.items;
                for (let itemIdx in items) {
                    let item = items[itemIdx];
                    if (item.slotId === 'hideout' && trader.assort.barter_scheme[item._id]) {
                        let barterScheme = trader.assort.barter_scheme[item._id][0];
                        let isMoneyTrade = false;
                        for (let barterSchemeIdx in barterScheme) {
                            let barterSchemeChild = barterScheme[barterSchemeIdx];
                            isMoneyTrade = currencies.includes(barterSchemeChild._tpl);
                        }
                        if (isMoneyTrade && !exceptions.includes(item._tpl)) {
                            LC.addAssort(trader, item._id, 5, null, null, null, null);
                        }
                    }
                }
            };
            removeMoneyTrades(LC.traders.prapor);
            removeMoneyTrades(LC.traders.therapist);
            removeMoneyTrades(LC.traders.skier);
            removeMoneyTrades(LC.traders.fence);
            removeMoneyTrades(LC.traders.peacekeeper);
            removeMoneyTrades(LC.traders.mechanic);
            removeMoneyTrades(LC.traders.ragman);
            removeMoneyTrades(LC.traders.jaeger);
        }
        if (LC.config.hardcore_challenge.rules === 1 || LC.config.hardcore_challenge.rules === 2) {
            TraderConfig.fenceAssortSize = 0;
        }
        if (LC.config.hardcore_challenge.rules === 1 || LC.config.hardcore_challenge.rules === 2) {
            DatabaseServer.tables.globals.config.RagFair.enabled = false;
            LC.addAssort(LC.traders.mechanic, 'ratchet_mechanic', 1, null,
                '{"_id":"ratchet_mechanic","_tpl":"60391afc25aff57af81f7085","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":999999999}}',
                '[[{"count":80000,"_tpl":"5449016a4bdc2d6f028b456f"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, 'thermite_mechanic', 1, null,
                '{"_id":"thermite_mechanic","_tpl":"60391a8b3364dc22b04d0ce5","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":999999999}}',
                '[[{"count":110000,"_tpl":"5449016a4bdc2d6f028b456f"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, 'tp_200_mechanic', 1, null,
                '{"_id":"tp_200_mechanic","_tpl":"60391b0fb847c71012789415","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":999999999}}',
                '[[{"count":30000,"_tpl":"5449016a4bdc2d6f028b456f"}]]',
                null);
        }
        if (LC.config.hardcore_challenge.rules === 1) {
            DatabaseServer.tables.templates.items['5857a8b324597729ab0a0e7d']._props.Grids[0]._props.cellsH = 2;
            DatabaseServer.tables.templates.items['5857a8b324597729ab0a0e7d']._props.Grids[0]._props.cellsV = 2;
            DatabaseServer.tables.templates.items['5857a8bc2459772bad15db29']._props.Grids[0]._props.cellsH = 2;
            DatabaseServer.tables.templates.items['5857a8bc2459772bad15db29']._props.Grids[0]._props.cellsV = 2;
            const sc_filters = '[{"Filter":["59fafd4b86f7745ca07e1232","5d235bb686f77443f4331278","590c60fc86f77412b13fddcf","5783c43d2459774bbe137486","543be5e94bdc2df1348b4568"]}]';
            DatabaseServer.tables.templates.items['544a11ac4bdc2d470e8b456a']._props.Grids[0]._props.filters = JSON.parse(sc_filters);
            DatabaseServer.tables.templates.items['5857a8b324597729ab0a0e7d']._props.Grids[0]._props.filters = JSON.parse(sc_filters);
            DatabaseServer.tables.templates.items['59db794186f77448bc595262']._props.Grids[0]._props.filters = JSON.parse(sc_filters);
            DatabaseServer.tables.templates.items['5857a8bc2459772bad15db29']._props.Grids[0]._props.filters = JSON.parse(sc_filters);
            DatabaseServer.tables.templates.items['5c093ca986f7740a1867ab12']._props.Grids[0]._props.filters = JSON.parse(sc_filters);
        } else if (LC.config.hardcore_challenge.rules === 2) {
            const sc_filters = '[{"Filter":[]}]';
            DatabaseServer.tables.templates.items['544a11ac4bdc2d470e8b456a']._props.Grids[0]._props.filters = JSON.parse(sc_filters);
            DatabaseServer.tables.templates.items['5857a8b324597729ab0a0e7d']._props.Grids[0]._props.filters = JSON.parse(sc_filters);
            DatabaseServer.tables.templates.items['59db794186f77448bc595262']._props.Grids[0]._props.filters = JSON.parse(sc_filters);
            DatabaseServer.tables.templates.items['5857a8bc2459772bad15db29']._props.Grids[0]._props.filters = JSON.parse(sc_filters);
            DatabaseServer.tables.templates.items['5c093ca986f7740a1867ab12']._props.Grids[0]._props.filters = JSON.parse(sc_filters);
        }
        if (LC.config.hardcore_challenge.rules === 1) {
            const startingInventory = '{"items":[{"_id":"5fe4977574f15b4ad31b6631","_tpl":"55d7217a4bdc2d86028b456d"},{"_id":"5fe4977574f15b4ad31b66b6","_tpl":"566abbc34bdc2d92178b4576"},{"_id":"5fe4977574f15b4ad31b6625","_tpl":"544a11ac4bdc2d470e8b456a","parentId":"5fe4977574f15b4ad31b6631","slotId":"SecuredContainer"},{"_id":"5fe4a9fcf5aec236ec38363a","_tpl":"557ffd194bdc2d28148b457f","parentId":"5fe4977574f15b4ad31b6631","slotId":"Pockets"},{"_id":"5fe4977574f15b4ad31b66b7","_tpl":"5963866b86f7747bfa1c4462"},{"_id":"5fe4977574f15b4ad31b66b8","_tpl":"5963866286f7747bf429b572"}],"equipment":"5fe4977574f15b4ad31b6631","stash":"5fe4977574f15b4ad31b66b6","questRaidItems":"5fe4977574f15b4ad31b66b7","questStashItems":"5fe4977574f15b4ad31b66b8","fastPanel":{}}';
            const profiles = DatabaseServer.tables.templates.profiles;
            profiles['Standard'].bear.character.Inventory = JSON.parse(startingInventory);
            profiles['Standard'].usec.character.Inventory = JSON.parse(startingInventory);
            profiles['Left Behind'].bear.character.Inventory = JSON.parse(startingInventory);
            profiles['Left Behind'].usec.character.Inventory = JSON.parse(startingInventory);
            profiles['Prepare To Escape'].bear.character.Inventory = JSON.parse(startingInventory);
            profiles['Prepare To Escape'].usec.character.Inventory = JSON.parse(startingInventory);
            profiles['Edge Of Darkness'].bear.character.Inventory = JSON.parse(startingInventory);
            profiles['Edge Of Darkness'].usec.character.Inventory = JSON.parse(startingInventory);
        } else if (LC.config.hardcore_challenge.rules === 2) {
            const startingInventory = '{"items":[{"_id":"5fe4977574f15b4ad31b6631","_tpl":"55d7217a4bdc2d86028b456d"},{"_id":"5fe4977574f15b4ad31b66b6","_tpl":"566abbc34bdc2d92178b4576"},{"_id":"5fe49cdfa19cac3fa9054069","_tpl":"54491bb74bdc2d09088b4567","parentId":"5fe4977574f15b4ad31b6631","slotId":"Scabbard","upd":{"Repairable":{"MaxDurability":70,"Durability":70}}},{"_id":"5fe4a9fcf5aec236ec38363a","_tpl":"557ffd194bdc2d28148b457f","parentId":"5fe4977574f15b4ad31b6631","slotId":"Pockets"},{"_id":"5fe4977574f15b4ad31b66b7","_tpl":"5963866b86f7747bfa1c4462"},{"_id":"5fe4977574f15b4ad31b66b8","_tpl":"5963866286f7747bf429b572"}],"equipment":"5fe4977574f15b4ad31b6631","stash":"5fe4977574f15b4ad31b66b6","questRaidItems":"5fe4977574f15b4ad31b66b7","questStashItems":"5fe4977574f15b4ad31b66b8","fastPanel":{}}';
            const profiles = DatabaseServer.tables.templates.profiles;
            profiles['Standard'].bear.character.Inventory = JSON.parse(startingInventory);
            profiles['Standard'].usec.character.Inventory = JSON.parse(startingInventory);
            profiles['Left Behind'].bear.character.Inventory = JSON.parse(startingInventory);
            profiles['Left Behind'].usec.character.Inventory = JSON.parse(startingInventory);
            profiles['Prepare To Escape'].bear.character.Inventory = JSON.parse(startingInventory);
            profiles['Prepare To Escape'].usec.character.Inventory = JSON.parse(startingInventory);
            profiles['Edge Of Darkness'].bear.character.Inventory = JSON.parse(startingInventory);
            profiles['Edge Of Darkness'].usec.character.Inventory = JSON.parse(startingInventory);
        }
    }

    static backupDatabase() {
        LC.backup.waves.bigmap = JSON.stringify(DatabaseServer.tables.locations.bigmap.base.waves);
        LC.backup.waves.factory4_day = JSON.stringify(DatabaseServer.tables.locations.factory4_day.base.waves);
        LC.backup.waves.factory4_night = JSON.stringify(DatabaseServer.tables.locations.factory4_night.base.waves);
        LC.backup.waves.interchange = JSON.stringify(DatabaseServer.tables.locations.interchange.base.waves);
        LC.backup.waves.laboratory = JSON.stringify(DatabaseServer.tables.locations.laboratory.base.waves);
        LC.backup.waves.rezervbase = JSON.stringify(DatabaseServer.tables.locations.rezervbase.base.waves);
        LC.backup.waves.shoreline = JSON.stringify(DatabaseServer.tables.locations.shoreline.base.waves);
        LC.backup.waves.woods = JSON.stringify(DatabaseServer.tables.locations.woods.base.waves);
        LC.backup.boss.bigmap = JSON.stringify(DatabaseServer.tables.locations.bigmap.base.BossLocationSpawn);
        LC.backup.boss.factory4_day = JSON.stringify(DatabaseServer.tables.locations.factory4_day.base.BossLocationSpawn);
        LC.backup.boss.factory4_night = JSON.stringify(DatabaseServer.tables.locations.factory4_night.base.BossLocationSpawn);
        LC.backup.boss.interchange = JSON.stringify(DatabaseServer.tables.locations.interchange.base.BossLocationSpawn);
        LC.backup.boss.laboratory = JSON.stringify(DatabaseServer.tables.locations.laboratory.base.BossLocationSpawn);
        LC.backup.boss.rezervbase = JSON.stringify(DatabaseServer.tables.locations.rezervbase.base.BossLocationSpawn);
        LC.backup.boss.shoreline = JSON.stringify(DatabaseServer.tables.locations.shoreline.base.BossLocationSpawn);
        LC.backup.boss.woods = JSON.stringify(DatabaseServer.tables.locations.woods.base.BossLocationSpawn);
        LC.backup.bots.assault = JSON.stringify(DatabaseServer.tables.bots.types.assault);
        LC.backup.bots.assaultgroup = JSON.stringify(DatabaseServer.tables.bots.types.assaultgroup);
        LC.backup.bots.bear = JSON.stringify(DatabaseServer.tables.bots.types.bear);
        LC.backup.bots.bossbully = JSON.stringify(DatabaseServer.tables.bots.types.bossbully);
        LC.backup.bots.bossgluhar = JSON.stringify(DatabaseServer.tables.bots.types.bossgluhar);
        LC.backup.bots.bosskilla = JSON.stringify(DatabaseServer.tables.bots.types.bosskilla);
        LC.backup.bots.bosskojaniy = JSON.stringify(DatabaseServer.tables.bots.types.bosskojaniy);
        LC.backup.bots.bosssanitar = JSON.stringify(DatabaseServer.tables.bots.types.bosssanitar);
        LC.backup.bots.bosstest = JSON.stringify(DatabaseServer.tables.bots.types.bosstest);
        LC.backup.bots.cursedassault = JSON.stringify(DatabaseServer.tables.bots.types.cursedassault);
        LC.backup.bots.followerbully = JSON.stringify(DatabaseServer.tables.bots.types.followerbully);
        LC.backup.bots.followergluharassault = JSON.stringify(DatabaseServer.tables.bots.types.followergluharassault);
        LC.backup.bots.followergluharscout = JSON.stringify(DatabaseServer.tables.bots.types.followergluharscout);
        LC.backup.bots.followergluharsecurity = JSON.stringify(DatabaseServer.tables.bots.types.followergluharsecurity);
        LC.backup.bots.followergluharsnipe = JSON.stringify(DatabaseServer.tables.bots.types.followergluharsnipe);
        LC.backup.bots.followerkojaniy = JSON.stringify(DatabaseServer.tables.bots.types.followerkojaniy);
        LC.backup.bots.followersanitar = JSON.stringify(DatabaseServer.tables.bots.types.followersanitar);
        LC.backup.bots.followertest = JSON.stringify(DatabaseServer.tables.bots.types.followertest);
        LC.backup.bots.marksman = JSON.stringify(DatabaseServer.tables.bots.types.marksman);
        LC.backup.bots.playerscav = JSON.stringify(DatabaseServer.tables.bots.types.playerscav);
        LC.backup.bots.pmcbot = JSON.stringify(DatabaseServer.tables.bots.types.pmcbot);
        LC.backup.bots.sectantpriest = JSON.stringify(DatabaseServer.tables.bots.types.sectantpriest);
        LC.backup.bots.sectantwarrior = JSON.stringify(DatabaseServer.tables.bots.types.sectantwarrior);
        LC.backup.bots.test = JSON.stringify(DatabaseServer.tables.bots.types.test);
        LC.backup.bots.usec = JSON.stringify(DatabaseServer.tables.bots.types.usec);
    }

    static cheatSecureContainer() {
        if (!LC.config.cheat || !LC.config.cheat.enabled || !LC.config.cheat.secure_container) {
            return;
        }
        ;
        DatabaseServer.tables.templates.items['544a11ac4bdc2d470e8b456a']._props.Weight = 0 - 15.0 - 0.8;
        DatabaseServer.tables.templates.items['5857a8b324597729ab0a0e7d']._props.Weight = 0 - 15.0 - 1;
        DatabaseServer.tables.templates.items['59db794186f77448bc595262']._props.Weight = 0 - 15.0 - 1.5;
        DatabaseServer.tables.templates.items['5857a8bc2459772bad15db29']._props.Weight = 0 - 15.0 - 1.2;
        DatabaseServer.tables.templates.items['5c093ca986f7740a1867ab12']._props.Weight = 0 - 15.0 - 2;
    }

    static cheatStims() {
        if (!LC.config.cheat || !LC.config.cheat.enabled || !LC.config.cheat.training_stim) {
            return;
        }
        ;
        DatabaseServer.tables.locales.global.en.templates["training_stim_01"] = JSON.parse('{"Name":"Training stim 01","ShortName":"Training 1","Description":"Training stim of stamina recovery and carrying weight."}');
        DatabaseServer.tables.templates.handbook.Items.push(JSON.parse('{"Id":"training_stim_01","ParentId":"5b47574386f77428ca22b33a","Price":1000}'));
        DatabaseServer.tables.templates.items["training_stim_01"] = JSON.parse('{"_id":"training_stim_01","_name":"training_stim_01","_parent":"5448f3a64bdc2d60728b456a","_type":"Item","_props":{"Name":"SJ1 TGLabs","ShortName":"SJ1 TGLabs","Description":"","Weight":0.05,"BackgroundColor":"yellow","Width":1,"Height":1,"StackMaxSize":1,"Rarity":"Not_exist","SpawnChance":1,"CreditsPrice":1000,"ItemSound":"med_stimulator","Prefab":{"path":"assets/content/weapons/usable_items/item_syringe/item_stimulator_sj1_loot.bundle","rcid":""},"UsePrefab":{"path":"assets/content/weapons/usable_items/item_syringe/item_stimulator_sj1_container.bundle","rcid":""},"StackObjectsCount":1,"NotShownInSlot":false,"ExaminedByDefault":false,"ExamineTime":1,"IsUndiscardable":false,"IsUnsaleable":false,"IsUnbuyable":false,"IsUngivable":false,"IsLockedafterEquip":false,"QuestItem":false,"LootExperience":20,"ExamineExperience":8,"HideEntrails":false,"RepairCost":0,"RepairSpeed":0,"ExtraSizeLeft":0,"ExtraSizeRight":0,"ExtraSizeUp":0,"ExtraSizeDown":0,"ExtraSizeForceAdd":false,"MergesWithChildren":false,"CanSellOnRagfair":true,"CanRequireOnRagfair":true,"ConflictingItems":[],"FixedPrice":false,"Unlootable":false,"UnlootableFromSlot":"FirstPrimaryWeapon","UnlootableFromSide":[],"ChangePriceCoef":1,"AllowSpawnOnLocations":["laboratory"],"SendToClient":true,"AnimationVariantsNumber":0,"DiscardingBlock":false,"RagFairCommissionModifier":1,"medUseTime":2,"medEffectType":"duringUse","MaxHpResource":0,"hpResourceRate":0,"StimulatorBuffs":"Buffs_Traning_01","effects_health":[],"effects_damage":[]},"_proto":"544fb3f34bdc2d03748b456a"}');
        DatabaseServer.tables.globals.config.Health.Effects.Stimulator.Buffs.Buffs_Traning_01 = JSON.parse('[{"BuffType":"StaminaRate","Chance":1,"Delay":1,"Duration":3000,"Value":3,"AbsoluteValue":true,"SkillName":""},{"BuffType":"WeightLimit","Chance":1,"Delay":1,"Duration":3000,"Value":0.27,"AbsoluteValue":false,"SkillName":""}]');
        LC.addAssort(LC.traders.therapist, 'therapist_training_stim_01', 1, null,
            '{"_id":"therapist_training_stim_01","_tpl":"training_stim_01","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":999999999}}',
            '[[{"count":1000,"_tpl":"5449016a4bdc2d6f028b456f"}]]',
            null);
        DatabaseServer.tables.locales.global.en.templates["training_stim_02"] = JSON.parse('{"Name":"Training stim 02","ShortName":"Training 2","Description":"Training stim of increased recoil control."}');
        DatabaseServer.tables.templates.handbook.Items.push(JSON.parse('{"Id":"training_stim_02","ParentId":"5b47574386f77428ca22b33a","Price":100000}'));
        DatabaseServer.tables.templates.items["training_stim_02"] = JSON.parse('{"_id":"training_stim_02","_name":"training_stim_02","_parent":"5448f3a64bdc2d60728b456a","_type":"Item","_props":{"Name":"M.U.L.E","ShortName":"M.U.L.E","Description":"","Weight":0.05,"BackgroundColor":"yellow","Width":1,"Height":1,"StackMaxSize":1,"Rarity":"Superrare","SpawnChance":1,"CreditsPrice":1000,"ItemSound":"med_stimulator","Prefab":{"path":"assets/content/weapons/usable_items/item_syringe/item_stimulator_mule_loot.bundle","rcid":""},"UsePrefab":{"path":"assets/content/weapons/usable_items/item_syringe/item_stimulator_mule_container.bundle","rcid":""},"StackObjectsCount":1,"NotShownInSlot":false,"ExaminedByDefault":false,"ExamineTime":1,"IsUndiscardable":false,"IsUnsaleable":false,"IsUnbuyable":false,"IsUngivable":false,"IsLockedafterEquip":false,"QuestItem":false,"LootExperience":20,"ExamineExperience":8,"HideEntrails":false,"RepairCost":0,"RepairSpeed":0,"ExtraSizeLeft":0,"ExtraSizeRight":0,"ExtraSizeUp":0,"ExtraSizeDown":0,"ExtraSizeForceAdd":false,"MergesWithChildren":false,"CanSellOnRagfair":true,"CanRequireOnRagfair":true,"ConflictingItems":[],"FixedPrice":false,"Unlootable":false,"UnlootableFromSlot":"FirstPrimaryWeapon","UnlootableFromSide":[],"ChangePriceCoef":1,"AllowSpawnOnLocations":["laboratory"],"SendToClient":true,"AnimationVariantsNumber":0,"DiscardingBlock":false,"RagFairCommissionModifier":1,"IsAlwaysAvailableForInsurance":false,"medUseTime":2,"medEffectType":"duringUse","MaxHpResource":0,"hpResourceRate":0,"StimulatorBuffs":"Buffs_Traning_02","effects_health":[],"effects_damage":[]},"_proto":"544fb3f34bdc2d03748b456a"}');
        DatabaseServer.tables.globals.config.Health.Effects.Stimulator.Buffs.Buffs_Traning_02 = JSON.parse('[{"BuffType":"SkillRate","Chance":1,"Delay":1,"Duration":3000,"Value":25,"AbsoluteValue":true,"SkillName":"RecoilControl"}]');
        LC.addAssort(LC.traders.therapist, 'therapist_training_stim_02', 1, null,
            '{"_id":"therapist_training_stim_02","_tpl":"training_stim_02","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":999999999}}',
            '[[{"count":10000,"_tpl":"5449016a4bdc2d6f028b456f"}]]',
            null);
        DatabaseServer.tables.locales.global.en.templates["training_stim_03"] = JSON.parse('{"Name":"Training stim 03","ShortName":"Training 3","Description":"Training stim of increased endurance and strength."}');
        DatabaseServer.tables.templates.handbook.Items.push(JSON.parse('{"Id":"training_stim_03","ParentId":"5b47574386f77428ca22b33a","Price":100000}'));
        DatabaseServer.tables.templates.items["training_stim_03"] = JSON.parse('{"_id":"training_stim_03","_name":"training_stim_03","_parent":"5448f3a64bdc2d60728b456a","_type":"Item","_props":{"Name":"SJ9 TGLabs","ShortName":"SJ9 TGLabs","Description":"","Weight":0.05,"BackgroundColor":"yellow","Width":1,"Height":1,"StackMaxSize":1,"Rarity":"Not_exist","SpawnChance":1,"CreditsPrice":1000,"ItemSound":"med_stimulator","Prefab":{"path":"assets/content/weapons/usable_items/item_syringe/item_stimulator_sj9_tglabs_loot.bundle","rcid":""},"UsePrefab":{"path":"assets/content/weapons/usable_items/item_syringe/item_stimulator_sj9_tglabs_container.bundle","rcid":""},"StackObjectsCount":1,"NotShownInSlot":false,"ExaminedByDefault":false,"ExamineTime":1,"IsUndiscardable":false,"IsUnsaleable":false,"IsUnbuyable":false,"IsUngivable":false,"IsLockedafterEquip":false,"QuestItem":false,"LootExperience":20,"ExamineExperience":8,"HideEntrails":false,"RepairCost":0,"RepairSpeed":0,"ExtraSizeLeft":0,"ExtraSizeRight":0,"ExtraSizeUp":0,"ExtraSizeDown":0,"ExtraSizeForceAdd":false,"MergesWithChildren":false,"CanSellOnRagfair":true,"CanRequireOnRagfair":true,"ConflictingItems":[],"FixedPrice":false,"Unlootable":false,"UnlootableFromSlot":"FirstPrimaryWeapon","UnlootableFromSide":[],"ChangePriceCoef":1,"AllowSpawnOnLocations":["laboratory"],"SendToClient":true,"AnimationVariantsNumber":0,"DiscardingBlock":false,"RagFairCommissionModifier":1,"medUseTime":2,"medEffectType":"duringUse","MaxHpResource":0,"hpResourceRate":0,"StimulatorBuffs":"Buffs_Traning_03","effects_health":[],"effects_damage":[]},"_proto":"544fb3f34bdc2d03748b456a"}');
        DatabaseServer.tables.globals.config.Health.Effects.Stimulator.Buffs.Buffs_Traning_03 = JSON.parse('[{"BuffType":"SkillRate","Chance":1,"Delay":1,"Duration":3000,"Value":10,"AbsoluteValue":true,"SkillName":"Endurance"},{"BuffType":"SkillRate","Chance":1,"Delay":1,"Duration":3000,"Value":30,"AbsoluteValue":true,"SkillName":"Strength"}]');
        LC.addAssort(LC.traders.therapist, 'therapist_training_stim_03', 1, null,
            '{"_id":"therapist_training_stim_03","_tpl":"training_stim_03","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":999999999}}',
            '[[{"count":100000,"_tpl":"5449016a4bdc2d6f028b456f"}]]',
            null);
        DatabaseServer.tables.locales.global.en.templates["training_stim_04"] = JSON.parse('{"Name":"Training stim 04","ShortName":"Training 4","Description":"Training stim of damage reduction."}');
        DatabaseServer.tables.templates.handbook.Items.push(JSON.parse('{"Id":"training_stim_04","ParentId":"5b47574386f77428ca22b33a","Price":200000}'));
        DatabaseServer.tables.templates.items["training_stim_04"] = JSON.parse('{"_id":"training_stim_04","_name":"training_stim_04","_parent":"5448f3a64bdc2d60728b456a","_type":"Item","_props":{"Name":"SJ6 TGLabs","ShortName":"SJ6 TGLabs","Description":"","Weight":0.05,"BackgroundColor":"yellow","Width":1,"Height":1,"StackMaxSize":1,"Rarity":"Not_exist","SpawnChance":1,"CreditsPrice":1000,"ItemSound":"med_stimulator","Prefab":{"path":"assets/content/weapons/usable_items/item_syringe/item_stimulator_sj6_loot.bundle","rcid":""},"UsePrefab":{"path":"assets/content/weapons/usable_items/item_syringe/item_stimulator_sj6_container.bundle","rcid":""},"StackObjectsCount":1,"NotShownInSlot":false,"ExaminedByDefault":false,"ExamineTime":1,"IsUndiscardable":false,"IsUnsaleable":false,"IsUnbuyable":false,"IsUngivable":false,"IsLockedafterEquip":false,"QuestItem":false,"LootExperience":20,"ExamineExperience":8,"HideEntrails":false,"RepairCost":0,"RepairSpeed":0,"ExtraSizeLeft":0,"ExtraSizeRight":0,"ExtraSizeUp":0,"ExtraSizeDown":0,"ExtraSizeForceAdd":false,"MergesWithChildren":false,"CanSellOnRagfair":true,"CanRequireOnRagfair":true,"ConflictingItems":[],"FixedPrice":false,"Unlootable":false,"UnlootableFromSlot":"FirstPrimaryWeapon","UnlootableFromSide":[],"ChangePriceCoef":1,"AllowSpawnOnLocations":["laboratory"],"SendToClient":true,"AnimationVariantsNumber":0,"DiscardingBlock":false,"RagFairCommissionModifier":1,"medUseTime":2,"medEffectType":"duringUse","MaxHpResource":0,"hpResourceRate":0,"StimulatorBuffs":"Buffs_Traning_04","effects_health":[],"effects_damage":[]},"_proto":"544fb3f34bdc2d03748b456a"}');
        DatabaseServer.tables.globals.config.Health.Effects.Stimulator.Buffs.Buffs_Traning_04 = JSON.parse('[{"BuffType":"DamageModifier","Chance":1,"Delay":1,"Duration":3000,"Value":-0.5,"AbsoluteValue":true,"SkillName":""}]');
        LC.addAssort(LC.traders.therapist, 'therapist_training_stim_04', 1, null,
            '{"_id":"therapist_training_stim_04","_tpl":"training_stim_04","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":999999999}}',
            '[[{"count":200000,"_tpl":"5449016a4bdc2d6f028b456f"}]]',
            null);
        DatabaseServer.tables.locales.global.en.templates["training_stim_05"] = JSON.parse('{"Name":"Training stim 05","ShortName":"Training 5","Description":"Training stim of max endurance, strength and recoil control."}');
        DatabaseServer.tables.templates.handbook.Items.push(JSON.parse('{"Id":"training_stim_05","ParentId":"5b47574386f77428ca22b33a","Price":200000}'));
        DatabaseServer.tables.templates.items["training_stim_05"] = JSON.parse('{"_id":"training_stim_05","_name":"training_stim_05","_parent":"5448f3a64bdc2d60728b456a","_type":"Item","_props":{"Name":"SJ9 TGLabs","ShortName":"SJ9 TGLabs","Description":"","Weight":0.05,"BackgroundColor":"yellow","Width":1,"Height":1,"StackMaxSize":1,"Rarity":"Not_exist","SpawnChance":1,"CreditsPrice":1000,"ItemSound":"med_stimulator","Prefab":{"path":"assets/content/weapons/usable_items/item_syringe/item_stimulator_sj9_tglabs_loot.bundle","rcid":""},"UsePrefab":{"path":"assets/content/weapons/usable_items/item_syringe/item_stimulator_sj9_tglabs_container.bundle","rcid":""},"StackObjectsCount":1,"NotShownInSlot":false,"ExaminedByDefault":false,"ExamineTime":1,"IsUndiscardable":false,"IsUnsaleable":false,"IsUnbuyable":false,"IsUngivable":false,"IsLockedafterEquip":false,"QuestItem":false,"LootExperience":20,"ExamineExperience":8,"HideEntrails":false,"RepairCost":0,"RepairSpeed":0,"ExtraSizeLeft":0,"ExtraSizeRight":0,"ExtraSizeUp":0,"ExtraSizeDown":0,"ExtraSizeForceAdd":false,"MergesWithChildren":false,"CanSellOnRagfair":true,"CanRequireOnRagfair":true,"ConflictingItems":[],"FixedPrice":false,"Unlootable":false,"UnlootableFromSlot":"FirstPrimaryWeapon","UnlootableFromSide":[],"ChangePriceCoef":1,"AllowSpawnOnLocations":["laboratory"],"SendToClient":true,"AnimationVariantsNumber":0,"DiscardingBlock":false,"RagFairCommissionModifier":1,"medUseTime":2,"medEffectType":"duringUse","MaxHpResource":0,"hpResourceRate":0,"StimulatorBuffs":"Buffs_Traning_05","effects_health":[],"effects_damage":[]},"_proto":"544fb3f34bdc2d03748b456a"}');
        DatabaseServer.tables.globals.config.Health.Effects.Stimulator.Buffs.Buffs_Traning_05 = JSON.parse('[{"BuffType":"SkillRate","Chance":1,"Delay":1,"Duration":3000,"Value":50,"AbsoluteValue":true,"SkillName":"Endurance"},{"BuffType":"SkillRate","Chance":1,"Delay":1,"Duration":3000,"Value":50,"AbsoluteValue":true,"SkillName":"Strength"},{"BuffType":"SkillRate","Chance":1,"Delay":1,"Duration":3000,"Value":50,"AbsoluteValue":true,"SkillName":"RecoilControl"}]');
        LC.addAssort(LC.traders.therapist, 'therapist_training_stim_05', 1, null,
            '{"_id":"therapist_training_stim_05","_tpl":"training_stim_05","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":999999999}}',
            '[[{"count":300000,"_tpl":"5449016a4bdc2d6f028b456f"}]]',
            null);
    }

    static fixTraders() {
        if (!LC.config.fix_trader || !LC.config.fix_trader.enabled) {
            return;
        }
        ;
        LC.traders.prapor.base.nickname = "Prapor";
        LC.traders.therapist.base.nickname = "Therapist";
        LC.traders.skier.base.nickname = "Skier";
        LC.traders.fence.base.nickname = "Fence";
        LC.traders.peacekeeper.base.nickname = "Peacekeeper";
        LC.traders.mechanic.base.nickname = "Mechanic";
        LC.traders.ragman.base.nickname = "Ragman";
        LC.traders.jaeger.base.nickname = "Jaeger";
        LC.traders.peacekeeper.base.sell_category.push('5b47574386f77428ca22b341');
        LC.traders.prapor.base.discount = 45;
        LC.traders.therapist.base.discount = 25;
        LC.traders.skier.base.discount = 33;
        LC.traders.fence.base.discount = 70;
        LC.traders.peacekeeper.base.discount = 43;
        LC.traders.mechanic.base.discount = 43;
        LC.traders.ragman.base.discount = 40;
        LC.traders.jaeger.base.discount = 15;
    }

    static fixInsurance() {
        if (!LC.config.fix_insurance || !LC.config.fix_insurance.enabled) {
            return;
        }
        ;
        InsuranceConfig.priceMultiplier = 0.35;
        ;
        InsuranceConfig.returnChance = 40;
        ;
        LC.traders.therapist.base.insurance.min_return_hour = 0;
        LC.traders.therapist.base.insurance.max_return_hour = 0;
        ;
        LC.traders.prapor.base.insurance.min_return_hour = 0;
        LC.traders.prapor.base.insurance.max_return_hour = 0;
        ;
    }

    static getMarketPrice(tpl) {
        let ret = 1;
        if (DatabaseServer.tables.templates.prices[tpl]) {
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

    static fixRates() {
        if (!LC.config.fix_rates || !LC.config.fix_rates.enabled) {
            return;
        }
        ;
        DatabaseServer.tables.globals.config.SkillsSettings.SkillProgressRate = 1.8;
        DatabaseServer.tables.globals.config.GlobalLootChanceModifier = 1.0
    }

    static fixScavCooldown() {
        if (!LC.config.fix_scav_cooldown || !LC.config.fix_scav_cooldown.enabled) {
            return;
        }
        ;
        DatabaseServer.tables.globals.config.SavagePlayCooldown = 600;
    }

    static fixLoadTimer() {
        if (!LC.config.fix_load_timer || !LC.config.fix_load_timer.enabled) {
            return;
        }
        ;
        DatabaseServer.tables.globals.config.TimeBeforeDeploy = 1;
        DatabaseServer.tables.globals.config.TimeBeforeDeployLocal = 1;
    }

    static fixHideoutSpeed() {
        if (!LC.config.fix_hideout_speed || !LC.config.fix_hideout_speed.enabled) {
            return;
        }
        ;
        DatabaseServer.tables.hideout.areas.forEach(area => {
            for (let idx in area.stages) {
                if (area.stages[idx].constructionTime > 0) {
                    area.stages[idx].constructionTime /= 100;
                }
            }
        });
        DatabaseServer.tables.hideout.production.forEach(recipe => {
            if (recipe.productionTime > 0) {
                if (LC.config.fix_hideout_speed.exclude_bitcoin_production) {
                    if (recipe._id !== '5d5c205bd582a50d042a3c0e') recipe.productionTime /= 100;
                } else {
                    recipe.productionTime /= 100;
                }
            }
        });
    }

    static fixContainers() {
        if (!LC.config.fix_containers || !LC.config.fix_containers.enabled) {
            return;
        }
        ;
        DatabaseServer.tables.templates.items['59fb042886f7746c5005a7b2']._props.Grids[0]._props.filters[0].Filter.push('5e2af55f86f7746d4159f07c');
        DatabaseServer.tables.templates.items['5c0a840b86f7742ffa4f2482']._props.Grids[0]._props.filters[0].Filter.push('5e2af55f86f7746d4159f07c');
    }

    static fixMeds() {
        if (!LC.config.fix_meds || !LC.config.fix_meds.enabled) {
            return;
        }
        ;
        DatabaseServer.tables.templates.items['544fb37f4bdc2dee738b4567']._props.effects_damage.Pain.duration = 95;
        DatabaseServer.tables.templates.items['590c695186f7741e566b64a2']._props.effects_health.Energy = {"Value": 5};
        DatabaseServer.tables.templates.items['590c695186f7741e566b64a2']._props.effects_health.Hydration = {"Value": -5};
        DatabaseServer.tables.templates.items['590c695186f7741e566b64a2']._props.StimulatorBuffs = "BuffsAugmentin";
        DatabaseServer.tables.globals.config.Health.Effects.Stimulator.Buffs.BuffsAugmentin = JSON.parse('[{"BuffType":"SkillRate","Chance":1,"Delay":1,"Duration":300,"Value":1,"AbsoluteValue":true,"SkillName":"Immunity"}]');
        DatabaseServer.tables.templates.items['544fb3f34bdc2d03748b456a']._props.effects_health.Energy = {"Value": -10};
        DatabaseServer.tables.templates.items['544fb3f34bdc2d03748b456a']._props.effects_health.Hydration = {"Value": -15};
        DatabaseServer.tables.templates.items['5af0548586f7743a532b7e99']._props.effects_health.Hydration = {"Value": -15};
        DatabaseServer.tables.templates.items['5755383e24597772cb798966']._props.MaxHpResource = 6;
        DatabaseServer.tables.templates.items['5755383e24597772cb798966']._props.effects_health.Energy = {"Value": -5};
        DatabaseServer.tables.templates.items['5755383e24597772cb798966']._props.effects_health.Hydration = {"Value": -5};
        DatabaseServer.tables.templates.items['5751a89d24597722aa0e8db0']._props.effects_health.Energy = {"Value": -15};
        DatabaseServer.tables.templates.items['5751a89d24597722aa0e8db0']._props.effects_damage.Pain.duration = 350;
    }

    static fixLocations() {
        if (!LC.config.fix_locations || !LC.config.fix_locations.enabled) {
            return;
        }
        ;
        DatabaseServer.tables.locations.bigmap.base.GlobalLootChanceModifier = 1;
        DatabaseServer.tables.locations.factory4_day.base.GlobalLootChanceModifier = 1;
        DatabaseServer.tables.locations.factory4_night.base.GlobalLootChanceModifier = 1;
        DatabaseServer.tables.locations.interchange.base.GlobalLootChanceModifier = 1;
        DatabaseServer.tables.locations.laboratory.base.GlobalLootChanceModifier = 1;
        DatabaseServer.tables.locations.rezervbase.base.GlobalLootChanceModifier = 1;
        DatabaseServer.tables.locations.shoreline.base.GlobalLootChanceModifier = 1;
        DatabaseServer.tables.locations.woods.base.GlobalLootChanceModifier = 1;
        let fixWaves = function (location) {
            let waves = location.base.waves;
            let limit = parseInt(location.base.escape_time_limit * 60 * 0.75);
            DatabaseServer.tables.locations.bigmap.base.BotStart = 1;
            DatabaseServer.tables.locations.bigmap.base.BotStop = limit;
            for (let idx in waves) {
                let wave = waves[idx];
                wave.time_min = Math.max(wave.time_min - 120, IMMEDIATE_SPAWN);
                wave.time_max = Math.max(wave.time_max - 120, IMMEDIATE_SPAWN);
                if (wave.time_min >= limit) {
                    wave.slots_min = wave.slots_min = 0;
                }
            }
        };
        fixWaves(DatabaseServer.tables.locations.bigmap);
        fixWaves(DatabaseServer.tables.locations.factory4_day);
        fixWaves(DatabaseServer.tables.locations.factory4_night);
        fixWaves(DatabaseServer.tables.locations.interchange);
        fixWaves(DatabaseServer.tables.locations.rezervbase);
        fixWaves(DatabaseServer.tables.locations.shoreline);
        fixWaves(DatabaseServer.tables.locations.woods);
        let fixSlots = function (waves) {
            for (let idx in waves) {
                let wave = waves[idx];
                if (wave.slots_min < 1) wave.slots_min = 1;
                if (wave.slots_max > 3) wave.slots_max = 3;
            }
        };
        fixSlots(DatabaseServer.tables.locations.bigmap.base.waves);
        fixSlots(DatabaseServer.tables.locations.interchange.base.waves);
        fixSlots(DatabaseServer.tables.locations.rezervbase.base.waves);
        fixSlots(DatabaseServer.tables.locations.shoreline.base.waves);
        fixSlots(DatabaseServer.tables.locations.woods.base.waves);
        DatabaseServer.tables.locations.woods.base.exits.push({
            "Name": "Northern UN roadblock",
            "EntryPoints": "House",
            "Chance": 100,
            "MinTime": 0,
            "MaxTime": 0,
            "PlayersCount": 0,
            "ExfiltrationTime": 8,
            "PassageRequirement": "None",
            "ExfiltrationType": "Individual",
            "Id": "",
            "Count": 0,
            "RequirementTip": ""
        });
    }

    static fixBosses() {
        if (!LC.config.fix_bosses || !LC.config.fix_bosses.enabled) {
            return;
        }
        ;
        const locations = DatabaseServer.tables.locations;
        for (let locationIdx in locations) {
            const location = locations[locationIdx];
            if (location.base && location.base.BossLocationSpawn) {
                for (let bossIdx in location.base.BossLocationSpawn) {
                    const boss = location.base.BossLocationSpawn[bossIdx];
                    switch (boss.BossName) {
                        case 'bossSanitar':
                            if (boss.generation && boss.generation.items) {
                                boss.generation.items.healing.min = 2;
                                boss.generation.items.healing.max = 8;
                            }
                        case 'bossBully':
                        case 'bossKilla':
                        case 'bossGluhar':
                        case 'bossKojaniy':
                            if (boss.generation && boss.generation.items) {
                                boss.generation.items.looseLoot.min = LC.config.fix_bosses.loose_loot_min;
                                boss.generation.items.looseLoot.max = LC.config.fix_bosses.loose_loot_max;
                                boss.generation.items.specialItems.min = LC.config.fix_bosses.special_items_min;
                                boss.generation.items.specialItems.max = LC.config.fix_bosses.special_items_max;
                            }
                            boss.Time = IMMEDIATE_SPAWN;
                            break;
                        default:
                    }
                }
            }
        }
    }

    static fixBotGeneration() {
        if (!LC.config.fix_bot_generation || !LC.config.fix_bot_generation.enabled) {
            return;
        }
        ;
        BotConfig.pmc = {
            "isUsec": 50,
            "types": {
                "cursedAssault": 100,
                "assault": 0,
                "pmcBot": 0
            }
        };
        BotController.generate = function (info) {
            let output = [];
            if (info && info.conditions && info.conditions.length > 0 && info.conditions[0].Limit && info.conditions[0].Limit > 1) {
                LC.bot_difficulty_history = [];
            }
            for (const condition of info.conditions) {
                for (let i = 0; i < condition.Limit; i++) {
                    const pmcSide = (RandomUtil.getInt(0, 99) < BotConfig.pmc.isUsec) ? "Usec" : "Bear";
                    const role = condition.Role;
                    const isPmc = (role in BotConfig.pmc.types && RandomUtil.getInt(0, 99) < BotConfig.pmc.types[role]);
                    let bot = JsonUtil.clone(DatabaseServer.tables.bots.base);
                    if (role === 'assault') {
                        bot.Info.Settings.BotDifficulty = condition.Difficulty;
                        LC.bot_difficulty_history.push(condition.Difficulty);
                    } else if (isPmc) {
                        let pmcDifficulty = LC.bot_difficulty_history.length > 0 ?
                            LC.bot_difficulty_history[LC.getRandomInt(0, LC.bot_difficulty_history.length)] : 'hard';
                        bot.Info.Settings.BotDifficulty = pmcDifficulty;
                    }
                    bot.Info.Settings.Role = role;
                    bot.Info.Side = (isPmc) ? pmcSide : "Savage";
                    bot = BotController.generateBot(bot, (isPmc) ? pmcSide.toLowerCase() : role.toLowerCase());
                    output.unshift(bot);
                }
            }
            let result = [];
            let pmc = 0;
            let savage = 0;
            output.filter(bot => bot.Info['Side'] && (bot.Info.Side === 'Bear' || bot.Info.Side === 'Usec'))
                .forEach(bot => {
                    if (bot.Info.Nickname.indexOf(' ') > 0) {
                        bot.Info.Nickname = bot.Info.Nickname.replace(' ', '_');
                    } else {
                        bot.Info.Nickname = '_' + bot.Info.Nickname + '_';
                    }
                    result.push(bot);
                    pmc++;
                });
            output.filter(bot => !bot.Info['Side'] || (bot.Info.Side !== 'Bear' && bot.Info.Side !== 'Usec'))
                .forEach(bot => {
                    result.push(bot);
                    savage++;
                });
            ;
            return result;
        };
        const generateArmbands = function (bot) {
            let armband = {
                _id: HashUtil.generate(),
                parentId: bot.Inventory.equipment,
                slotId: "ArmBand",
            };
            if (bot.Info && bot.Info.Side === 'Usec') armband._tpl = '5b3f3af486f774679e752c1f'
            else armband._tpl = '5b3f3b0e86f7746752107cda';
            bot.Inventory.items.push(armband);
            return bot;
        };
        BotController.generateBot = function (bot, role) {
            const node = DatabaseServer.tables.bots.types[role.toLowerCase()];
            const levelResult = BotController.generateRandomLevel(node.experience.level.min, node.experience.level.max);
            bot.Info.Nickname = `${RandomUtil.getArrayValue(node.firstName)} ${RandomUtil.getArrayValue(node.lastName) || ""}`;
            bot.Info.experience = levelResult.exp;
            bot.Info.Level = levelResult.level;
            bot.Info.Settings.Experience = RandomUtil.getInt(node.experience.reward.min, node.experience.reward.max);
            bot.Info.Voice = RandomUtil.getArrayValue(node.appearance.voice);
            bot.Health = BotController.generateHealth(node.health);
            bot.Skills = BotController.generateSkills(node.skills);
            bot.Customization.Head = RandomUtil.getArrayValue(node.appearance.head);
            bot.Customization.Body = RandomUtil.getArrayValue(node.appearance.body);
            bot.Customization.Feet = RandomUtil.getArrayValue(node.appearance.feet);
            bot.Customization.Hands = RandomUtil.getArrayValue(node.appearance.hands);
            if (role === "usec" || role === "bear") {
                bot.Inventory = BotGenerator.generatePmcInventory(node.inventory, node.chances, node.generation);
                bot = BotController.generateDogtag(bot);
                if (LC.config.fix_bot_generation.faction_armband) generateArmbands(bot);
            } else {
                bot.Inventory = BotGenerator.generateInventory(node.inventory, node.chances, node.generation);
            }
            bot = BotController.generateId(bot);
            bot = InventoryHelper.generateInventoryID(bot);
            return bot;
        };
        ;
        BotGenerator.generatePmcInventory = function (templateInventory, equipChances, generation) {
            let isPistolier = LC.config.fix_bot_generation.pistolier_chance > LC.getRandomInt(0, 100);
            let equipmentChances = JSON.parse(JSON.stringify(equipChances));
            if (isPistolier) {
                equipmentChances.equipment.FirstPrimaryWeapon = 0;
                equipmentChances.equipment.SecondPrimaryWeapon = 0;
                equipmentChances.equipment.Holster = 100;
            }
            BotGenerator.inventory = BotGenerator.generateInventoryBase();
            const excludedSlots = [
                EquipmentSlots.FirstPrimaryWeapon,
                EquipmentSlots.SecondPrimaryWeapon,
                EquipmentSlots.Holster,
                EquipmentSlots.ArmorVest
            ];
            for (const equipmentSlot in templateInventory.equipment) {
                if (excludedSlots.includes(equipmentSlot)) {
                    continue;
                }
                BotGenerator.generateEquipment(equipmentSlot, templateInventory.equipment[equipmentSlot], templateInventory.mods, equipmentChances);
            }
            BotGenerator.generateEquipment(EquipmentSlots.ArmorVest, templateInventory.equipment.ArmorVest, templateInventory.mods, equipmentChances);
            const shouldSpawnPrimary = RandomUtil.getIntEx(100) <= equipmentChances.equipment.FirstPrimaryWeapon;
            const weaponSpawns = [
                {
                    slot: EquipmentSlots.FirstPrimaryWeapon,
                    shouldSpawn: shouldSpawnPrimary
                },
                {
                    slot: EquipmentSlots.SecondPrimaryWeapon,
                    shouldSpawn: shouldSpawnPrimary ? RandomUtil.getIntEx(100) <= equipmentChances.equipment.SecondPrimaryWeapon : false
                },
                {
                    slot: EquipmentSlots.Holster,
                    shouldSpawn: shouldSpawnPrimary ? RandomUtil.getIntEx(100) <= equipmentChances.equipment.Holster : true
                }
            ];
            for (const weaponSpawn of weaponSpawns) {
                if (weaponSpawn.shouldSpawn && templateInventory.equipment[weaponSpawn.slot].length) {
                    BotGenerator.generateWeapon(
                        weaponSpawn.slot,
                        templateInventory.equipment[weaponSpawn.slot],
                        templateInventory.mods,
                        equipmentChances.mods,
                        generation.items.magazines);
                }
            }
            BotGenerator.generatePmcLoot(templateInventory.items, generation.items);
            return JsonUtil.clone(BotGenerator.inventory);
        };
        const EquipmentSlots = {
            Headwear: "Headwear",
            Earpiece: "Earpiece",
            FaceCover: "FaceCover",
            ArmorVest: "ArmorVest",
            Eyewear: "Eyewear",
            ArmBand: "ArmBand",
            TacticalVest: "TacticalVest",
            Pockets: "Pockets",
            Backpack: "Backpack",
            SecuredContainer: "SecuredContainer",
            FirstPrimaryWeapon: "FirstPrimaryWeapon",
            SecondPrimaryWeapon: "SecondPrimaryWeapon",
            Holster: "Holster",
            Scabbard: "Scabbard"
        };
        BotGenerator.generatePmcLoot = function (lootPool, itemCounts) {
            let lootTemplates = [];
            let specialLootTemplates = [];
            for (const [slot, pool] of Object.entries(lootPool)) {
                if (!pool || !pool.length) {
                    continue;
                }
                if (slot === "SpecialLoot") {
                    const poolSpecialItems = pool.map(lootTpl => DatabaseServer.tables.templates.items[lootTpl]);
                    specialLootTemplates.push(...poolSpecialItems.filter(x => !!x));
                } else {
                    const poolItems = pool.map(lootTpl => DatabaseServer.tables.templates.items[lootTpl]);
                    lootTemplates.push(...poolItems.filter(x => !!x));
                }
            }
            lootTemplates.sort((a, b) => BotGenerator.compareByValue(a, b));
            specialLootTemplates.sort((a, b) => BotGenerator.compareByValue(a, b));
            const specialLootItems = specialLootTemplates.filter(template =>
                !("ammoType" in template._props)
                && !("ReloadMagType" in template._props));
            const healingMeds = [
                "590c661e86f7741e566b646a",
                "590c678286f77426c9660122",
                "60098ad7c2240c0fe85c570a",
                "544fb45d4bdc2dee738b4568"
            ];
            const hemostats = [
                "5e8488fa988a8701445df1e4"
            ];
            const fractureMeds = [
                "5af0454c86f7746bf20992e8"
            ];
            const painMeds = [
                "544fb37f4bdc2dee738b4567",
                "5755383e24597772cb798966",
                "5c0e530286f7747fa1419862"
            ];
            const healingItems = lootTemplates.filter(template => healingMeds.includes(template._id));
            const hemostatItems = lootTemplates.filter(template => hemostats.includes(template._id));
            const fractureItems = lootTemplates.filter(template => fractureMeds.includes(template._id));
            const painItems = lootTemplates.filter(template => painMeds.includes(template._id));
            const grenadeItems = lootTemplates.filter(template => "ThrowType" in template._props);
            const lootItems = lootTemplates.filter(template =>
                !("ammoType" in template._props)
                && !("ReloadMagType" in template._props)
                && !("medUseTime" in template._props)
                && !("ThrowType" in template._props));
            let range = itemCounts.healing.max - itemCounts.healing.min;
            const healingItemCount = BotGenerator.getBiasedRandomNumber(itemCounts.healing.min, itemCounts.healing.max, range, 3);
            range = itemCounts.looseLoot.max - itemCounts.looseLoot.min;
            const lootItemCount = BotGenerator.getBiasedRandomNumber(itemCounts.looseLoot.min, itemCounts.looseLoot.max, range, 5);
            range = itemCounts.specialItems.max - itemCounts.specialItems.min;
            const specialLootItemCount = BotGenerator.getBiasedRandomNumber(itemCounts.specialItems.min, itemCounts.specialItems.max, range, 6);
            range = itemCounts.grenades.max - itemCounts.grenades.min;
            const grenadeCount = BotGenerator.getBiasedRandomNumber(itemCounts.grenades.min, itemCounts.grenades.max, range, 4);
            BotGenerator.addLootFromPool(specialLootItems, [EquipmentSlots.Pockets, EquipmentSlots.Backpack, EquipmentSlots.TacticalVest], specialLootItemCount);
            BotGenerator.addLootFromPool(lootItems, [EquipmentSlots.Backpack, EquipmentSlots.Pockets, EquipmentSlots.TacticalVest], lootItemCount);
            BotGenerator.addLootFromPool(healingItems, [EquipmentSlots.TacticalVest, EquipmentSlots.Pockets, EquipmentSlots.Backpack, EquipmentSlots.SecuredContainer], healingItemCount);
            BotGenerator.addLootFromPool(hemostatItems, [EquipmentSlots.TacticalVest, EquipmentSlots.Pockets, EquipmentSlots.Backpack, EquipmentSlots.SecuredContainer], 1);
            BotGenerator.addLootFromPool(fractureItems, [EquipmentSlots.TacticalVest, EquipmentSlots.Pockets, EquipmentSlots.Backpack, EquipmentSlots.SecuredContainer], 1);
            BotGenerator.addLootFromPool(painItems, [EquipmentSlots.TacticalVest, EquipmentSlots.Pockets, EquipmentSlots.Backpack, EquipmentSlots.SecuredContainer], 1);
            BotGenerator.addLootFromPool(grenadeItems, [EquipmentSlots.TacticalVest, EquipmentSlots.Pockets], grenadeCount);
        };
        BotGenerator.getBiasedRandomNumber = function (min, max, shift, n) {
            if (max < min) {
                console.error(`Bounded random number generation max is smaller than min (${max} < ${min})`);
                console.trace();
                return min;
            }
            if (n < 1) {
                console.error(`'n' must be 1 or greater (received ${n})`);
                console.trace();
                return 1;
            }
            if (min === max) {
                return min;
            }
            if (shift > (max - min)) {
                /* If a rolled number is out of bounds (due to bias being applied), we simply roll it again.
* As the shifting increases, the chance of rolling a number within bounds decreases.
* A shift that is equal to the available range only has a 50% chance of rolling correctly, theoretically halving performance.
* Shifting even further drops the success chance very rapidly - so we want to warn against that */
                Logger.warning("Bias shift for random number generation is greater than the range of available numbers.\nThis can have a very severe performance impact!");
                Logger.info(`min -> ${min}; max -> ${max}; shift -> ${shift}`);
            }
            const gaussianRandom = (n) => {
                let rand = 0;
                for (let i = 0; i < n; i += 1) {
                    rand += Math.random();
                }
                return (rand / n);
            };
            const boundedGaussian = (start, end, n) => {
                return Math.round(start + gaussianRandom(n) * (end - start + 1));
            };
            const biasedMin = shift >= 0 ? min - shift : min;
            const biasedMax = shift < 0 ? max + shift : max;
            let num;
            do {
                num = boundedGaussian(biasedMin, biasedMax, n);
            }
            while (num < min || num > max);
            return num;
        };
    }

    static fixLocales() {
        if (!LC.config.fix_locales || !LC.config.fix_locales.enabled) {
            return;
        }
        ;
        let templates = DatabaseServer.tables.locales.global.en.templates;
        templates['599860e986f7743bb57573a6'].Name = 'Izhmash rear sight for PP-19-01';
        templates['57cffd8224597763b03fc609'].Name = 'Magpul MOE AKM HAND GUARD (Olive Drab) for AK';
        templates['5c78f2792e221600106f4683'].Name = 'Magpul MOE SL carbine length M-LOK foregrip for AR15';
        templates['57486e672459770abd687134'].Name = 'OKP-7 reflex sight (Dovetail)';
        templates['5aaa5dfee5b5b000140293d3'].Name = 'PMAG GEN M3 30 5.56x45 STANAG 30-round magazine FDE';
        templates['55d48a634bdc2d8b2f8b456a'].Name = 'Kiba Arms International SPRM mount for pump-action shotguns';
        templates['587e02ff24597743df3deaeb'].Name = 'Simonov Semi-Automatic Carbine SKS 7.62x39 Hunting Rifle Version';
        templates['59d6272486f77466146386ff'].Name = 'Pmag 30 AK/AKM GEN M3 7.62x39 magazine for AK and compatibles, 30-round capacity';
        templates['59e649f986f77411d949b246'].Name = 'Molot AKM type gas tube';
        templates['5aaa4194e5b5b055d06310a5'].Name = 'Pmag 30 AK74 GEN M3 5.45x39 magazine for AK and compatibles, 30-round capacity';
        templates['5e21a3c67e40bd02257a008a'].Name = 'Pmag 30 AK/AKM GEN M3 7.62x39 magazine for AK and compatibles, 30-round capacity (banana)';
        templates['5ba26586d4351e44f824b340'].Name = 'Standard MP7 40-round 4.6x30 magazine';
        templates['5addbfe15acfc4001a5fc58b'].Name = 'Arms #18 mount for M14';
        templates['55d44fd14bdc2d962f8b456e'].Name = 'Colt AR-15 charging handle for AR-15';
        templates['55d4af3a4bdc2d972f8b456f'].Name = 'UTG Low Profile A2 Frontsight AR-15';
        templates['5aafa49ae5b5b00015042a58'].Name = 'SA XS Post .125 blade Frontsight M1A';
        templates['5addba3e5acfc4001669f0ab'].Name = 'SA National Match .062 blade Frontsight M1A';
        templates['5b099b7d5acfc400186331e4'].Name = 'DS Arms \"3 prong trident\" 7.62x51 Flash hider for SA-58';
        templates['5b7d68af5acfc400170e30c3'].Name = 'DS Arms \"Austrian Style\" 7.62x51 muzzle brake for SA-58';
        templates['5bc09a18d4351e003562b68e'].Name = 'Magpul MBUS Gen.2 Rearsight';
        templates['5bc09a30d4351e00367fb7c8'].Name = 'Magpul MBUS Gen.2 Frontsight';
        templates['5c18b90d2e2216152142466b'].Name = 'Magpul MBUS Gen.2 Frontsight FDE';
        templates['5c18b9192e2216398b5a8104'].Name = 'Magpul MBUS Gen.2 Rearsight FDE';
        templates['5ae30bad5acfc400185c2dc4'].Name = 'Rearsight AR-15 Carry Handle';
        templates['5e71f6be86f77429f2683c44'].Name = 'Twitch Rivals 2020 mask';
        templates['5f60cd6cf2bcbb675b00dac6'].Name = 'Walker\'s XCEL 500BT Digital headset';
    }

    static fixQuests() {
        if (!LC.config.fix_quests || !LC.config.fix_quests.enabled) {
            return;
        }
        ;
        const instantComplete = '[{"_parent":"HandoverItem","_props":{"target":["5449016a4bdc2d6f028b456f"],"value":"1","minDurability":0,"index":0,"parentId":"","id":"instant_complete","maxDurability":0,"dogtagLevel":0}}]';
        const quests = DatabaseServer.tables.templates.quests;
        for (let qid in quests) {
            try {
                const cond = quests[qid].conditions.AvailableForFinish;
                for (let i in cond) {
                    try {
                        const conds = cond[i]._props.counter.conditions;
                        for (let j in conds) {
                            delete conds[j]._props.daytime;
                        }
                    } catch (ignored) {
                    }
                }
            } catch (ignored) {
            }
        }
        quests["5d2495a886f77425cd51e403"].conditions.AvailableForStart = JSON.parse('[{"_parent":"Level","_props":{"compareMethod":">=","value":"2","index":0,"parentId":"","id":"jaeger_introduction"}}]');
        DatabaseServer.tables.locales.global.en.mail['5abe61a786f7746ad512da5d'] = 'This task is prone to be broken. Just finish it instantly.';
        quests["5979f8bb86f7743ec214c7a6"].conditions.AvailableForFinish = JSON.parse(instantComplete);
        quests["5bc4776586f774512d07cf05"].conditions.AvailableForFinish[0]._props.counter.conditions[0]._props.weapon.push("5de652c31b7e3716273428be");
        quests["5bc479e586f7747f376c7da3"].conditions.AvailableForFinish[0]._props.counter.conditions[0]._props.weapon.push("5de652c31b7e3716273428be");
        quests["5bc479e586f7747f376c7da3"].conditions.AvailableForFinish[1]._props.counter.conditions[0]._props.weapon.push("5de652c31b7e3716273428be");
        quests["5bc47dbf86f7741ee74e93b9"].conditions.AvailableForFinish[0]._props.counter.conditions[0]._props.weapon.push("5de652c31b7e3716273428be");
        quests["5bc4826c86f774106d22d88b"].conditions.AvailableForFinish[0]._props.counter.conditions[0]._props.weapon.push("5de652c31b7e3716273428be");
        quests["5bc4836986f7740c0152911c"].conditions.AvailableForFinish[0]._props.counter.conditions[0]._props.weapon.push("5de652c31b7e3716273428be");
        quests["5bc4856986f77454c317bea7"].conditions.AvailableForFinish[0]._props.counter.conditions[0]._props.weapon.push("5de652c31b7e3716273428be");
        quests["5bc4856986f77454c317bea7"].conditions.AvailableForFinish[0]._props.counter.conditions[0]._props.weaponModsInclusive.push(["5a9fbb74a2750c0032157181"]);
        quests["5bc4893c86f774626f5ebf3e"].conditions.AvailableForFinish[0]._props.counter.conditions[1]._props.weapon.push("5de652c31b7e3716273428be");
        quests["5b478b1886f7744d1b23c57d"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"LeaveItemAtLocation","_props":{"target":["5645bcc04bdc2d363b8b4572"],"zoneId":"place_merch_020_1","value":"2","minDurability":0,"maxDurability":0,"dogtagLevel":0,"plantTime":30,"index":0,"parentId":"","id":"5b478c4c86f7744d1a393fac"}},{"_parent":"LeaveItemAtLocation","_props":{"target":["5a7c4850e899ef00150be885"],"zoneId":"place_merch_020_1","value":"2","minDurability":0,"maxDurability":0,"dogtagLevel":0,"plantTime":30,"index":1,"parentId":"","id":"5b478c7386f7744d1a393fb1"}},{"_parent":"LeaveItemAtLocation","_props":{"target":["5ab8e79e86f7742d8b372e78"],"zoneId":"place_merch_020_2","value":"2","minDurability":0,"maxDurability":0,"dogtagLevel":0,"plantTime":30,"index":2,"parentId":"","id":"5b478cb586f7744d1a393fb5"}}]');
        DatabaseServer.tables.locales.global.en.mail['5ac242f286f774138762ee03'] = 'Yes, I am the Mechanic. I have a lot of work to do. Get to the point, did you want to help? It’s a shame there’s so little time and the programmer unit for PLC100 is out of order. And those orders to boot. Whatever, why am I even telling you this? I need you to assemble an MP-133, I won’t have time for it, and some parts are missing too. This gun should have more than 47 ergonomics, a laser designator, an extended mag, and less than 950 recoil sum. And compact, too, not more than 4 cells. Then we\'ll talk.';
        quests["5ac23c6186f7741247042bad"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"WeaponAssembly","_props":{"target":["54491c4f4bdc2db1078b4568"],"value":"1","durability":{"value":60,"compareMethod":">="},"ergonomics":{"value":47,"compareMethod":">="},"baseAccuracy":{"value":0,"compareMethod":">="},"recoil":{"value":950,"compareMethod":"<="},"muzzleVelocity":{"value":0,"compareMethod":">="},"weight":{"value":0,"compareMethod":">="},"magazineCapacity":{"value":6,"compareMethod":">="},"width":{"value":4,"compareMethod":"<="},"height":{"value":1,"compareMethod":"<="},"effectiveDistance":{"value":0,"compareMethod":">="},"emptyTacticalSlot":{"value":0,"compareMethod":">="},"hasItemFromCategory":["55818b164bdc2ddc698b456c"],"index":0,"parentId":"","id":"5accd5e386f77463027e9397","containsItems":[]}}]');
        DatabaseServer.tables.locales.global.en.mail['5ac2430486f77412450b42c4'] = 'You have not failed with the shotgun, so you may know your way around tools. That didn’t save me much time though. All exchanges are on fire, hope it won’t start the panic. Nevertheless, the plan remains the same, I think it\'s not for long. Okay, I need to work. And you, try to get hold of AKSU. With B-11 handguard, 60-round extended mag, and compact, 6 cells max. Ergonomics over 58, recoil sum less than 600, sighting range 100 or more. And, of course, as light as possible, 3.5 kg or less. Yes, indexes here have nothing to do with that. I hope you\'ve remembered everything. See you soon.';
        quests["5ac2426c86f774138762edfe"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"WeaponAssembly","_props":{"target":["57dc2fa62459775949412633"],"value":"1","durability":{"value":60,"compareMethod":">="},"ergonomics":{"value":58,"compareMethod":">="},"baseAccuracy":{"value":0,"compareMethod":">="},"recoil":{"value":600,"compareMethod":"<="},"muzzleVelocity":{"value":0,"compareMethod":">="},"weight":{"value":3.5,"compareMethod":"<="},"magazineCapacity":{"value":60,"compareMethod":">="},"width":{"value":6,"compareMethod":"<="},"height":{"value":2,"compareMethod":"<="},"effectiveDistance":{"value":100,"compareMethod":">="},"emptyTacticalSlot":{"value":0,"compareMethod":">="},"hasItemFromCategory":[],"index":0,"parentId":"","id":"5accd9b686f774112d7173d1","containsItems":["57ffa9f4245977728561e844"]}}]');
        DatabaseServer.tables.locales.global.en.mail['5ac2437986f774124836841e'] = 'When I was a child, people used to say that it is not a destination that matters, but a journey itself. But what if the destination is yourself, what do you know, how you use your reflexes and how many rounds you have in the magazine? This feels particularly true when you\'re supposed to survive, clinging to this world with your teeth. I need an MP5. With 50-round extended mag, silencer, tactical flashlight and sighting range of more than 200. Ergonomics above 53, recoil sum less than 200. Maximum weight of 3.8 kg. And decide for yourself what is more important to you, the journey or the destination.';
        quests["5ac2428686f77412450b42bf"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"WeaponAssembly","_props":{"target":["5926bb2186f7744b1c6c6e60"],"value":"1","durability":{"value":60,"compareMethod":">="},"ergonomics":{"value":53,"compareMethod":">="},"baseAccuracy":{"value":0,"compareMethod":">="},"recoil":{"value":200,"compareMethod":"<="},"muzzleVelocity":{"value":0,"compareMethod":">="},"weight":{"value":3.8,"compareMethod":"<="},"magazineCapacity":{"value":50,"compareMethod":">="},"width":{"value":0,"compareMethod":">="},"height":{"value":0,"compareMethod":">="},"effectiveDistance":{"value":200,"compareMethod":">="},"emptyTacticalSlot":{"value":0,"compareMethod":">="},"hasItemFromCategory":["550aa4cd4bdc2dd8348b456c","55818b164bdc2ddc698b456c"],"index":0,"parentId":"","id":"5accde3686f7740cea1b7ec2","containsItems":[]}}]');
        DatabaseServer.tables.locales.global.en.mail['5ac244f386f7741356335af6'] = 'Sometimes I think it\'s good that I got stuck here in Tarkov. The whole world feels like it’s descending into an abyss, a gaping, cold abyss. Everything has lost its meaning. People, their values, their thoughts, and their goals. They don\'t know anymore why they should take joy, work, have children. Everyone is tired from the illusion of choice they were offered all this time, from having to work and buy either blue or red cigarettes. It’s happening everywhere, in every corner of the world. And here in Tarkov, we are honest with ourselves. We see it all in an already exaggerated way, without false values, when you don\'t just decide what laundry detergent is better at removing stains, but how to keep warm at night and where to find ammo for the next lowlife who wants to kill you. Only then, in such an honest society, people show their true selves. What do you think? Okay, thanks for hearing me out. Some folks requested a fully packed M4. They need a silencer, 60-round extended mag, ergonomics above 57, and recoil sum less than 300. And mind the weight, no more than 3.8 kg, with a sighting range of 800 or beyond.';
        quests["5ac244eb86f7741356335af1"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"WeaponAssembly","_props":{"target":["5447a9cd4bdc2dbd208b4567"],"value":"1","durability":{"value":60,"compareMethod":">="},"ergonomics":{"value":57,"compareMethod":">="},"baseAccuracy":{"value":0,"compareMethod":">="},"recoil":{"value":300,"compareMethod":"<="},"muzzleVelocity":{"value":0,"compareMethod":">="},"weight":{"value":3.8,"compareMethod":"<="},"magazineCapacity":{"value":60,"compareMethod":">="},"width":{"value":0,"compareMethod":">="},"height":{"value":0,"compareMethod":">="},"effectiveDistance":{"value":800,"compareMethod":">="},"emptyTacticalSlot":{"value":0,"compareMethod":">="},"hasItemFromCategory":["550aa4cd4bdc2dd8348b456c"],"index":0,"parentId":"","id":"5accdfdb86f77412265cbfc9","containsItems":[]}}]');
        DatabaseServer.tables.locales.global.en.mail['5ac2438186f77412450b42c8'] = 'I’ve said too much last time. It happens when I’m alone with my thoughts for a while. A lot of stuff slips through the head while I sit here calibrating the sights. That M4 turned out splendid, got taken off my hands in a moment. A bear dropped by recently, goes by the name of Sniper or something. He needs a sniper rifle Lobaev Saboteur, with a scope and multi-laser device. With recoil sum less than 400, ergonomics above 23, and weight below 6.6 kg. He said it needs to be a 2000m shot. The guy is serious, so do your best to make a solid build.';
        quests["5ac242ab86f77412464f68b4"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"WeaponAssembly","_props":{"target":["588892092459774ac91d4b11"],"value":"1","durability":{"value":60,"compareMethod":">="},"ergonomics":{"value":23,"compareMethod":">="},"baseAccuracy":{"value":0,"compareMethod":">="},"recoil":{"value":400,"compareMethod":"<="},"muzzleVelocity":{"value":0,"compareMethod":">="},"weight":{"value":6.6,"compareMethod":"<="},"magazineCapacity":{"value":0,"compareMethod":">="},"width":{"value":0,"compareMethod":">="},"height":{"value":0,"compareMethod":">="},"effectiveDistance":{"value":2000,"compareMethod":">="},"emptyTacticalSlot":{"value":0,"compareMethod":">="},"hasItemFromCategory":["55818b164bdc2ddc698b456c"],"index":0,"parentId":"","id":"5acce08b86f7745f8521fa64","containsItems":[]}}]');
        DatabaseServer.tables.locales.global.en.mail['5ac244ce86f7741356335af0'] = 'Are you good at hiding? Not good enough, I guess, for Sniper not to find you. I kinda feel for the guy, what’s his name, Brendan I think. Interesting, all our heroes of the past that caused such admiration, where have they all gone?\\nWhy everybody turned out to be so empty. Why now, with this chaos around, such folks as Sniper became heroes for us? Why we’ve been ignoring such war dogs, and now we’re looking for their friendship? What do you think? I have another order, for R11 RSASS. With a sighting range of 1500 or above. Weight 6.5 kg or less. Also needs a silencer, ergonomics more than 28 and recoil sum less than 350.';
        quests["5ac244c486f77413e12cf945"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"WeaponAssembly","_props":{"target":["5a367e5dc4a282000e49738f"],"value":"1","durability":{"value":60,"compareMethod":">="},"ergonomics":{"value":28,"compareMethod":">="},"baseAccuracy":{"value":0,"compareMethod":">="},"recoil":{"value":350,"compareMethod":"<="},"muzzleVelocity":{"value":0,"compareMethod":">="},"weight":{"value":6.5,"compareMethod":"<="},"magazineCapacity":{"value":0,"compareMethod":">="},"width":{"value":0,"compareMethod":">="},"height":{"value":0,"compareMethod":">="},"effectiveDistance":{"value":1500,"compareMethod":">="},"emptyTacticalSlot":{"value":0,"compareMethod":">="},"hasItemFromCategory":["550aa4cd4bdc2dd8348b456c"],"index":0,"parentId":"","id":"5acce11786f77411ed6fa6eb","containsItems":[]}}]');
        DatabaseServer.tables.locales.global.en.mail['5ae326bc86f7742a41359305'] = 'Just when I finally sorted out the stable Internet connection and power supply for it, the Government stepped up the game and started blocking block half of IP addresses that handled most of the data flow in Tarkov. All that because TerraGroup allegedly uses \\"Ebambium\\" ISP to further destabilize the situation in the city and wreak chaos. Sounds like that cultist gibberish about coming to Ragnarok, don\'t you think? By the way about them and the weapons — one of them, with a tattoo of lightning on the face, asked for Remington 870 shotgun. Upgraded with a tactical device, Magpul handguard, and tactical foregrip. Ergonomics above 58  and recoil sum less than 550.';
        quests["5ae3267986f7742a413592fe"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"WeaponAssembly","_props":{"target":["5a7828548dc32e5a9c28b516"],"value":"1","durability":{"value":60,"compareMethod":">="},"ergonomics":{"value":58,"compareMethod":">="},"baseAccuracy":{"value":0,"compareMethod":">="},"recoil":{"value":550,"compareMethod":"<="},"muzzleVelocity":{"value":0,"compareMethod":">="},"weight":{"value":0,"compareMethod":">="},"magazineCapacity":{"value":0,"compareMethod":">="},"width":{"value":0,"compareMethod":">="},"height":{"value":0,"compareMethod":">="},"effectiveDistance":{"value":0,"compareMethod":">="},"emptyTacticalSlot":{"value":0,"compareMethod":">="},"hasItemFromCategory":["55818b164bdc2ddc698b456c","55818af64bdc2d5b648b4570"],"containsItems":["5a788068c5856700137e4c8f"],"index":0,"parentId":"","id":"5ae34b8b86f7741e5b1e5d48"}}]');
        DatabaseServer.tables.locales.global.en.mail['5ae3272086f77444fd36f5e6'] = 'How do you think, is all the suffering that befell the inhabitants of our city the result of the actions of the society, or a controlled process, and this is just the beginning? All the time, after the guy with lightning, I think about this. Although I decided for myself that even if it’s someone\'s invisible hand, our society has deserved it. We have, by our actions, by buying sneakers or even beet salad, supported those who build laboratories and businesses, and then uses them to plunge us into the abyss. Okay, I’m rambling again, back to business. Get me an AKM with a Fortis Shift grip, a silencer, and a 30-round Magpul mag. Ergonomics over 50, recoil sum less than 350, sighting range of 800 meters or more.';
        quests["5ae3270f86f77445ba41d4dd"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"WeaponAssembly","_props":{"target":["59d6088586f774275f37482f"],"value":"1","durability":{"value":60,"compareMethod":">="},"ergonomics":{"value":50,"compareMethod":">="},"baseAccuracy":{"value":0,"compareMethod":">="},"recoil":{"value":350,"compareMethod":"<="},"muzzleVelocity":{"value":0,"compareMethod":">="},"weight":{"value":0,"compareMethod":">="},"magazineCapacity":{"value":30,"compareMethod":">="},"width":{"value":0,"compareMethod":">="},"height":{"value":0,"compareMethod":">="},"effectiveDistance":{"value":800,"compareMethod":">="},"emptyTacticalSlot":{"value":0,"compareMethod":">="},"hasItemFromCategory":["550aa4cd4bdc2dd8348b456c"],"containsItems":["59f8a37386f7747af3328f06","59d6272486f77466146386ff"],"index":0,"parentId":"","id":"5ae3550b86f7741cf44fc799"}}]');
        DatabaseServer.tables.locales.global.en.mail['5ae3277d86f7745b4246b391'] = 'I have two neural networks, one recognizes the faces in the cameras and compares with the database, and the other one monitors cryptocurrency trading and reacts to it. Today I’ve decided to create one more, which will monitor the temperature, humidity, pressure, and other parameters of my hideout, and among other things — respond to my mood. Let\'s see how it turns out when I’m done. There is an order for AKS-74N with Zenit parts. Ergonomics should be over 55, recoil sum less than 500, and taking up no more than 8 cells. And most importantly, with grip, PT-3 stock, dust cover, and muzzle brake by Zenit, Zenit all around. Perhaps, a gift for former Saint-Petersburg citizen.';
        quests["5ae3277186f7745973054106"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"WeaponAssembly","_props":{"target":["5ab8e9fcd8ce870019439434"],"value":"1","durability":{"value":60,"compareMethod":">="},"ergonomics":{"value":55,"compareMethod":">="},"baseAccuracy":{"value":0,"compareMethod":">="},"recoil":{"value":500,"compareMethod":"<="},"muzzleVelocity":{"value":0,"compareMethod":">="},"weight":{"value":0,"compareMethod":">="},"magazineCapacity":{"value":0,"compareMethod":">="},"width":{"value":4,"compareMethod":">="},"height":{"value":2,"compareMethod":">="},"effectiveDistance":{"value":0,"compareMethod":">="},"emptyTacticalSlot":{"value":0,"compareMethod":">="},"hasItemFromCategory":[],"containsItems":["5649ab884bdc2ded0b8b457f","5649af884bdc2d1b2b8b4589","5649ae4a4bdc2d1b2b8b4588","59ecc3dd86f7746dc827481c"],"index":0,"parentId":"","id":"5ae3570b86f7746efa6b4494"}}]');
        DatabaseServer.tables.locales.global.en.mail['5ae327d286f7745d3a7704be'] = 'I called her Lusya, the neural network, I mean. So, when I keep silent, it does well and even reminds me to get some sleep when necessary, but as soon as I start talking to myself, it attempts to distract me, putting on music or something like that. However, I trained it with the movies and phrases from them, apparently, such a reaction is presented to us in the movies as the most appropriate, but not for me. I\'ll have to think about what stimuli are the best to mimic real people, rather than society and its stereotypes. But I digress, assemble an AK-105 now, with silencer and 60-round mag. As for parameters: sighting range over 800, ergonomics above 54, recoil sum less than 550, weight 4.8kg or less. And compact, as always, 8 cells or so.';
        quests["5ae327c886f7745c7b3f2f3f"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"WeaponAssembly","_props":{"target":["5ac66d9b5acfc4001633997a"],"value":"1","durability":{"value":60,"compareMethod":">="},"ergonomics":{"value":54,"compareMethod":">="},"baseAccuracy":{"value":0,"compareMethod":">="},"recoil":{"value":550,"compareMethod":"<="},"muzzleVelocity":{"value":0,"compareMethod":">="},"weight":{"value":4.8,"compareMethod":"<="},"magazineCapacity":{"value":60,"compareMethod":">="},"width":{"value":4,"compareMethod":">="},"height":{"value":2,"compareMethod":">="},"effectiveDistance":{"value":800,"compareMethod":">="},"emptyTacticalSlot":{"value":0,"compareMethod":">="},"hasItemFromCategory":["550aa4cd4bdc2dd8348b456c"],"containsItems":[],"index":0,"parentId":"","id":"5ae445f386f7744e87761331"}}]');
        DatabaseServer.tables.locales.global.en.mail['5ae3280a86f77444fc552709'] = 'While I was busy with the network, I started to wonder how are we different from it, and when we can replace our short-lived brains with this kind of systems. What do you think, will this time come someday? I think it will, very soon, we already don\'t know what processes occur inside neural networks, there is only an entry signal and the result of its actions, and how it has learned with its own internal rules, wiring up its own neural links inside itself. How is it different from us? Would you like to live in a world where only your mind and your imagination limit your actions? The truth is, I think, living in such a world can be no better than in our own, if there is no goal, and where can goal come from if you\'re immortal and omnipotent... This time we need an AS VAL. GL Shock stock, ANPEQ-15 tactical device, night scope NSPU-M, and a 30-round magazine. Ergonomics above 34 and recoil sum less than 250.';
        quests["5ae3280386f7742a41359364"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"WeaponAssembly","_props":{"target":["57c44b372459772d2b39b8ce"],"value":"1","durability":{"value":60,"compareMethod":">="},"ergonomics":{"value":34,"compareMethod":">="},"baseAccuracy":{"value":0,"compareMethod":">="},"recoil":{"value":250,"compareMethod":"<="},"muzzleVelocity":{"value":0,"compareMethod":">="},"weight":{"value":0,"compareMethod":">="},"magazineCapacity":{"value":30,"compareMethod":">="},"width":{"value":0,"compareMethod":">="},"height":{"value":0,"compareMethod":">="},"effectiveDistance":{"value":0,"compareMethod":">="},"emptyTacticalSlot":{"value":0,"compareMethod":">="},"hasItemFromCategory":[],"containsItems":["5a9eb32da2750c00171b3f9c","544909bb4bdc2d6f028b4577","5a7c74b3e899ef0014332c29"],"index":0,"parentId":"","id":"5ae4479686f7744f6c79b7b3"}}]');
        DatabaseServer.tables.locales.global.en.mail['5b486c9386f7744a08514b1b'] = 'Quite long ago, I once met the owner of Kiba Arms, we even went to banya then, though I’m not particularly into it. He, however, even broke his leg trying to jump-dive from the pier. Jolly fellow dreamt of setting up an Airsoft grounds all the time. It seems his wish came true in Tarkov, the largest and best-fighting grounds in the world, with an only minor difference: here, you die and lose everything from a single stray bullet. Put together an AK-102, with Rotor 43 silencer, Magpul AFG OD tactical grip, and Zenit 2U flashlight. Ergonomics should be over 53, recoil sum less than 500, sighting range 500 or more. Make sure it doesn’t take up more than 8 cells.';
        quests["5b47749f86f7746c5d6a5fd4"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"WeaponAssembly","_props":{"target":["5ac66d015acfc400180ae6e4"],"value":"1","durability":{"value":60,"compareMethod":">="},"ergonomics":{"value":53,"compareMethod":">="},"baseAccuracy":{"value":0,"compareMethod":">="},"recoil":{"value":500,"compareMethod":"<="},"muzzleVelocity":{"value":0,"compareMethod":">="},"weight":{"value":0,"compareMethod":">="},"magazineCapacity":{"value":0,"compareMethod":">="},"width":{"value":4,"compareMethod":"<="},"height":{"value":2,"compareMethod":"<="},"effectiveDistance":{"value":500,"compareMethod":">="},"emptyTacticalSlot":{"value":0,"compareMethod":">="},"hasItemFromCategory":[],"containsItems":["5b3a337e5acfc4704b4a19a0","588226ef24597767af46e39c","5a9fbb84a2750c00137fa685"],"index":0,"parentId":"","id":"5b47796686f774374f4a8bb1"}}]');
        DatabaseServer.tables.locales.global.en.mail['5b486ce586f7744882493788'] = 'Time is running out, some guy stopped by who wants to sort it out with the Dealmaker, who is operating somewhere around dorms together with folks from the factory. Assemble him some MPX, with Skeletonized AR-15 pistol grip, Annihilator flash hider, and Steiner LAS/TAC 2 tactical flashlight. Aim for a sighting range of 300 or more, ergonomics above 55, weight less than  4 kg, the less than 250 recoil sum. Just don\'t tell anyone about why do you need this, the Dealmaker won’t be too happy to hear about it, and his guys are quite a mean bunch, all served their duty before working at the factory.';
        quests["5b47799d86f7746c5d6a5fd8"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"WeaponAssembly","_props":{"target":["58948c8e86f77409493f7266"],"value":"1","durability":{"value":60,"compareMethod":">="},"ergonomics":{"value":55,"compareMethod":">="},"baseAccuracy":{"value":0,"compareMethod":">="},"recoil":{"value":250,"compareMethod":"<="},"muzzleVelocity":{"value":0,"compareMethod":">="},"weight":{"value":4,"compareMethod":"<="},"magazineCapacity":{"value":0,"compareMethod":">="},"width":{"value":0,"compareMethod":">="},"height":{"value":0,"compareMethod":">="},"effectiveDistance":{"value":300,"compareMethod":">="},"emptyTacticalSlot":{"value":0,"compareMethod":">="},"hasItemFromCategory":[],"containsItems":["5b07db875acfc40dc528a5f6","5b3a16655acfc40016387a2a","5b07dd285acfc4001754240d"],"index":0,"parentId":"","id":"5b477b3b86f77401da02e6c4"}}]');
        DatabaseServer.tables.locales.global.en.mail['5b486d0e86f7744f4b12d792'] = 'I want to try teaching Lusya to tell truth from lies, if the result will be at least 90% accurate, it will be interesting to listen to all those politicians and Terra Group whales, who’s been expatiating upon their ideals and noble goals just yesterday, assured of the benefits of our economic zone and a bright future ahead. How much of this was concentrated lie? I think, all of it. There’s a request for MOE edition AKMN. I.e. the handguard, stock, and pistol grip have to be MOE. All in black. Additionally, Rotor 43 muzzle brake and Magpul M-LOK AFG Tactical grip, recoil sum lower than 350, ergonomics above 50 and weight of 5 kg or less with sighting range 500.';
        quests["5b477b6f86f7747290681823"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"WeaponAssembly","_props":{"target":["5a0ec13bfcdbcb00165aa685"],"value":"1","durability":{"value":60,"compareMethod":">="},"ergonomics":{"value":50,"compareMethod":">="},"baseAccuracy":{"value":0,"compareMethod":">="},"recoil":{"value":350,"compareMethod":"<="},"muzzleVelocity":{"value":0,"compareMethod":">="},"weight":{"value":5,"compareMethod":"<="},"magazineCapacity":{"value":0,"compareMethod":">="},"width":{"value":0,"compareMethod":">="},"height":{"value":0,"compareMethod":">="},"effectiveDistance":{"value":500,"compareMethod":">="},"emptyTacticalSlot":{"value":0,"compareMethod":">="},"hasItemFromCategory":[],"containsItems":["57cff947245977638e6f2a19","56eabf3bd2720b75698b4569","5b30ac585acfc433000eb79c","59d6272486f77466146386ff","57cffb66245977632f391a99","5a9fbacda2750c00141e080f"],"index":0,"parentId":"","id":"5b477f1486f7743009493232"}}]');
        DatabaseServer.tables.locales.global.en.mail['5b486d3e86f7743780259fd4'] = 'This one is for Sniper, it seems that he’s about to set out to the woods somewhere to hunt down the villains for a week. Judging from the fact that he packed one hell of a backpack with MRE, flintstone, batteries, and water. Left it at my place for now. He needs an M1A, fitted with Ultimak M8 mount, Nightforce 7-35-56 scope, T1 reflex sight, HOLOsun tactical device. Ergonomics above 20, recoil sum below 400 and a total weight of 7.3 kg or less.';
        quests["5b477f7686f7744d1b23c4d2"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"WeaponAssembly","_props":{"target":["5aafa857e5b5b00018480968"],"value":"1","durability":{"value":60,"compareMethod":">="},"ergonomics":{"value":20,"compareMethod":">="},"baseAccuracy":{"value":0,"compareMethod":">="},"recoil":{"value":400,"compareMethod":"<="},"muzzleVelocity":{"value":0,"compareMethod":">="},"weight":{"value":7.3,"compareMethod":"<="},"magazineCapacity":{"value":0,"compareMethod":">="},"width":{"value":0,"compareMethod":">="},"height":{"value":0,"compareMethod":">="},"effectiveDistance":{"value":0,"compareMethod":">="},"emptyTacticalSlot":{"value":0,"compareMethod":">="},"hasItemFromCategory":[],"containsItems":["5addbfbb5acfc400194dbcf7","5aa66be6e5b5b0214e506e97","58d399e486f77442e0016fe7","57fd23e32459772d0805bcf1"],"index":0,"parentId":"","id":"5b47824386f7744d190d8dd1"}}]');
        DatabaseServer.tables.locales.global.en.mail['5b486d8686f77450c05449c9'] = 'How much does human life cost, how do you think? Not much, I guess. But what’s even more surprising for me, it’s the contemporary art market. The value of pieces by renowned authors grows every year. They are definitely talented, but the more you look at it, the more it seems that anything can be art. It can be a Grotko painting, a displaced urinal or a bunch of garbage. However, in my opinion, the most amazing pieces of art are weapons, starting with the melee - which is already universally recognized as such and can be found in many museums - to an old AK or M4, which are beautiful as they are. But weapon only then transcends to true art when it becomes unique, one-of-a-kind, in the hands of someone who knows how to use it, who modifies it for his own needs, creating a masterpiece worthy of being displayed in the best of museums. Bring me one such masterpiece, an M4A1 with NT4 FDE silencer, rifle length MK 10 handguard, thermal scope REAP-IR, and a 60-round magazine. Ergonomics should be not less than 56, the recoil sum less than 250, and the weight of 5 kg or less.';
        quests["5b47825886f77468074618d3"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"WeaponAssembly","_props":{"target":["5447a9cd4bdc2dbd208b4567"],"value":"1","durability":{"value":60,"compareMethod":">="},"ergonomics":{"value":56,"compareMethod":">="},"baseAccuracy":{"value":0,"compareMethod":">="},"recoil":{"value":250,"compareMethod":"<="},"muzzleVelocity":{"value":0,"compareMethod":">="},"weight":{"value":5,"compareMethod":"<="},"magazineCapacity":{"value":60,"compareMethod":">="},"width":{"value":0,"compareMethod":">="},"height":{"value":0,"compareMethod":">="},"effectiveDistance":{"value":0,"compareMethod":">="},"emptyTacticalSlot":{"value":0,"compareMethod":">="},"hasItemFromCategory":[],"containsItems":["57dbb57e2459774673234890","5b2cfa535acfc432ff4db7a0","5a1eaa87fcdbcb001865f75e"],"index":0,"parentId":"","id":"5b4783ba86f7744d1c353185"}}]');
        quests["59c50c8886f7745fed3193bf"].conditions.AvailableForFinish[0]._props.counter.conditions[0]._props.weaponModsInclusive.push(['5888945a2459774bf43ba385']);
        DatabaseServer.tables.bots.types.assault.chances.equipment.FaceCover = 90;
        DatabaseServer.tables.bots.types.assault.inventory.equipment.FaceCover = [
            "572b7fa524597762b747ce82", "572b7fa524597762b747ce82", "572b7fa524597762b747ce82", "572b7fa524597762b747ce82",
            "59e7715586f7742ee5789605", "5bd073a586f7747e6f135799", "5b432b2f5acfc4771e1c6622", "5e54f76986f7740366043752",
            "5b432c305acfc40019478128", "5bd0716d86f774171822ef4b", "5c1a1e3f2e221602b66cc4c2", "5e54f79686f7744022011103"
        ];
        {
            const conditions = DatabaseServer.tables.locales.global.en.quest['59ca29fb86f77445ab465c87'].conditions;
            conditions["59ca293c86f77445a80ed147"] = "Find 1 AK-74N";
            quests["59ca29fb86f77445ab465c87"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"FindItem","_props":{"target":["5644bd2b4bdc2d3b4c8b4572"],"value":"1","minDurability":0,"index":0,"parentId":"","id":"59ca293c86f77445a80ed147","maxDurability":0,"onlyFoundInRaid":false,"dogtagLevel":0}},{"_parent":"HandoverItem","_props":{"target":["5644bd2b4bdc2d3b4c8b4572"],"value":"1","minDurability":0,"index":1,"parentId":"","id":"59ca29ab86f77445ab133c86","visibilityConditions":[],"maxDurability":0,"onlyFoundInRaid":false,"dogtagLevel":0}},{"_parent":"FindItem","_props":{"target":["5447a9cd4bdc2dbd208b4567"],"value":"1","minDurability":0,"index":2,"parentId":"","onlyFoundInRaid":true,"id":"59ca2bdc86f77445a80ed148"}},{"_parent":"HandoverItem","_props":{"target":["5447a9cd4bdc2dbd208b4567"],"value":"1","minDurability":0,"index":3,"parentId":"","id":"59ca2c3086f77445aa0ddc15","onlyFoundInRaid":true,"visibilityConditions":[]}},{"_parent":"FindItem","_props":{"target":["5448bd6b4bdc2dfc2f8b4569"],"value":"2","minDurability":0,"index":4,"parentId":"","id":"59ca2c9e86f77428ea721232","maxDurability":0,"onlyFoundInRaid":true,"dogtagLevel":0}},{"_parent":"HandoverItem","_props":{"target":["5448bd6b4bdc2dfc2f8b4569"],"value":"2","minDurability":0,"index":5,"parentId":"","id":"59ca2cbe86f7740fe95c3e52","visibilityConditions":[],"maxDurability":0,"onlyFoundInRaid":true,"dogtagLevel":0}},{"_parent":"CounterCreator","_props":{"value":"10","type":"Elimination","counter":{"id":"5c922dde86f77438500a0feb","conditions":[{"_parent":"Kills","_props":{"target":"AnyPmc","compareMethod":">=","value":"1","id":"5c9df2ea86f77469941a4c92"}},{"_parent":"Equipment","_props":{"equipmentInclusive":[["5648a7494bdc2d9d488b4583","5aa7cfc0e5b5b00015693143"],["5648a7494bdc2d9d488b4583","5a7c4850e899ef00150be885"]],"id":"5cb32c1188a4503d684dd1b5"}}]},"index":6,"parentId":"","id":"5c922dde86f77438500a0fec"}}]');
        }
        if (quests["5d25dae186f77443e55d2f78"]) delete quests["5d25dae186f77443e55d2f78"];
        DatabaseServer.tables.locales.global.en.mail['5c0bbabb86f77466d96707a5'] = 'Impossible to do this with bots. Disable PvE.';
        if (quests["5e381b0286f77420e3417a74"]) delete quests["5e381b0286f77420e3417a74"];
        if (quests["5e4d4ac186f774264f758336"]) delete quests["5e4d4ac186f774264f758336"];
        quests["5d25d2c186f77443e35162e5"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"CounterCreator","_props":{"value":"2","type":"Elimination","counter":{"id":"5d25d4e786f77442734d335c","conditions":[{"_parent":"HealthEffect","_props":{"bodyPartsWithEffects":[{"bodyParts":["Head","Chest","Stomach","LeftArm","RightArm","LeftLeg","RightLeg"],"effects":["Tremor"]}],"id":"5d25d5b086f77408251c4bf7"}},{"_parent":"Kills","_props":{"target":"AnyPmc","compareMethod":">=","value":"1","bodyPart":["Head"],"id":"5d309d2986f7740be0755214"}}]},"index":0,"parentId":"","id":"5d25d4e786f77442734d335d"}}]');
        if (LC.config.fix_quests.cheat_friend_from_west_1) {
            DatabaseServer.tables.locales.global.en.quest['5a27c99a86f7747d2c6bdd8e'].conditions["5be0198686f774595412d9c4"] = 'Kill 7 PMC';
            quests["5a27c99a86f7747d2c6bdd8e"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"CounterCreator","_props":{"value":"7","type":"Elimination","counter":{"id":"5a27cc8186f7744c8166c6e9","conditions":[{"_parent":"Kills","_props":{"target":"AnyPmc","compareMethod":">=","value":"1","id":"5a27cca486f774484123d315"}}]},"index":0,"parentId":"","id":"5be0198686f774595412d9c4"}},{"_parent":"FindItem","_props":{"target":["59f32c3b86f77472a31742f0"],"value":"7","minDurability":0,"index":1,"parentId":"","id":"5ec137962d5b8510d548aef1","maxDurability":0,"dogtagLevel":0,"onlyFoundInRaid":true}},{"_parent":"HandoverItem","_props":{"target":["59f32c3b86f77472a31742f0"],"value":"7","minDurability":0,"index":2,"parentId":"","id":"5ec137dcc367fc6781104613","visibilityConditions":[],"maxDurability":0,"dogtagLevel":0,"onlyFoundInRaid":true}}]');
        } else {
            DatabaseServer.tables.locales.global.en.quest['5a27c99a86f7747d2c6bdd8e'].conditions["5be0198686f774595412d9c4"] = 'Kill 7 USEC';
            quests["5a27c99a86f7747d2c6bdd8e"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"CounterCreator","_props":{"value":"7","type":"Elimination","counter":{"id":"5a27cc8186f7744c8166c6e9","conditions":[{"_parent":"Kills","_props":{"target":"Usec","compareMethod":">=","value":"1","id":"5a27cca486f774484123d315"}}]},"index":0,"parentId":"","id":"5be0198686f774595412d9c4"}},{"_parent":"FindItem","_props":{"target":["59f32c3b86f77472a31742f0"],"value":"7","minDurability":0,"index":1,"parentId":"","id":"5ec137962d5b8510d548aef1","maxDurability":0,"dogtagLevel":0,"onlyFoundInRaid":true}},{"_parent":"HandoverItem","_props":{"target":["59f32c3b86f77472a31742f0"],"value":"7","minDurability":0,"index":2,"parentId":"","id":"5ec137dcc367fc6781104613","visibilityConditions":[],"maxDurability":0,"dogtagLevel":0,"onlyFoundInRaid":true}}]');
        }
        if (LC.config.fix_quests.cheat_huntsman_controller) {
            quests["5d25e2d886f77442734d335e"].conditions.AvailableForFinish = JSON.parse(instantComplete);
        } else {
            quests["5d25e2d886f77442734d335e"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"CounterCreator","_props":{"value":"2","type":"Elimination","counter":{"id":"5d307fc886f77447f15f5b22","conditions":[{"_parent":"Kills","_props":{"target":"AnyPmc","compareMethod":">=","value":"1","enemyHealthEffects":[{"bodyParts":["Head","Chest","Stomach","LeftArm","RightArm","LeftLeg","RightLeg"],"effects":["Stun"]}],"id":"5d307ff586f77447f340bce1"}}]},"index":0,"parentId":"","id":"5d307fc886f77447f15f5b23"}}]');
        }
        if (LC.config.fix_quests.cheat_shooter_born) {
            DatabaseServer.tables.locales.global.en.mail['5c0bde1a86f7747bcb347d55'] = 'It\'s impossible to kill PMC bots from 100 meters. Distances are reduced.';
            const conditions = DatabaseServer.tables.locales.global.en.quest['5c0bde0986f77479cf22c2f8'].conditions;
            conditions["5c0bdf2c86f7746f016734a8"] = "Kill 3 PMCs with headshots in the Woods from a distance of more than 10 meters. ";
            conditions["5c137b8886f7747ae3220ff4"] = "Kill 3 PMCs with headshots on the Reserve base from a distance of more than 10 meters.";
            conditions["5c137ef386f7747ae10a821e"] = "Kill 3 PMCs with headshots in the Shoreline from a distance of more than 10 meters. ";
            conditions["5c137f5286f7747ae267d8a3"] = "Kill 3 PMCs with headshots in the Customs from a distance of more than 10 meters. ";
            quests["5c0bde0986f77479cf22c2f8"].conditions.AvailableForFinish[0]._props.counter.conditions[0]._props.distance.value = 10;
            quests["5c0bde0986f77479cf22c2f8"].conditions.AvailableForFinish[1]._props.counter.conditions[0]._props.distance.value = 10;
            quests["5c0bde0986f77479cf22c2f8"].conditions.AvailableForFinish[2]._props.counter.conditions[0]._props.distance.value = 10;
            quests["5c0bde0986f77479cf22c2f8"].conditions.AvailableForFinish[3]._props.counter.conditions[0]._props.distance.value = 10;
        } else {
            DatabaseServer.tables.locales.global.en.mail['5c0bde1a86f7747bcb347d55'] = 'You know what is the difference between the professional and the amateur? It is the ability to approach the task in the right way. For example, taking out a few capable fighters at a formidable distance, in non-standard situations... Not only the choice of weapons and mods is important here, but other factors too. So, I want to see who you really are.';
            const conditions = DatabaseServer.tables.locales.global.en.quest['5c0bde0986f77479cf22c2f8'].conditions;
            conditions["5c0bdf2c86f7746f016734a8"] = "Kill 3 PMCs with headshots in the Woods from a distance of more than 100 meters. ";
            conditions["5c137b8886f7747ae3220ff4"] = "Kill 3 PMCs with headshots on the Reserve base from a distance of more than 100 meters.";
            conditions["5c137ef386f7747ae10a821e"] = "Kill 3 PMCs with headshots in the Shoreline from a distance of more than 100 meters. ";
            conditions["5c137f5286f7747ae267d8a3"] = "Kill 3 PMCs with headshots in the Customs from a distance of more than 100 meters. ";
            quests["5c0bde0986f77479cf22c2f8"].conditions.AvailableForFinish[0]._props.counter.conditions[0]._props.distance.value = 100;
            quests["5c0bde0986f77479cf22c2f8"].conditions.AvailableForFinish[1]._props.counter.conditions[0]._props.distance.value = 100;
            quests["5c0bde0986f77479cf22c2f8"].conditions.AvailableForFinish[2]._props.counter.conditions[0]._props.distance.value = 100;
            quests["5c0bde0986f77479cf22c2f8"].conditions.AvailableForFinish[3]._props.counter.conditions[0]._props.distance.value = 100;
        }
        DatabaseServer.tables.locales.global.en.quest['5a27ba1c86f77461ea5a3c56'].conditions["5fe0e9ed3f3a7d4169035e8e"] = '';
        quests["5a27ba1c86f77461ea5a3c56"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"PlaceBeacon","_props":{"target":["5991b51486f77447b112d44f"],"zoneId":"place_peacemaker_007_N1","value":"1","index":1,"parentId":"","id":"5a2806b386f77420062f0fbd","plantTime":30}},{"_parent":"PlaceBeacon","_props":{"target":["5991b51486f77447b112d44f"],"zoneId":"place_peacemaker_007_2_N2","value":"1","index":2,"parentId":"","id":"5a2806e086f774291b084041","plantTime":30}},{"_parent":"PlaceBeacon","_props":{"target":["5991b51486f77447b112d44f"],"zoneId":"place_peacemaker_007_2_N3","value":"1","index":4,"parentId":"","id":"5a2806f886f774513d3e69f5","plantTime":30}}]');
        if (LC.config.fix_quests.cheat_grenadier) {
            DatabaseServer.tables.locales.global.en.mail['5c12428d86f77406fa13baf6'] = 'This quest almost impossible due to limited PMC bot\'s behaviour. Reduced to 1 kill.';
            quests["5c0d190cd09282029f5390d8"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"CounterCreator","_props":{"value":"1","type":"Elimination","counter":{"id":"5c0d1961d0928202b25db5d0","conditions":[{"_parent":"Kills","_props":{"target":"AnyPmc","compareMethod":">=","value":"1","weapon":["5710c24ad2720bc3458b45a3","58d3db5386f77426186285a0","5a2a57cfc4a2826c6e06d44a","5448be9a4bdc2dfd2f8b456a","5e32f56fcb6d5863cc5e5ee4","5e340dcdcb6d5863cc5e5efb"],"bodyPart":["Head","Chest","Stomach","LeftArm","RightArm","LeftLeg","RightLeg"],"id":"5c0d1a47d09282029e2fffb7"}}]},"index":0,"parentId":"","id":"5c1b760686f77412780211a3"}}]');
        } else {
            DatabaseServer.tables.locales.global.en.mail['5c12428d86f77406fa13baf6'] = 'TIP] Break a leg first or use flash bangs.';
        }
        quests["5a27bb8386f7741c770d2d0a"].conditions.AvailableForFinish[0]._props.counter.conditions[0]._props.weaponModsInclusive.push(["5ea17bbc09aa976f2e7a51cd"]);
        quests["5c0d0f1886f77457b8210226"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"FindItem","_props":{"target":["5c05308086f7746b2101e90b"],"value":"2","minDurability":0,"maxDurability":0,"dogtagLevel":0,"index":0,"parentId":"","id":"5ec13d45a1032866196c939b","visibilityConditions":[],"onlyFoundInRaid":true}},{"_parent":"HandoverItem","_props":{"target":["5c05308086f7746b2101e90b"],"value":"2","minDurability":0,"maxDurability":0,"dogtagLevel":0,"index":1,"parentId":"","id":"5c138c4486f7743b056e2943","visibilityConditions":[],"onlyFoundInRaid":true}},{"_parent":"FindItem","_props":{"target":["5c052f6886f7746b1e3db148"],"value":"1","minDurability":0,"maxDurability":0,"dogtagLevel":0,"index":2,"parentId":"","id":"5ec13da983b69d213d3c2ee4","visibilityConditions":[],"onlyFoundInRaid":true}},{"_parent":"HandoverItem","_props":{"target":["5c052f6886f7746b1e3db148"],"value":"1","minDurability":0,"maxDurability":0,"dogtagLevel":0,"index":3,"parentId":"","id":"5c138d4286f774276a6504aa","visibilityConditions":[],"onlyFoundInRaid":true}}]');
        quests["5c0be5fc86f774467a116593"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"HandoverItem","_props":{"target":["5af0534a86f7743b6f354284"],"value":"1","minDurability":0,"maxDurability":0,"dogtagLevel":0,"index":3,"parentId":"","id":"5c0be66c86f7744523489ab2","visibilityConditions":[],"onlyFoundInRaid":true}},{"_parent":"HandoverItem","_props":{"target":["5c0530ee86f774697952d952"],"value":"1","minDurability":0,"maxDurability":0,"dogtagLevel":0,"index":4,"parentId":"","id":"5c0be69086f7743c9c1ecf43","visibilityConditions":[],"onlyFoundInRaid":true}}]');
        DatabaseServer.tables.locales.global.en.quest['5edab736cc183c769d778bc2'].conditions["5f03969a51823847c253afa0"] = '';
        quests["5edab736cc183c769d778bc2"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"CounterCreator","_props":{"value":"1","type":"Exploration","counter":{"id":"Coll1Count1","conditions":[{"_parent":"VisitPlace","_props":{"target":"ter_023_area_1_1","value":"1","id":"Coll1Place3"}}]},"index":0,"parentId":"","id":"5edab7d3cc183c769d778bc5"}},{"_parent":"CounterCreator","_props":{"value":"1","type":"Exploration","counter":{"id":"Coll1Count2","conditions":[{"_parent":"VisitPlace","_props":{"target":"ter_023_area_2_1","value":"1","id":"Coll1Place1"}}]},"index":1,"parentId":"","id":"5edab8e216d985118871ba18","visibilityConditions":[]}},{"_parent":"CounterCreator","_props":{"value":"1","type":"Exploration","counter":{"id":"Coll1Count3","conditions":[{"_parent":"VisitPlace","_props":{"target":"ter_023_area_3_1","value":"1","id":"Coll1Place2"}}]},"index":2,"parentId":"","id":"5edab8890880da21347b3826","visibilityConditions":[]}}]');
        quests["5edaba7c0c502106f869bc02"].conditions.AvailableForFinish = JSON.parse(instantComplete);
        quests["5c0be13186f7746f016734aa"].conditions.AvailableForFinish[0]._props.value = "9";
        quests["5c1141f386f77430ff393792"].conditions.AvailableForStart = JSON.parse('[{"_parent":"Quest","_props":{"target":"5c10f94386f774227172c572","status":[4],"availableAfter":0,"index":0,"parentId":"","id":""}}]');
        if (LC.config.fix_quests.cheat_huntsman_perimeter) {
            quests["5d25e2b486f77409de05bba0"].conditions.AvailableForFinish[0]._props.counter.conditions = JSON.parse('[{"_parent":"Kills","_props":{"target":"AnyPmc","compareMethod":">=","value":"1","id":"5d2c954586f77434292a5662"}},{"_parent":"Location","_props":{"target":["factory4_day","factory4_night"],"id":"5d2c955186f774342b030482"}}]');
        } else {
            quests["5d25e2b486f77409de05bba0"].conditions.AvailableForFinish[0]._props.counter.conditions = JSON.parse('[{"_parent":"CounterCreator","_props":{"value":"6","type":"Elimination","counter":{"id":"5d26143c86f77469ef0f894b","conditions":[{"_parent":"InZone","_props":{"zoneIds":["huntsman_013"],"id":"5d26149b86f77469f1599fdc"}},{"_parent":"Kills","_props":{"target":"AnyPmc","compareMethod":">=","value":"1","id":"5d2c954586f77434292a5662"}},{"_parent":"Location","_props":{"target":["factory4_day","factory4_night"],"id":"5d2c955186f774342b030482"}}]},"index":0,"parentId":"","id":"5d26143c86f77469ef0f894c"}}]');
        }
        if (LC.config.fix_quests.cheat_huntsman_watchman) {
            quests["5d25e44386f77409453bce7b"].conditions.AvailableForFinish[0]._props.counter.conditions = JSON.parse('[{"_parent":"Kills","_props":{"target":"AnyPmc","compareMethod":">=","value":"1","id":"5d27351e86f774457411b262"}},{"_parent":"Location","_props":{"target":["bigmap"],"id":"5d2c94f786f774342d57a662"}}]');
        } else {
            quests["5d25e44386f77409453bce7b"].conditions.AvailableForFinish[0]._props.counter.conditions = JSON.parse('[{"_parent":"CounterCreator","_props":{"value":"5","type":"Elimination","counter":{"id":"5d2733c586f7741dea4f3071","conditions":[{"_parent":"Kills","_props":{"target":"AnyPmc","compareMethod":">=","value":"1","id":"5d27351e86f774457411b262"}},{"_parent":"InZone","_props":{"zoneIds":["huntsman_020"],"id":"5d27354086f77445722f1f9d"}},{"_parent":"Location","_props":{"target":["bigmap"],"id":"5d2c94f786f774342d57a662"}}]},"index":0,"parentId":"","id":"5d2733c586f7741dea4f3072"}}]');
        }
        DatabaseServer.tables.locales.global.en.mail['5d27245186f774483c7bdb16'] = 'Supposed to be find in raid Shturman\'s key but it won\'t drop 100%.';
        quests["5d25e2ee86f77443e35162ea"].conditions.AvailableForFinish[1]._props.onlyFoundInRaid = false;
        quests["5d25e2ee86f77443e35162ea"].conditions.AvailableForFinish[2]._props.onlyFoundInRaid = false;
        DatabaseServer.tables.locales.global.en.mail['5d66912c86f774368f43a245'] = 'Come on in. Want some tea? Well, whatever. So listen, heres the deal. Soon I will be hosting a few friends of mine. I want to go hunting with them, but theres just no way I can take them hunting with these MP shotguns. I want you to get us a couple of nice rifles. Such rifles so I could add them to my personal collection after this hunt. You gotta love long-range shooting. But first, you have to make sure the rifle is zeroed properly. And we have just the client for that, his name is Shturman. Hes lurking around a lumbermill in the woods, nasty bastard. Dont worry about the reward. It wont disappoint you. Ill write you a note with the stats for the rifles. (Remington M700 with a March Tactical 3-24x42 FFP scope)';
        DatabaseServer.tables.locales.global.en.quest['5d25e4ca86f77409dd5cdf2c'].conditions["5d66920c86f774368d281afe"] = 'Kill Shturman with the Remington Model 700 Sniper rifle with a scope.';
        quests["5d25e4ca86f77409dd5cdf2c"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"CounterCreator","_props":{"value":"1","type":"Elimination","counter":{"id":"hunting_trip_conditions","conditions":[{"_parent":"Kills","_props":{"target":"Savage","compareMethod":">=","value":"1","savageRole":["bossKojaniy"],"weapon":["5bfea6e90db834001b7347f3"],"weaponModsInclusive":[["57c5ac0824597754771e88a9"]],"id":"hunting_trip_kill_kojaniy"}}]},"index":0,"parentId":"","id":"5d66920c86f774368d281afe"}}]');
        quests["5d25e29d86f7740a22516326"].conditions.AvailableForStart[0]._props.target = '5d25d2c186f77443e35162e5';
        quests["5c0bdb5286f774166e38eed4"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"Skill","_props":{"target":"StressResistance","compareMethod":">=","value":"6","index":0,"parentId":"","id":"5c0bdbb586f774166e38eed5"}}]');
        quests["5bc479e586f7747f376c7da3"].conditions.AvailableForFinish[1]._props.counter.conditions[0]._props.weapon.push('5de652c31b7e3716273428be');
        if (LC.config.fix_quests.cheat_tarkov_shooter_3) {
            DatabaseServer.tables.locales.global.en.mail['5bc47df886f7741e6b2f3328'] = ' No distance limit. It\'s too difficult due to PMC bot\'s increased difficulty.';
            DatabaseServer.tables.locales.global.en.quest['5bc47dbf86f7741ee74e93b9'].conditions["5bc47e3e86f7741e6b2f3332"] = "Kill 3 PMC operatives with a bolt-action rifle";
            quests["5bc47dbf86f7741ee74e93b9"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"CounterCreator","_props":{"value":"3","type":"Elimination","counter":{"id":"5bc47e3e86f7741e6b2f3331","conditions":[{"_parent":"Kills","_props":{"target":"AnyPmc","compareMethod":">=","value":"1","weapon":["5bfd297f0db834001a669119","5ae08f0a5acfc408fb1398a1","55801eed4bdc2d89578b4588","588892092459774ac91d4b11","5df24cf80dee1b22f862e9bc","5bfea6e90db834001b7347f3","5de652c31b7e3716273428be"],"id":"5bc4800d86f774194f27ac45"}}]},"index":0,"parentId":"","id":"5bc47e3e86f7741e6b2f3332"}}]');
        } else {
            DatabaseServer.tables.locales.global.en.mail['5bc47df886f7741e6b2f3328'] = 'TIP] Use flash bangs. "Huntsman path - Controller" can be done at the same time.';
            DatabaseServer.tables.locales.global.en.quest['5bc47dbf86f7741ee74e93b9'].conditions["5bc47e3e86f7741e6b2f3332"] = "Kill 3 PMC operatives with a bolt-action rifle at close range, less than 25 meters away";
            quests["5bc47dbf86f7741ee74e93b9"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"CounterCreator","_props":{"value":"3","type":"Elimination","counter":{"id":"5bc47e3e86f7741e6b2f3331","conditions":[{"_parent":"Kills","_props":{"target":"AnyPmc","compareMethod":">=","value":"1","weapon":["5bfd297f0db834001a669119","5ae08f0a5acfc408fb1398a1","55801eed4bdc2d89578b4588","588892092459774ac91d4b11","5df24cf80dee1b22f862e9bc","5bfea6e90db834001b7347f3","5de652c31b7e3716273428be"],"distance":{"compareMethod":"<=","value":25},"id":"5bc4800d86f774194f27ac45"}}]},"index":0,"parentId":"","id":"5bc47e3e86f7741e6b2f3332"}}]');
        }
        if (LC.config.fix_quests.cheat_tarkov_shooter_5) {
            quests["5bc4826c86f774106d22d88b"].conditions.AvailableForFinish = JSON.parse(instantComplete);
        } else {
            quests["5bc4826c86f774106d22d88b"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"CounterCreator","_props":{"value":8,"type":"Elimination","counter":{"id":"5bc482c186f774710a789f25","conditions":[{"_parent":"Kills","_props":{"target":"Savage","compareMethod":">=","value":"1","weapon":["5bfd297f0db834001a669119","5ae08f0a5acfc408fb1398a1","55801eed4bdc2d89578b4588","588892092459774ac91d4b11","5df24cf80dee1b22f862e9bc","5bfea6e90db834001b7347f3","5de652c31b7e3716273428be"],"daytime":{"from":21,"to":5},"id":"5bc48a0f86f7742ce94849d9"}},{"_parent":"Location","_props":{"target":["bigmap"],"id":"5bc48b3d86f77452b373195e"}}]},"index":0,"parentId":"","id":"5bc84f7a86f774294c2f6862"}}]');
        }
        if (LC.config.fix_quests.cheat_tarkov_shooter_6) {
            quests["5bc4836986f7740c0152911c"].conditions.AvailableForFinish = JSON.parse(instantComplete);
        } else {
            quests["5bc4836986f7740c0152911c"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"CounterCreator","_props":{"value":"5","type":"Elimination","counter":{"id":"5bc483ba86f77415034ba8cf","conditions":[{"_parent":"Kills","_props":{"target":"Savage","compareMethod":">=","value":"1","weapon":["5bfd297f0db834001a669119","5ae08f0a5acfc408fb1398a1","55801eed4bdc2d89578b4588","588892092459774ac91d4b11","5df24cf80dee1b22f862e9bc","5bfea6e90db834001b7347f3","5de652c31b7e3716273428be"],"savageRole":["marksman"],"id":"5bc489ec86f7746b7978fe69"}}]},"index":0,"parentId":"","id":"5bc483ba86f77415034ba8d0"}}]');
        }
        quests["5bc4856986f77454c317bea7"].conditions.AvailableForFinish[0]._props.counter.conditions[0]._props.weaponModsInclusive.push(['5888945a2459774bf43ba385']);
        if (LC.config.fix_quests.cheat_tarkov_shooter_7) {
            DatabaseServer.tables.locales.global.en.mail['5bc4859286f7746ea2758571'] = 'To match with \'A Shooter Born in Heaven\', distance is reduced.';
            DatabaseServer.tables.locales.global.en.quest['5bc4856986f77454c317bea7'].conditions["5bc485b586f774726473a858"] = "Kill 5 PMC operatives with a suppressed bolt-action rifle from at least 10 meters away";
            quests["5bc4856986f77454c317bea7"].conditions.AvailableForFinish[0]._props.counter.conditions[0]._props.distance.value = 10;
        } else {
            DatabaseServer.tables.locales.global.en.mail['5bc4859286f7746ea2758571'] = 'Killing is more effective without noise, from a safe distance. The next test is practice in this kind of business.';
            DatabaseServer.tables.locales.global.en.quest['5bc4856986f77454c317bea7'].conditions["5bc485b586f774726473a858"] = "Kill 5 PMC operatives with a suppressed bolt-action rifle from at least 45 meters away";
            quests["5bc4856986f77454c317bea7"].conditions.AvailableForFinish[0]._props.counter.conditions[0]._props.distance.value = 10;
        }
        quests["5edac63b930f5454f51e128b"].conditions.AvailableForFinish = JSON.parse('[{"_parent":"FindItem","_props":{"target":["5eff135be0d3331e9d282b7b"],"value":"1","index":0,"parentId":"","id":"5eff5674befb6436ce3bbaf7"}},{"_parent":"HandoverItem","_props":{"target":["5eff135be0d3331e9d282b7b"],"value":"1","index":1,"parentId":"","id":"5edac8483c809a44ef12b4d2"}},{"_parent":"CounterCreator","_props":{"value":"1","type":"Exploration","counter":{"id":"AnotherRandomID","conditions":[{"_parent":"VisitPlace","_props":{"target":"peace_027_area","value":"1","id":"TotallyRandomID"}}]},"index":2,"parentId":"","id":"5eec9d054110547f1f545c99","visibilityConditions":[]}}]');
        {
            let newConds = [];
            for (const idx in quests["5c51aac186f77432ea65c552"].conditions.AvailableForStart) {
                const cond = quests["5c51aac186f77432ea65c552"].conditions.AvailableForStart[idx];
                const target = cond._props.target;
                if (target !== '596a0e1686f7741ddf17dbee' && target !== '5d25e2d886f77442734d335e'
                    && target !== '5d6fbc2886f77449d825f9d3' && target !== '59ca1a6286f774509a270942'
                    && target !== '5b47825886f77468074618d3') {
                    newConds.push(cond);
                }
            }
            quests["5c51aac186f77432ea65c552"].conditions.AvailableForStart = newConds;
        }
    }

    static fixAssorts() {
        if (!LC.config.fix_assorts || !LC.config.fix_assorts.enabled) {
            return;
        }
        ;
        let npcPrices = JSON.parse(VFS.readFile(`user\\mods\\tarkov-spp-mod\\db\\npc_prices.json`));
        for (let traderId in npcPrices) {
            let items = npcPrices[traderId];
            let trader = DatabaseServer.tables.traders[traderId];
            for (let itemId in items) {
                let category = LC.getCategory(itemId);
                if ("5b5f78dc86f77409407a7f8e" === category.Id) {
                    continue;
                }
                let item = items[itemId];
                let assortId = LC.findAssort(trader, itemId, true)
                if (assortId) {
                    LC.addAssort(trader, assortId, item.ll, null,
                        null,
                        `[[{"count":${item.count},"_tpl":"${item._tpl}"}]]`,
                        null);
                } else {
                }
            }
        }
        let sellers = JSON.parse(VFS.readFile(`user\\mods\\tarkov-spp-mod\\db\\sellers.json`));
        for (let traderId in sellers) {
            let items = sellers[traderId];
            let trader = DatabaseServer.tables.traders[traderId];
            for (let itemId in items) {
                let ll = items[itemId];
                let assortId = null;
                let assortLl = null;
                for (let idx in trader.assort.items) {
                    let assort = trader.assort.items[idx];
                    if (assort.slotId === 'hideout' && assort._tpl === itemId) {
                        assortId = assort._id;
                        assortLl = trader.assort.loyal_level_items[assortId];
                        break;
                    }
                }
                if (assortId) {
                    if (assortLl !== ll) {
                        LC.addAssort(trader, assortId, ll, null, null, null, null);
                    }
                } else {
                    assortId = "fixAssort_" + HashUtil.generate();
                    if (trader === LC.traders.peacekeeper) {
                        LC.addAssort(trader, assortId, ll, null,
                            `{"_id":"${assortId}","_tpl":"${itemId}","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":99999999}}`,
                            `[[{"count":${LC.getHandbookPrice(itemId) / 118},"_tpl":"5696686a4bdc2da3298b456a"}]]`,
                            null);
                    } else {
                        LC.addAssort(trader, assortId, ll, null,
                            `{"_id":"${assortId}","_tpl":"${itemId}","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":99999999}}`,
                            `[[{"count":${LC.getHandbookPrice(itemId)},"_tpl":"5449016a4bdc2d6f028b456f"}]]`,
                            null);
                    }
                }
            }
        }
        {
            let assortId;
            LC.addAssort(LC.traders.prapor, '5eeca646bfed7142cb31033d', 1, null, null, null, null);
            LC.addAssort(LC.traders.prapor, '5eeca645bfed7142cb3102a8', 1, null, null, null, null);
            LC.addAssort(LC.traders.prapor, '5eeca645bfed7142cb3102bc', 1, null, null, null, null);
            LC.addAssort(LC.traders.prapor, '5eeca646bfed7142cb310486', 1, null,
                null,
                '[[{"count":1,"_tpl":"573478bc24597738002c6175"},{"count":1,"_tpl":"5e2af00086f7746d3f3c33f7"}]]',
                null);
            LC.addAssort(LC.traders.prapor, '5eeca647bfed7142cb31056e', 1, null,
                null,
                '[[{"count":4,"_tpl":"57347cd0245977445a2d6ff1"}]]',
                null);
            LC.addAssort(LC.traders.prapor, '5eeca646bfed7142cb31038a', 1, null, null, null, null);
            LC.addAssort(LC.traders.prapor, '5eeca647bfed7142cb3105aa', 1, null, null, null, null);
            LC.addAssort(LC.traders.prapor, '5f6770f839a13e712a1dff55', 2, null, null, null, null);
            LC.addAssort(LC.traders.prapor, '5eeca645bfed7142cb3102f2', 2, null,
                null,
                '[[{"count":1,"_tpl":"59e3658a86f7741776641ac4"},{"count":2,"_tpl":"5909e99886f7740c983b9984"},{"count":1,"_tpl":"573476d324597737da2adc13"}]]',
                null);
            LC.addAssort(LC.traders.prapor, '5eeca646bfed7142cb3103d5', 2, null,
                null,
                '[[{"count":5,"_tpl":"573475fb24597737fb1379e1"},{"count":3,"_tpl":"573476d324597737da2adc13"}]]',
                null);
            LC.addAssort(LC.traders.prapor, '5eeca646bfed7142cb310471', 2, null,
                null,
                '[[{"count":1,"_tpl":"590c5a7286f7747884343aea"}]]',
                null);
            LC.addAssort(LC.traders.prapor, '5eeca646bfed7142cb310492', 2, null,
                null,
                '[[{"count":1,"_tpl":"5d1b32c186f774252167a530"}]]',
                null);
            LC.addAssort(LC.traders.prapor, 'ValdayBarter', 2, null, null, null, null);
            LC.addAssort(LC.traders.prapor, '5eeca646bfed7142cb3103de', 3, null,
                null,
                '[[{"count":2,"_tpl":"5c0fa877d174af02a012e1cf"},{"count":1,"_tpl":"590c595c86f7747884343ad7"}]]',
                null);
            LC.addAssort(LC.traders.prapor, '5eeca646bfed7142cb3104b9', 3, null,
                null,
                '[[{"count":2,"_tpl":"59faf98186f774067b6be103"}]]',
                null);
            LC.addAssort(LC.traders.prapor, '5eeca646bfed7142cb3104da', 3, null,
                null,
                '[[{"count":2,"_tpl":"590c5a7286f7747884343aea"},{"count":3,"_tpl":"5d1c819a86f774771b0acd6c"}]]',
                null);
            LC.addAssort(LC.traders.prapor, '5eeca647bfed7142cb3105a4', 3, null,
                null,
                '[[{"side":"Usec","level":25,"count":9,"_tpl":"59f32c3b86f77472a31742f0"}]]',
                null);
            LC.addAssort(LC.traders.prapor, '5eff99fe2e3bbe575000ed57', 3, null,
                null,
                '[[{"count":2,"_tpl":"5751496424597720a27126da"},{"count":2,"_tpl":"573476d324597737da2adc13"}]]',
                null);
            LC.addAssort(LC.traders.prapor, '5eeca646bfed7142cb310367', 3, null,
                null,
                `[[{"count":35204,"_tpl":"5449016a4bdc2d6f028b456f"}]]`,
                null);
            LC.addAssort(LC.traders.prapor, '72df9cc65cf082729fc1176d', 3, null,
                null,
                `[[{"count":18137,"_tpl":"5449016a4bdc2d6f028b456f"}]]`,
                null);
            LC.addAssort(LC.traders.prapor, '5eeca647bfed7142cb31054b', 4, null,
                null,
                '[[{"count":1,"_tpl":"5d0376a486f7747d8050965c"},{"count":1,"_tpl":"5c06779c86f77426e00dd782"}]]',
                null);
            assortId = "prapor_condor";
            LC.addAssort(LC.traders.prapor, assortId, 4, null,
                `{"_id":"${assortId}","_tpl":"603409c80ca681766b6a0fb2","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":999999999}}`,
                `[[{"count":7979,"_tpl":"5449016a4bdc2d6f028b456f"}]]`,
                null);
            LC.addAssort(LC.traders.prapor, '5eeca646bfed7142cb310411', 4, null, null,
                `[[{"count":144499,"_tpl":"5449016a4bdc2d6f028b456f"}]]`,
                null);
        }
        {
            LC.addAssort(LC.traders.therapist, '5eeca649bfed7142cb3105d6', 1, null,
                null,
                '[[{"count":1,"_tpl":"57347b8b24597737dd42e192"}]]',
                null);
            LC.addAssort(LC.traders.therapist, '5eeca649bfed7142cb31060c', 1, null,
                null,
                '[[{"count":3,"_tpl":"56742c284bdc2d98058b456d"},{"count":2,"_tpl":"57347b8b24597737dd42e192"}]]',
                null);
            LC.addAssort(LC.traders.therapist, '5eeca648bfed7142cb3105b6', 2, null,
                null,
                '[[{"count":6,"_tpl":"5d1b3a5d86f774252167ba22"},{"count":2,"_tpl":"5d1b3f2d86f774253763b735"}]]',
                null);
            LC.addAssort(LC.traders.therapist, '5eeca648bfed7142cb3105b8', 2, null,
                null,
                '[[{"count":1,"_tpl":"59e3658a86f7741776641ac4"},{"count":1,"_tpl":"59e3639286f7741777737013"},{"count":4,"_tpl":"573478bc24597738002c6175"}]]',
                null);
            LC.addAssort(LC.traders.therapist, '5eeca649bfed7142cb3105d4', 2, null,
                null,
                '[[{"count":1,"_tpl":"59e35abd86f7741778269d82"}]]',
                null);
            LC.addAssort(LC.traders.therapist, '5eeca649bfed7142cb310622', 2, null,
                null,
                '[[{"count":2,"_tpl":"5e2aef7986f7746d3f3c33f5"}]]',
                null);
            LC.addAssort(LC.traders.therapist, '5eeca649bfed7142cb31062a', 2, null,
                null,
                '[[{"count":8,"_tpl":"5e2af02c86f7746d420957d4"}]]',
                null);
            LC.addAssort(LC.traders.therapist, 'ExpeditionaryFuel', 2, null,
                null,
                '[[{"count":1,"_tpl":"5d1b33a686f7742523398398"},{"count":4,"_tpl":"544fb62a4bdc2dfb738b4568"}]]',
                null);
            LC.addAssort(LC.traders.therapist, '5eeca649bfed7142cb310624', 3, null,
                null,
                '[[{"side":"Any","level":17,"count":150,"_tpl":"59f32c3b86f77472a31742f0"}]]',
                null);
            LC.addAssort(LC.traders.therapist, '5eeca649bfed7142cb3105e0', 3, null,
                null,
                '[[{"count":20,"_tpl":"5af0534a86f7743b6f354284"},{"count":15,"_tpl":"5d1b3a5d86f774252167ba22"}]]',
                null);
            LC.addAssort(LC.traders.therapist, '5eeca649bfed7142cb310600', 3, null,
                null,
                '[[{"count":1,"_tpl":"5d1b3f2d86f774253763b735"},{"count":1,"_tpl":"59e361e886f774176c10a2a5"},{"count":1,"_tpl":"59e35abd86f7741778269d82"}]]',
                null);
            LC.addAssort(LC.traders.therapist, '5eeca649bfed7142cb31061c', 3, null,
                null,
                '[[{"count":4,"_tpl":"5d1b33a686f7742523398398"},{"count":4,"_tpl":"5d1b385e86f774252167b98a"}]]',
                null);
            LC.addAssort(LC.traders.therapist, '5eeca649bfed7142cb31060e', 3, null,
                null,
                '[[{"count":3,"_tpl":"5d40412b86f7743cb332ac3a"}]]',
                null);
            LC.addAssort(LC.traders.therapist, '5eeca649bfed7142cb31060a', 4, null,
                null,
                '[[{"count":6,"_tpl":"5d1b3a5d86f774252167ba22"}]]',
                null);
        }
        {
            let assortId;
            LC.addAssort(LC.traders.skier, '5eeca635bfed7142cb30f6e9', 1, null, null, null, null);
            LC.addAssort(LC.traders.skier, '5eeca634bfed7142cb30f6a5', 1, '596b455186f77457cb50eccb', null, null, null);
            LC.addAssort(LC.traders.skier, '5eeca635bfed7142cb30f6f7', 1, null, null,
                `[[{"count":45819,"_tpl":"5449016a4bdc2d6f028b456f"}]]`,
                null);
            LC.addAssort(LC.traders.skier, '5eeca635bfed7142cb30f77a', 1, null, null, null, null);
            LC.addAssort(LC.traders.skier, '5eeca638bfed7142cb30f91e', 2, '597a0b2986f77426d66c0633', null, null, null);
            LC.addAssort(LC.traders.skier, '5eeca635bfed7142cb30f7b6', 2, null,
                null,
                '[[{"count":1,"_tpl":"5af0484c86f7740f02001f7f"}]]',
                null);
            LC.addAssort(LC.traders.skier, 'SigMCX_Barter', 2, null,
                null,
                '[[{"count":2,"_tpl":"5c1265fc86f7743f896a21c2"},{"count":1,"_tpl":"5bc9b720d4351e450201234b"}]]',
                null);
            LC.addAssort(LC.traders.skier, '5fd251ee16cac650092f5d04', 2, null, null,
                `[[{"count":89439,"_tpl":"5449016a4bdc2d6f028b456f"}]]`,
                null);
            LC.addAssort(LC.traders.skier, '5eeca634bfed7142cb30f6db', 3, '5c0bbaa886f7746941031d82', null, null, null);
            LC.addAssort(LC.traders.skier, '5eeca635bfed7142cb30f75e', 3, null, null, null, null);
            assortId = 'mcx_300_ll3';
            LC.addAssort(LC.traders.skier, assortId, 3, null,
                `{"_id":"${assortId}","_tpl":"5fbcc1d9016cce60e8341ab3","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":99999999}}`,
                '[[{"count":70900,"_tpl":"5449016a4bdc2d6f028b456f"}]]',
                [
                    `{"_id":"${assortId}_grip","_tpl":"5fbcbd6c187fea44d52eda14","parentId":"${assortId}","slotId":"mod_pistol_grip"}`,
                    `{"_id":"${assortId}_maga","_tpl":"55d4887d4bdc2d962f8b4570","parentId":"${assortId}","slotId":"mod_magazine"}`,
                    `{"_id":"${assortId}_receiver","_tpl":"5fbcc3e4d6fa9c00c571bb58","parentId":"${assortId}","slotId":"mod_reciever"}`,
                    `{"_id":"${assortId}_barrel","_tpl":"5fbbfacda56d053a3543f799","parentId":"${assortId}_receiver","slotId":"mod_barrel"}`,
                    `{"_id":"${assortId}_muzzle","_tpl":"5fbc22ccf24b94483f726483","parentId":"${assortId}_barrel","slotId":"mod_muzzle"}`,
                    `{"_id":"${assortId}_muzzle_1","_tpl":"5fbcbd10ab884124df0cd563","parentId":"${assortId}_muzzle","slotId":"mod_muzzle_000"}`,
                    `{"_id":"${assortId}_gas_block","_tpl":"5fbc210bf24b94483f726481","parentId":"${assortId}_barrel","slotId":"mod_gas_block"}`,
                    `{"_id":"${assortId}_handguard","_tpl":"5fbc226eca32ed67276c155d","parentId":"${assortId}_receiver","slotId":"mod_handguard"}`,
                    `{"_id":"${assortId}_front","_tpl":"5fc0fa362770a0045c59c677","parentId":"${assortId}_handguard","slotId":"mod_sight_front"}`,
                    `{"_id":"${assortId}_rear","_tpl":"5fc0fa957283c4046c58147e","parentId":"${assortId}_receiver","slotId":"mod_sight_rear"}`,
                    `{"_id":"${assortId}_stock","_tpl":"5fbcc437d724d907e2077d5c","parentId":"${assortId}","slotId":"mod_stock"}`,
                    `{"_id":"${assortId}_charge","_tpl":"5fbcc640016cce60e8341acc","parentId":"${assortId}","slotId":"mod_charge"}`
                ]);
            LC.addAssort(LC.traders.skier, '5eeca635bfed7142cb30f7ed', 3, null,
                null,
                '[[{"count":5,"_tpl":"573478bc24597738002c6175"},{"count":1,"_tpl":"590de71386f774347051a052"}]]',
                null);
            LC.addAssort(LC.traders.skier, '5fd251c90d9c95034825edb6', 3, null, null,
                `[[{"count":96715,"_tpl":"5449016a4bdc2d6f028b456f"}]]`,
                null);
            LC.addAssort(LC.traders.skier, '5eeca635bfed7142cb30f83f', 3, null, null,
                `[[{"count":73329,"_tpl":"5449016a4bdc2d6f028b456f"}]]`,
                null);
            LC.addAssort(LC.traders.skier, '5eeca634bfed7142cb30f6d3', 4, null,
                null,
                '[[{"count":1,"_tpl":"5d0378d486f77420421a5ff4"}]]',
                null);
            LC.addAssort(LC.traders.skier, '5eeca635bfed7142cb30f7b4', 4, null,
                null,
                '[[{"count":4,"_tpl":"59e3647686f774176a362507"},{"count":4,"_tpl":"59faf7ca86f7740dbe19f6c2"},{"count":6,"_tpl":"5d235a5986f77443f6329bc6"}]]',
                null);
            LC.addAssort(LC.traders.skier, '5eeca635bfed7142cb30f83d', 4, null,
                null,
                '[[{"count":10,"_tpl":"5d1b376e86f774252519444e"},{"count":10,"_tpl":"5d40407c86f774318526545a"},{"count":5,"_tpl":"544fb6cc4bdc2d34748b456e"}]]',
                null);
            LC.addAssort(LC.traders.skier, 'SigSRD', 4, null, null, null, null);
        }
        {
            let assortId;
            LC.addAssort(LC.traders.peacekeeper, '5f004c021b27f811e5317c0f', 1, '5a27b75b86f7742e97191958', null, null, null);
            LC.addAssort(LC.traders.peacekeeper, '5f004be61b27f811e5317a76', 1, null,
                null,
                '[[{"count":2,"_tpl":"5939a00786f7742fe8132936"}]]',
                null);
            LC.addAssort(LC.traders.peacekeeper, '5f004bff1b27f811e5317bbf', 1, null,
                null,
                '[[{"count":3,"_tpl":"573477e124597737dd42e191"},{"count":3,"_tpl":"5734779624597737e04bf329"}]]',
                null);
            LC.addAssort(LC.traders.peacekeeper, '5f004c001b27f811e5317bce', 1, null,
                null,
                '[[{"side":"Any","level":8,"count":7,"_tpl":"59f32c3b86f77472a31742f0"}]]',
                null);
            LC.addAssort(LC.traders.peacekeeper, 'Ump45Mag_barter', 1, null, null, null, null);
            LC.addAssort(LC.traders.peacekeeper, "5f004bed1b27f811e5317ad1", 2, null,
                null,
                '[[{"count":1,"_tpl":"5d03794386f77420415576f5"},{"count":3,"_tpl":"5d0377ce86f774186372f689"},{"count":2,"_tpl":"5c05308086f7746b2101e90b"},{"count":3,"_tpl":"5d0375ff86f774186372f685"}]]',
                null);
            LC.addAssort(LC.traders.peacekeeper, '5f004c021b27f811e5317c19', 2, '5a27b7d686f77460d847e6a6', null, null, null);
            LC.addAssort(LC.traders.peacekeeper, '5f004c031b27f811e5317c27', 2, '5a27b9de86f77464e5044585', null, null, null);
            LC.addAssort(LC.traders.peacekeeper, '5f004bfa1b27f811e5317b85', 2, '5a03173786f77451cb427172', null, null, null);
            assortId = 'five_seven_ll2';
            LC.addAssort(LC.traders.peacekeeper, assortId, 2, null,
                `{"_id":"${assortId}","_tpl":"5d3eb3b0a4b93615055e84d2","upd":{"UnlimitedCount":true,"StackObjectsCount":999999999},"parentId":"hideout","slotId":"hideout"}`,
                '[[{"count":1,"_tpl":"5d03784a86f774203e7e0c4d"}]]',
                [
                    `{"_id":"${assortId}_barrel","_tpl":"5d3eb5b6a4b9361eab311902","parentId":"${assortId}","slotId":"mod_barrel"}`,
                    `{"_id":"${assortId}_receiver","_tpl":"5d3eb44aa4b93650d64e4979","parentId":"${assortId}","slotId":"mod_reciever"}`,
                    `{"_id":"${assortId}_rear","_tpl":"5d3eb4aba4b93650d64e497d","parentId":"${assortId}_receiver","slotId":"mod_sight_rear"}`,
                    `{"_id":"${assortId}_front","_tpl":"5d3eb536a4b9363b1f22f8e2","parentId":"${assortId}_receiver","slotId":"mod_sight_front"}`,
                    `{"_id":"${assortId}_mag","_tpl":"5d3eb5eca4b9363b1f22f8e4","parentId":"${assortId}","slotId":"mod_magazine"}`
                ]);
            LC.addAssort(LC.traders.peacekeeper, '5eeca635bfed7142cb30f748', 2, '5a27b87686f77460de0252a8', null, null, null);
            LC.addAssort(LC.traders.peacekeeper, 'Bravo4Barter', 2, null, null, null, null);
            LC.addAssort(LC.traders.peacekeeper, 'Mag30MP9', 2, null, null, null, null);
            LC.addAssort(LC.traders.peacekeeper, '5fd2517dbdd50d684f73a47c', 2, null, null,
                `[[{"count":269,"_tpl":"5696686a4bdc2da3298b456a"}]]`, null);
            LC.addAssort(LC.traders.peacekeeper, '5f004bf41b27f811e5317b36', 3, '5a27ba9586f7741b543d8e85', null, null, null);
            assortId = 'pmag_d60_ll3';
            LC.addAssort(LC.traders.peacekeeper, assortId, 3, '5a27bbf886f774333a418eeb',
                `{"_id":"${assortId}","_tpl":"59c1383d86f774290a37e0ca","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":999999999}}`,
                '[[{"count":1,"_tpl":"590c595c86f7747884343ad7"},{"count":2,"_tpl":"5e2aedd986f7746d404f3aa4"}]]',
                null);
            LC.addAssort(LC.traders.peacekeeper, '5f004be51b27f811e5317a55', 3, null,
                null,
                '[[{"count":6,"_tpl":"5d235b4d86f7742e017bc88a"}]]',
                null);
            LC.addAssort(LC.traders.peacekeeper, '5f004bf21b27f811e5317b11', 3, null,
                null,
                '[[{"count":10,"_tpl":"5909e99886f7740c983b9984"}]]',
                null);
            LC.addAssort(LC.traders.peacekeeper, '5f004c081b27f811e5317c6c', 3, null,
                null,
                '[[{"count":2,"_tpl":"590a3b0486f7743954552bdb"},{"count":1,"_tpl":"5672cb724bdc2dc2088b456b"}]]',
                null);
            LC.addAssort(LC.traders.peacekeeper, '5f004c0b1b27f811e5317c92', 3, null,
                null,
                '[[{"side":"Bear","level":15,"count":8,"_tpl":"59f32bb586f774757e1e8442"},{"side":"Usec","level":15,"count":8,"_tpl":"59f32c3b86f77472a31742f0"}]]',
                null);
            LC.addAssort(LC.traders.peacekeeper, '5f004c1b1b27f811e5317d84', 3, null,
                null,
                '[[{"count":4,"_tpl":"590c645c86f77412b01304d9"},{"count":4,"_tpl":"590c651286f7741e566b6461"}]]',
                null);
            LC.addAssort(LC.traders.peacekeeper, '5f004c011b27f811e5317bf4', 4, null,
                null,
                '[[{"count":3,"_tpl":"5d403f9186f7743cac3f229b"},{"count":1,"_tpl":"5d40407c86f774318526545a"}]]',
                null);
            LC.addAssort(LC.traders.peacekeeper, '5f004c051b27f811e5317c4d', 4, null,
                null,
                '[[{"count":1,"_tpl":"5bc9b720d4351e450201234b"},{"count":1,"_tpl":"573477e124597737dd42e191"}]]',
                null);
            LC.addAssort(LC.traders.peacekeeper, '5f004c0a1b27f811e5317c85', 4, null,
                null,
                '[[{"count":1,"_tpl":"5c1265fc86f7743f896a21c2"},{"count":1,"_tpl":"5af0561e86f7745f5f3ad6ac"}]]',
                null);
            assortId = "peacekeeper_afak";
            LC.addAssort(LC.traders.peacekeeper, assortId, 4, null,
                `{"_id":"${assortId}","_tpl":"60098ad7c2240c0fe85c570a","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":999999999}}`,
                `[[{"count":302,"_tpl":"5696686a4bdc2da3298b456a"}]]`,
                null);
        }
        {
            let assortId;
            LC.addAssort(LC.traders.mechanic, '5eeca63cbfed7142cb30fccf', 2, null,
                null,
                '[[{"count":2,"_tpl":"5c12620d86f7743f8b198b72"},{"count":2,"_tpl":"5e2aedd986f7746d404f3aa4"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63cbfed7142cb30fc70', 1, null,
                null,
                '[[{"count":2,"_tpl":"56742c324bdc2d150f8b456d"},{"count":3,"_tpl":"5d1b309586f77425227d1676"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63cbfed7142cb30fc8e', 1, null,
                null,
                '[[{"count":5,"_tpl":"5d1b304286f774253763a528"},{"count":1,"_tpl":"5d1b2ffd86f77425243e8d17"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63dbfed7142cb30fd3c', 1, null,
                null,
                '[[{"count":1,"_tpl":"590a386e86f77429692b27ab"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63bbfed7142cb30fac7', 1, null,
                null,
                '[[{"count":5,"_tpl":"5d235b4d86f7742e017bc88a"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63cbfed7142cb30fcc7', 1, null,
                null,
                '[[{"count":2,"_tpl":"60391a8b3364dc22b04d0ce5"},{"count":2,"_tpl":"5d6fc78386f77449d825f9dc"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63bbfed7142cb30face', 2, null,
                null,
                '[[{"count":10,"_tpl":"59faff1d86f7746c51718c9c"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63bbfed7142cb30fa6c', 2, null,
                null,
                '[[{"count":2,"_tpl":"5c1267ee86f77416ec610f72"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63ebfed7142cb30fe63', 2, null,
                null,
                '[[{"count":7,"_tpl":"5d235b4d86f7742e017bc88a"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63cbfed7142cb30fc58', 2, null,
                null,
                '[[{"count":3,"_tpl":"573476d324597737da2adc13"},{"count":2,"_tpl":"573475fb24597737fb1379e1"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63cbfed7142cb30fcd7', 2, null,
                null,
                '[[{"count":2,"_tpl":"573474f924597738002c6174"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63dbfed7142cb30fd2e', 2, null,
                null,
                '[[{"count":1,"_tpl":"5b43575a86f77424f443fe62"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63dbfed7142cb30fd30', 2, null,
                null,
                '[[{"count":1,"_tpl":"590c5c9f86f77477c91c36e7"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63dbfed7142cb30fd38', 2, null,
                null,
                '[[{"count":4,"_tpl":"57347baf24597738002c6178"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63dbfed7142cb30fda6', 2, null,
                null,
                '[[{"count":2,"_tpl":"5734779624597737e04bf329"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63dbfed7142cb30fda8', 2, null,
                null,
                '[[{"count":6,"_tpl":"57347cd0245977445a2d6ff1"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63dbfed7142cb30fdda', 2, null,
                null,
                '[[{"count":3,"_tpl":"5d1c819a86f774771b0acd6c"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63ebfed7142cb30fe05', 2, null,
                null,
                '[[{"count":6,"_tpl":"5d235b4d86f7742e017bc88a"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63ebfed7142cb30fe31', 2, null,
                null,
                '[[{"count":2,"_tpl":"5d1b309586f77425227d1676"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63ebfed7142cb30feb1', 2, null,
                null,
                '[[{"count":1,"_tpl":"5734779624597737e04bf329"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, 'Badger_Ordnance', 2, null, null, null, null);
            LC.addAssort(LC.traders.mechanic, 'SGMT_Mag_Barter', 2, null, null, null, null);
            LC.addAssort(LC.traders.mechanic, '5eeca63bbfed7142cb30fb6c', 2, null, null, null, null);
            LC.addAssort(LC.traders.mechanic, '5eeca63bbfed7142cb30fb91', 3, null,
                null,
                '[[{"count":3,"_tpl":"5c06779c86f77426e00dd782"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63cbfed7142cb30fbe4', 3, null,
                null,
                '[[{"count":18,"_tpl":"573476f124597737e04bf328"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63dbfed7142cb30fd21', 3, '5ae327c886f7745c7b3f2f3f', null, null, null);
            LC.addAssort(LC.traders.mechanic, '5eeca63cbfed7142cb30fc44', 3, '5b47749f86f7746c5d6a5fd4', null, null, null);
            LC.addAssort(LC.traders.mechanic, '5eeca63bbfed7142cb30fb3c', 3, '5b47799d86f7746c5d6a5fd8', null, null, null);
            LC.addAssort(LC.traders.mechanic, '5eeca63cbfed7142cb30fcc5', 3, '5b477b6f86f7747290681823', null, null, null);
            LC.addAssort(LC.traders.mechanic, '5eeca63dbfed7142cb30fd54', 3, null,
                null,
                '[[{"count":1,"_tpl":"5d03775b86f774203e7e0c4b"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63ebfed7142cb30fe4a', 3, null,
                null,
                '[[{"count":4,"_tpl":"5c052fb986f7746b2101e909"},{"count":2,"_tpl":"5c05308086f7746b2101e90b"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63ebfed7142cb30fe78', 3, null,
                null,
                '[[{"count":2,"_tpl":"5d235b4d86f7742e017bc88a"},{"count":2,"_tpl":"5d1b327086f7742525194449"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63ebfed7142cb30fe91', 3, null,
                null,
                '[[{"count":10,"_tpl":"5e2af22086f7746d3f3c33fa"},{"count":4,"_tpl":"5e2af29386f7746d4159f077"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63ebfed7142cb30fe8b', 4, null,
                null,
                '[[{"count":2,"_tpl":"5d0377ce86f774186372f689"},{"count":2,"_tpl":"5d03784a86f774203e7e0c4d"},{"count":3,"_tpl":"5d0376a486f7747d8050965c"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63cbfed7142cb30fbef', 4, null,
                null,
                '[[{"count":20,"_tpl":"59faff1d86f7746c51718c9c"},{"count":20,"_tpl":"5d235b4d86f7742e017bc88a"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63dbfed7142cb30fd74', 4, null,
                null,
                '[[{"count":7,"_tpl":"5d235b4d86f7742e017bc88a"}]]',
                null);
            LC.addAssort(LC.traders.mechanic, '5eeca63ebfed7142cb30fead', 4, null,
                null,
                '[[{"count":4,"_tpl":"5d0377ce86f774186372f689"},{"count":4,"_tpl":"5d0376a486f7747d8050965c"},{"count":4,"_tpl":"5d0378d486f77420421a5ff4"}]]',
                null);
        }
        {
            let assortId;
            LC.addAssort(LC.traders.ragman, '5ece83c101e14e770d58292e', 1, null,
                null,
                '[[{"count":3,"_tpl":"5751435d24597720a27126d1"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c101e14e770d582988', 2, null,
                null,
                '[[{"count":3,"_tpl":"5c13cd2486f774072c757944"},{"count":4,"_tpl":"5c13cef886f774072e618e82"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c201e14e770d5829bc', 2, null,
                null,
                '[[{"count":3,"_tpl":"57347b8b24597737dd42e192"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c201e14e770d5829ce', 2, null,
                null,
                '[[{"count":1,"_tpl":"590c2c9c86f774245b1f03f2"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5e0ac74b9d594972a112a89a', 3, '597a0f5686f774273b74f676', null, null, null);
            LC.addAssort(LC.traders.ragman, '5ece83c101e14e770d58290c', 3, null,
                null,
                '[[{"count":3,"_tpl":"5aa2b923e5b5b000137b7589"},{"count":3,"_tpl":"5ac4c50d5acfc40019262e87"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c101e14e770d582918', 3, null,
                null,
                '[[{"count":5,"_tpl":"5b432c305acfc40019478128"},{"count":6,"_tpl":"5b4326435acfc433000ed01d"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c101e14e770d58291a', 3, null,
                null,
                '[[{"count":7,"_tpl":"5d40412b86f7743cb332ac3a"},{"count":5,"_tpl":"5d4041f086f7743cac3f22a7"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c101e14e770d58297a', 3, null,
                null,
                '[[{"count":4,"_tpl":"5d235b4d86f7742e017bc88a"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c101e14e770d58298c', 3, null,
                null,
                '[[{"count":4,"_tpl":"5c0fa877d174af02a012e1cf"},{"count":1,"_tpl":"5e8f3423fd7471236e6e3b64"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c201e14e770d5829b2', 3, null,
                null,
                '[[{"count":1,"_tpl":"5e2af29386f7746d4159f077"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c201e14e770d5829ea', 3, null,
                null,
                '[[{"count":5,"_tpl":"5d403f9186f7743cac3f229b"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c201e14e770d5829f0', 3, null,
                null,
                '[[{"count":4,"_tpl":"590c2d8786f774245b1f03f3"},{"count":4,"_tpl":"590c311186f77424d1667482"},{"count":1,"_tpl":"5d40419286f774318526545f"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c201e14e770d5829c2', 3, null,
                null,
                '[[{"count":7,"_tpl":"5d235b4d86f7742e017bc88a"}]]',
                null);
            LC.addAssort(LC.traders.ragman, 'RysTFaceShield', 4, null,
                null,
                '[[{"count":4,"_tpl":"59e366c186f7741778269d85"},{"count":1,"_tpl":"57347c5b245977448d35f6e1"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5d34df2788a4504526796d3d', 4, null,
                null,
                '[[{"count":1,"_tpl":"5780cf7f2459777de4559322"},{"count":1,"_tpl":"5a0dc95c86f77452440fc675"},{"count":5,"_tpl":"5c12688486f77426843c7d32"}]]',
                null);
            {
                LC.addAssort(LC.traders.ragman, '5ece83c101e14e770d5828f8', 4, null,
                    null,
                    '[[{"count":3,"_tpl":"59e3639286f7741777737013"}]]',
                    null);
                LC.addAssort(LC.traders.ragman, '5d34df2788a4504526796d02', 4, null,
                    null,
                    '[[{"count":3,"_tpl":"59e3639286f7741777737013"}]]',
                    null);
            }
            LC.addAssort(LC.traders.ragman, '5ece83c101e14e770d5828fc', 4, null,
                null,
                '[[{"side":"Bear","level":30,"count":10,"_tpl":"59f32bb586f774757e1e8442"},{"side":"Usec","level":30,"count":10,"_tpl":"59f32c3b86f77472a31742f0"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c101e14e770d58290e', 4, null,
                null,
                '[[{"count":3,"_tpl":"590de7e986f7741b096e5f32"},{"count":3,"_tpl":"590de71386f774347051a052"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c101e14e770d582916', 4, null,
                null,
                '[[{"count":6,"_tpl":"5d1b31ce86f7742523398394"},{"count":5,"_tpl":"590c2c9c86f774245b1f03f2"},{"count":5,"_tpl":"590c2b4386f77425357b6123"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c101e14e770d58295c', 4, null,
                null,
                '[[{"count":8,"_tpl":"59e3556c86f7741776641ac2"},{"count":2,"_tpl":"5e2af41e86f774755a234b67"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c101e14e770d582966', 4, null,
                null,
                '[[{"count":3,"_tpl":"5d235a5986f77443f6329bc6"},{"count":3,"_tpl":"5734758f24597738025ee253"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c101e14e770d582998', 4, null,
                null,
                '[[{"count":1,"_tpl":"590de7e986f7741b096e5f32"},{"count":10,"_tpl":"573474f924597738002c6174"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c201e14e770d5829cc', 4, null,
                null,
                '[[{"count":6,"_tpl":"590c595c86f7747884343ad7"},{"count":2,"_tpl":"5c12688486f77426843c7d32"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c201e14e770d5829dc', 4, null,
                null,
                '[[{"count":1,"_tpl":"5d235a5986f77443f6329bc6"},{"count":3,"_tpl":"5734758f24597738025ee253"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c201e14e770d5829fe', 4, null,
                null,
                '[[{"count":3,"_tpl":"5e2af41e86f774755a234b67"},{"count":1,"_tpl":"5d403f9186f7743cac3f229b"},{"count":3,"_tpl":"5e2af4a786f7746d3f3c3400"}]]',
                null);
            LC.addAssort(LC.traders.ragman, '5ece83c201e14e770d582a04', 4, null,
                null,
                '[[{"count":2,"_tpl":"5c0e655586f774045612eeb2"},{"count":2,"_tpl":"5e2af41e86f774755a234b67"},{"count":4,"_tpl":"5e2af4d286f7746d4159f07a"}]]',
                null);
        }
        {
            let assortId;
            LC.addAssort(LC.traders.jaeger, '5eeca638bfed7142cb30f88b', 1, null, null, null, null);
            LC.addAssort(LC.traders.jaeger, '5eeca639bfed7142cb30f9eb', 1, null,
                null,
                '[[{"count":12,"_tpl":"57347b8b24597737dd42e192"},{"count":5,"_tpl":"5e2af2bc86f7746d3f3c33fc"}]]',
                null);
            LC.addAssort(LC.traders.jaeger, '5eeca638bfed7142cb30f905', 1, null, null, null, null);
            LC.addAssort(LC.traders.jaeger, '5eeca638bfed7142cb30f8c1', 1, '5bc479e586f7747f376c7da3', null, null, null);
            LC.addAssort(LC.traders.jaeger, '30mmMount', 1, null, null, null, null);
            LC.addAssort(LC.traders.jaeger, 'KibaArmsSPRM', 1, null, null, null, null);
            LC.addAssort(LC.traders.jaeger, '5eeca638bfed7142cb30f96b', 1, null, null, null, null);
            LC.addAssort(LC.traders.jaeger, '5eeca639bfed7142cb30f9d9', 2, null, null, null, null);
            LC.addAssort(LC.traders.jaeger, '5eeca638bfed7142cb30f8cb', 2, '5bc47dbf86f7741ee74e93b9', null, null, null);
            LC.addAssort(LC.traders.jaeger, '5eeca638bfed7142cb30f92e', 2, '5bc47dbf86f7741ee74e93b9', null, null, null);
            LC.addAssort(LC.traders.jaeger, '5eeca638bfed7142cb30f899', 2, '5bc480a686f7741af0342e29', null, null, null);
            LC.addAssort(LC.traders.jaeger, '5eeca638bfed7142cb30f8dd', 2, '5bc480a686f7741af0342e29', null, null, null);
            LC.addAssort(LC.traders.jaeger, '5eeca639bfed7142cb30fa18', 2, null,
                null,
                '[[{"count":1,"_tpl":"5e2af2bc86f7746d3f3c33fc"}]]',
                null);
            LC.addAssort(LC.traders.jaeger, '5eeca639bfed7142cb30fa20', 2, null,
                null,
                '[[{"count":2,"_tpl":"590c639286f774151567fa95"},{"count":4,"_tpl":"5d40407c86f774318526545a"},{"count":2,"_tpl":"57347d7224597744596b4e72"}]]',
                null);
            LC.addAssort(LC.traders.jaeger, '5eeca638bfed7142cb30f8b9', 2, null, null, null, null);
            LC.addAssort(LC.traders.jaeger, '5eeca638bfed7142cb30f8c9', 2, null, null, null, null);
            LC.addAssort(LC.traders.jaeger, '5eeca638bfed7142cb30f885', 3, '5bc4826c86f774106d22d88b', null, null, null);
            LC.addAssort(LC.traders.jaeger, '5eeca638bfed7142cb30f936', 3, '5bc4836986f7740c0152911c', null, null, null);
            LC.addAssort(LC.traders.jaeger, '5eeca638bfed7142cb30f883', 3, null,
                null,
                '[[{"count":2,"_tpl":"590c5d4b86f774784e1b9c45"}]]',
                null);
            LC.addAssort(LC.traders.jaeger, '5eeca638bfed7142cb30f977', 3, null,
                null,
                '[[{"count":12,"_tpl":"5c12688486f77426843c7d32"},{"count":15,"_tpl":"57347c1124597737fb1379e3"},{"count":15,"_tpl":"5734795124597738002c6176"},{"count":15,"_tpl":"590c31c586f774245e3141b2"}]]',
                null);
            LC.addAssort(LC.traders.jaeger, '5eeca639bfed7142cb30f9ef', 3, null,
                null,
                '[[{"count":10,"_tpl":"5bc9c29cd4351e003562b8a3"},{"count":10,"_tpl":"5c0fa877d174af02a012e1cf"},{"count":10,"_tpl":"57347d8724597744596b4e76"}]]',
                null);
            LC.addAssort(LC.traders.jaeger, '5eeca638bfed7142cb30f965', 3, null,
                null,
                '[[{"count":10,"_tpl":"59e3577886f774176a362503"},{"count":6,"_tpl":"5c0fa877d174af02a012e1cf"}]]',
                null);
            assortId = 'witt_muzzle_break_for_mosin_ll4';
            LC.addAssort(LC.traders.jaeger, assortId, 4, '5bc4856986f77454c317bea7',
                `{"_id":"${assortId}","_tpl":"5bc5a35cd4351e450201232f","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":999999999}}`,
                '[[{"count":10426,"_tpl":"5449016a4bdc2d6f028b456f"}]]',
                null);
            assortId = 'mk_18_338_lm_ll4';
            LC.addAssort(LC.traders.jaeger, assortId, 4, 'jaeger_hunter',
                `{"_id":"${assortId}","_tpl":"5fc22d7c187fea44d52eda44","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":99999999}}`,
                '[[{"count":190168,"_tpl":"5449016a4bdc2d6f028b456f"}]]',
                [
                    `{"_id":"${assortId}_grip","_tpl":"57c55efc2459772d2c6271e7","parentId":"${assortId}","slotId":"mod_pistol_grip"}`,
                    `{"_id":"${assortId}_magazine","_tpl":"5fc23426900b1d5091531e15","parentId":"${assortId}","slotId":"mod_magazine"}`,
                    `{"_id":"${assortId}_stock_1","_tpl":"5649be884bdc2d79388b4577","parentId":"${assortId}","slotId":"mod_stock_001"}`,
                    `{"_id":"${assortId}_stock_0","_tpl":"5fc2369685fd526b824a5713","parentId":"${assortId}_stock_1","slotId":"mod_stock_000"}`,
                    `{"_id":"${assortId}_receiver","_tpl":"5fc278107283c4046c581489","parentId":"${assortId}","slotId":"mod_reciever"}`,
                    `{"_id":"${assortId}_barrel","_tpl":"5fc23678ab884124df0cd590","parentId":"${assortId}_receiver","slotId":"mod_barrel"}`,
                    `{"_id":"${assortId}_muzzle","_tpl":"5fc23636016cce60e8341b05","parentId":"${assortId}_barrel","slotId":"mod_muzzle"}`,
                    `{"_id":"${assortId}_gas_block","_tpl":"5fc2360f900b1d5091531e19","parentId":"${assortId}_barrel","slotId":"mod_gas_block"}`,
                    `{"_id":"${assortId}_handguard","_tpl":"5fc235db2770a0045c59c683","parentId":"${assortId}_receiver","slotId":"mod_handguard"}`
                ]);
            LC.addAssort(LC.traders.jaeger, '5eeca639bfed7142cb30f989', 4, null,
                null,
                '[[{"count":1,"_tpl":"575062b524597720a31c09a1"}]]',
                null);
            LC.addAssort(LC.traders.jaeger, '5eeca639bfed7142cb30f98d', 4, null,
                null,
                '[[{"count":2,"_tpl":"57347d5f245977448b40fa81"}]]',
                null);
        }
    }

    static fixBarterTrades() {
        if (!LC.config.fix_barter_trades || !LC.config.fix_barter_trades.enabled) {
            return;
        }
        ;
        let barterTrades = JSON.parse(VFS.readFile(`user\\mods\\tarkov-spp-mod\\db\\barter_trades.json`));
        for (let traderId in barterTrades) {
            let trader = DatabaseServer.tables.traders[traderId];
            let barters = barterTrades[traderId];
            {
                let findNewBarters = function (itemId) {
                    let newBarters = [];
                    for (let barterIdx in barters) {
                        let barter = barters[barterIdx];
                        if (barter.item === itemId) newBarters.push(barter);
                    }
                    return newBarters;
                };
                let isSameBarter = function (arr1, arr2) {
                    let result = false;
                    if (!arr1 && !arr2) {
                        result = true;
                    } else if ((arr1 && !arr2) || (!arr1 && arr2) || (arr1.length !== arr2.length)) {
                        result = false;
                    } else {
                        let targets = arr1.length;
                        for (let idx1 in arr1) {
                            let item1 = arr1[idx1];
                            for (let idx2 in arr2) {
                                let item2 = arr2[idx2];
                                if (item1.count === item2.count && item1._tpl === item2._tpl) {
                                    targets--;
                                }
                            }
                        }
                        result = (targets === 0);
                    }
                    return result;
                };
                let checkBarterAssorts = function () {
                    let items = trader.assort.items;
                    for (let itemIdx in items) {
                        let item = items[itemIdx];
                        if (item.slotId === 'hideout' && trader.assort.barter_scheme[item._id]) {
                            let barterScheme = trader.assort.barter_scheme[item._id][0];
                            let isMoneyTrade = false;
                            for (let barterSchemeIdx in barterScheme) {
                                let barterSchemeChild = barterScheme[barterSchemeIdx];
                                if (barterSchemeChild._tpl === '5449016a4bdc2d6f028b456f'
                                    || barterSchemeChild._tpl === '5696686a4bdc2da3298b456a'
                                    || barterSchemeChild._tpl === '569668774bdc2da2298b4568') {
                                    isMoneyTrade = true;
                                }
                            }
                            if (!isMoneyTrade) {
                                let newBarters = findNewBarters(item._tpl);
                                if (newBarters && newBarters.length > 0) {
                                    let hasSameBarter = false;
                                    for (let newBartersIdx in newBarters) {
                                        let newBarter = newBarters[newBartersIdx];
                                        if (trader.assort.loyal_level_items[item._id] === newBarter.ll
                                            && isSameBarter(barterScheme, newBarter.trade)) {
                                            hasSameBarter = true;
                                        }
                                    }
                                    if (!hasSameBarter) {
                                        ;
                                        ;
                                        for (let newBartersIdx in newBarters) {
                                            let newBarter = newBarters[newBartersIdx];
                                            ;
                                        }
                                    }
                                } else {
                                    trader.assort.loyal_level_items[item._id] = 5;
                                }
                            }
                        }
                    }
                };
                checkBarterAssorts();
            }
            {
                let findBarterAssortId = function (barter) {
                    let assortId;
                    let items = trader.assort.items;
                    for (let itemIdx in items) {
                        let item = items[itemIdx];
                        if (item.slotId === 'hideout' && item._tpl === barter.item) {
                            let barterScheme = trader.assort.barter_scheme[item._id];
                            let isMoneyTrade = false;
                            for (let barterSchemeIdx in barterScheme) {
                                let barterSchemeChild = barterScheme[barterSchemeIdx];
                                for (let barterSchemeChildIdx in barterSchemeChild) {
                                    let barterSchemeTerminal = barterSchemeChild[barterSchemeChildIdx];
                                    if (barterSchemeTerminal._tpl === '5449016a4bdc2d6f028b456f'
                                        || barterSchemeTerminal._tpl === '5696686a4bdc2da3298b456a'
                                        || barterSchemeTerminal._tpl === '569668774bdc2da2298b4568') {
                                        isMoneyTrade = true;
                                    }
                                }
                            }
                            if (!isMoneyTrade) {
                                assortId = item._id;
                                break;
                            }
                        }
                    }
                    return assortId;
                };
                for (let barterIdx in barters) {
                    let barter = barters[barterIdx];
                    let assortId = findBarterAssortId(barter);
                    if (!assortId) {
                        let category = LC.getCategory(barter.item);
                        if ("5b5f78dc86f77409407a7f8e" === category.Id) {
                            ;
                        } else {
                            assortId = 'fixBarter_' + HashUtil.generate();
                            LC.addAssort(trader, assortId, barter.ll, null,
                                `{"_id":"${assortId}","_tpl":"${barter.item}","parentId":"hideout","slotId":"hideout","upd":{"UnlimitedCount":true,"StackObjectsCount":99999999}}`,
                                `[${JSON.stringify(barter.trade)}]`,
                                null);
                        }
                    }
                }
            }
        }
    }

    static fixWeapons() {
        if (!LC.config.fix_weapons || !LC.config.fix_weapons.enabled) {
            return;
        }
        ;
        let weapons = JSON.parse(VFS.readFile(`user\\mods\\tarkov-spp-mod\\db\\weapons.json`));
        for (let id in weapons) {
            let weapon = weapons[id];
            let target = DatabaseServer.tables.templates.items[id];
            for (let field in weapon) {
                target._props[field] = weapon[field];
            }
        }
    }

    static fixMods() {
        if (!LC.config.fix_mods || !LC.config.fix_mods.enabled) {
            return;
        }
        ;
        let mods = JSON.parse(VFS.readFile(`user\\mods\\tarkov-spp-mod\\db\\mods.json`));
        for (let id in mods) {
            let mod = mods[id];
            let target = DatabaseServer.tables.templates.items[id];
            for (let field in mod) {
                target._props[field] = mod[field];
            }
        }
    }

    static fixAmmunitions() {
        if (!LC.config.fix_ammunitions || !LC.config.fix_ammunitions.enabled) {
            return;
        }
        ;
        let ammunitions = JSON.parse(VFS.readFile(`user\\mods\\tarkov-spp-mod\\db\\ammunitions.json`));
        for (let id in ammunitions) {
            let ammunition = ammunitions[id];
            let target = DatabaseServer.tables.templates.items[id];
            for (let field in ammunition) {
                target._props[field] = ammunition[field];
            }
        }
    }

    static fixSniperSkill(sessionID) {
        if (!LC.config.fix_sniper_skill || !LC.config.fix_sniper_skill.enabled) {
            return;
        }
        ;
        if (sessionID) {
            let profile = SaveServer.profiles[sessionID];
            if (profile && profile.characters && profile.characters.pmc
                && profile.characters.pmc.Skills
                && profile.characters.pmc.Skills.Common) {
                const skills = profile.characters.pmc.Skills.Common;
                for (let idx in skills) {
                    const skill = skills[idx];
                    if (skill.Id === 'Sniper' && skill.Progress < 400.0) {
                        skill.Progress = 400.0;
                    }
                }
            }
        }
    }

    static checkInventoryIntegrity(sessionID) {
        if (!LC.config.check_inventory_integrity || !LC.config.check_inventory_integrity.enabled) {
            return;
        }
        ;
        if (sessionID) {
            let profile = SaveServer.profiles[sessionID];
            if (profile && profile.characters && profile.characters.pmc
                && profile.characters.pmc.Inventory
                && profile.characters.pmc.Inventory.items) {
                let items = profile.characters.pmc.Inventory.items;
                let ids = {};
                let idx = items.length;
                while (idx-- > 0) {
                    let item = items[idx];
                    if (item._id) ids[item._id] = item._tpl;
                }
                let toRecover = [];
                idx = items.length;
                while (idx-- > 0) {
                    let item = items[idx];
                    if (item.parentId && !ids[item.parentId]) {
                        delete item.slotId;
                        delete item.location;
                        delete ids[item._id];
                        items.splice(idx, 1);
                        toRecover.push(item);
                    }
                }
                let found = 0;
                do {
                    found = 0;
                    idx = items.length;
                    while (idx-- > 0) {
                        let item = items[idx];
                        if (item.parentId && !ids[item.parentId]) {
                            found++;
                            delete ids[item._id];
                            items.splice(idx, 1);
                            toRecover.push(item);
                        }
                    }
                } while (found > 0);
                if (toRecover.length > 0) {
                    let messageContent = {
                        "text": `${toRecover.length} bugged items are recovered by [SPP]Community mod.`,
                        "type": 13,
                        "maxStorageTime": QuestConfig.redeemTime * 3600
                    };
                    DialogueController.addDialogueMessage("5ac3b934156ae10c4430e83c", messageContent, sessionID, toRecover);
                    ;
                }
            }
        }
    }

    static fixWeather() {
        if (!LC.config.fix_weather || !LC.config.fix_weather.enabled) {
            return;
        }
        ;
        WeatherConfig.weather.rain.min = 0;
        WeatherConfig.weather.rain.max = 2;
        WeatherConfig.weather.fog.max = 0.01;
    }

    static loadConfig() {
        LC.config = JSON.parse(VFS.readFile(`user\\mods\\tarkov-spp-mod\\db\\config.json`));
    }

    static applyDynamicConfig(sessionID, map) {
        LC.loadConfig();
        LC.setPmcSpawns();
        LC.setWaves();
        LC.setBotCount();
        LC.setBotDifficulty(sessionID);
        LC.setBotGear(sessionID);
        LC.setBossChance(sessionID);
        if (LC.config.loot_spawnrate && LC.config.loot_spawnrate.enabled) {
            ;
            LocationConfig.loot_spawnrate = LC.config.loot_spawnrate;
        }
    }

    static setPmcSpawns() {
        const locations = DatabaseServer.tables.locations;
        if (LC.config.location && LC.config.location.enabled) {
            locations.bigmap.base.BotLocationModifier.DistToActivate = LC.config.location.bigmap.DistToActivate;
            locations.bigmap.base.BotLocationModifier.DistToSleep = LC.config.location.bigmap.DistToSleep;
            locations.factory4_day.base.BotLocationModifier.DistToActivate = LC.config.location.factory4_day.DistToActivate;
            locations.factory4_day.base.BotLocationModifier.DistToSleep = LC.config.location.factory4_day.DistToSleep;
            locations.factory4_night.base.BotLocationModifier.DistToActivate = LC.config.location.factory4_night.DistToActivate;
            locations.factory4_night.base.BotLocationModifier.DistToSleep = LC.config.location.factory4_night.DistToSleep;
            locations.interchange.base.BotLocationModifier.DistToActivate = LC.config.location.interchange.DistToActivate;
            locations.interchange.base.BotLocationModifier.DistToSleep = LC.config.location.interchange.DistToSleep;
            locations.laboratory.base.BotLocationModifier.DistToActivate = LC.config.location.laboratory.DistToActivate;
            locations.laboratory.base.BotLocationModifier.DistToSleep = LC.config.location.laboratory.DistToSleep;
            locations.rezervbase.base.BotLocationModifier.DistToActivate = LC.config.location.rezervbase.DistToActivate;
            locations.rezervbase.base.BotLocationModifier.DistToSleep = LC.config.location.rezervbase.DistToSleep;
            locations.shoreline.base.BotLocationModifier.DistToActivate = LC.config.location.shoreline.DistToActivate;
            locations.shoreline.base.BotLocationModifier.DistToSleep = LC.config.location.shoreline.DistToSleep;
            locations.woods.base.BotLocationModifier.DistToActivate = LC.config.location.woods.DistToActivate;
            locations.woods.base.BotLocationModifier.DistToSleep = LC.config.location.woods.DistToSleep;
        }
        if (LC.config.pmc_conversion_chance && LC.config.pmc_conversion_chance.enabled) {
            ;
            let pmcSlots = {
                "bigmap": {
                    "min": 7,
                    "max": 11,
                    "spawn_points": "ZoneBrige,ZoneCrossRoad,ZoneFactorySide,ZoneOldAZS,ZoneBlockPost,ZoneTankSquare,ZoneCustoms,ZoneDormitory,ZoneGasStation,ZoneFactoryCenter,ZoneWade,ZoneScavBase"
                },
                "factory4_day": {"min": 4, "max": 5, "spawn_points": "BotZone"},
                "factory4_night": {"min": 4, "max": 5, "spawn_points": "BotZone"},
                "interchange": {
                    "min": 9,
                    "max": 13,
                    "spawn_points": "ZoneIDEA,ZoneRoad,ZoneCenter,ZoneCenterBot,ZoneOLI,ZoneOLIPark,ZoneGoshan,ZonePowerStation,ZoneTrucks,ZoneIDEAPark"
                },
                "laboratory": {"min": 5, "max": 9, "spawn_points": "BotZoneMain"},
                "rezervbase": {
                    "min": 8,
                    "max": 11,
                    "spawn_points": "ZoneRailStrorage,ZonePTOR1,ZonePTOR2,ZoneBarrack,ZoneBunkerStorage,ZoneSubStorage,ZoneSubCommand"
                },
                "shoreline": {
                    "min": 9,
                    "max": 12,
                    "spawn_points": "ZoneSanatorium,ZonePassFar,ZonePassClose,ZoneTunnel,ZoneStartVillage,ZoneBunker,ZoneGreenHouses,ZoneIsland,ZoneGasStation,ZoneMeteoStation,ZonePowerStation,ZoneBusStation,ZoneRailWays,ZonePort,ZoneForestTruck,ZoneForestSpawn"
                },
                "woods": {
                    "min": 7,
                    "max": 13,
                    "spawn_points": "ZoneClearVill,ZoneScavBase2,ZoneRedHouse,ZoneHighRocks,ZoneWoodCutter,ZoneHouse,ZoneBigRocks,ZoneRoad,ZoneMiniHouse,ZoneBrokenVill"
                }
            }
            let me = this;
            let findBoss = function (map, name) {
                let ret = null;
                for (let bossIdx in locations[map].base.BossLocationSpawn) {
                    const boss = locations[map].base.BossLocationSpawn[bossIdx];
                    if (boss.BossName === name) {
                        ret = boss;
                        break;
                    }
                }
                return ret;
            };
            let setBossZone = function (map) {
                let bossZone = null;
                let boss = null;
                switch (map) {
                    case 'bigmap':
                        boss = findBoss(map, 'bossBully');
                        break;
                    case 'interchange':
                        boss = findBoss(map, 'bossKilla');
                        break;
                    case 'rezervbase':
                        boss = findBoss(map, 'bossGluhar');
                        break;
                    case 'shoreline':
                        boss = findBoss(map, 'bossSanitar');
                        break;
                    case 'woods':
                        boss = findBoss(map, 'bossKojaniy');
                        break;
                    default:
                }
                if (boss) {
                    const zones = boss.BossZone.split(',');
                    bossZone = zones[LC.getRandomInt(0, zones.length)];
                    boss.BossZone = bossZone;
                    if (LC.config.pmc_conversion_chance.peek_spawn) {
                        Logger.log(`${map} : ${boss.BossName} at ${bossZone}`, "yellow", "blue");
                    }
                }
                return bossZone;
            };
            let setPmcSlots = function (map, as_boss) {
                let slots = LC.getRandomIntInclusive(pmcSlots[map].min, pmcSlots[map].max);
                let availableZones = pmcSlots[map].spawn_points.split(',');
                const consumeZone = function (zone) {
                    let zoneIdx = availableZones.indexOf(zone);
                    if (zoneIdx >= 0) {
                        availableZones.splice(zoneIdx, 1);
                    }
                };
                consumeZone(setBossZone(map));
                const pickPmcZone = function () {
                    if (availableZones.length === 0) availableZones = pmcSlots[map].spawn_points.split(',');
                    let zone = availableZones[LC.getRandomInt(0, availableZones.length)];
                    consumeZone(zone);
                    return zone;
                };
                if (as_boss) {
                    let spawn = locations[map].base.BossLocationSpawn;
                    while (slots > 0) {
                        let rnd = LC.getRandomInt(0, 100);
                        let groupSize = 1;
                        if (99 <= rnd) {
                            groupSize = 5;
                        } else if (98 <= rnd) {
                            groupSize = 4;
                        } else if (95 <= rnd) {
                            groupSize = 3;
                        } else if (60 <= rnd) {
                            groupSize = 2;
                        }
                        groupSize = Math.min(groupSize, slots);
                        slots = slots - groupSize;
                        const zone = pickPmcZone();
                        if (LC.config.pmc_conversion_chance.peek_spawn) {
                            Logger.log(`${map} : PMC group of ${groupSize} at ${zone}`, "yellow", "blue");
                        }
                        spawn.push({
                            "BossName": "cursedAssault",
                            "BossChance": 100,
                            "BossZone": zone,
                            "BossPlayer": false,
                            "BossDifficult": "impossible",
                            "BossEscortType": "cursedAssault",
                            "BossEscortDifficult": "impossible",
                            "BossEscortAmount": (groupSize - 1).toString(),
                            "Time": map === 'interchange' ? 60 : IMMEDIATE_SPAWN
                        });
                    }
                } else {
                    let waves = locations[map].base.waves;
                    for (let i = 0; i < slots; i++) {
                        const zone = pickPmcZone();
                        waves.unshift({
                            "number": 0,
                            "time_min": map === 'interchange' ? 60 : IMMEDIATE_SPAWN,
                            "time_max": map === 'interchange' ? 60 : IMMEDIATE_SPAWN,
                            "slots_min": 1,
                            "slots_max": 1,
                            "SpawnPoints": zone,
                            "BotSide": "Savage",
                            "BotPreset": "normal",
                            "WildSpawnType": "cursedAssault",
                            "isPlayers": false
                        });
                    }
                }
            };
            if (LC.config.pmc_conversion_chance.as_assault) {
                for (let locationName in LC.backup.waves) {
                    let location = locations[locationName].base;
                    location.waves = JSON.parse(LC.backup.waves[locationName]);
                    setPmcSlots(locationName, false);
                }
            } else if (LC.config.pmc_conversion_chance.as_boss) {
                for (let locationName in LC.backup.boss) {
                    let location = locations[locationName].base;
                    location.BossLocationSpawn = JSON.parse(LC.backup.boss[locationName]);
                    setPmcSlots(locationName, true);
                }
            } else if (!LC.config.pmc_conversion_chance.adaptive) {
                setPmcSlots("factory4_day", true);
                setPmcSlots("factory4_night", true);
                setPmcSlots("laboratory", true);
            }
        }
    }

    static setWaves() {
        if (!LC.config.bot_waves || !LC.config.bot_waves.enabled) {
            return
        }
        ;
        const bot_waves = LC.config.bot_waves;
        ;
        DatabaseServer.tables.bots.core.WAVE_ONLY_AS_ONLINE = bot_waves.as_online;
        DatabaseServer.tables.globals.config.WAVE_COEF_LOW = bot_waves.low;
        DatabaseServer.tables.globals.config.WAVE_COEF_MID = bot_waves.medium;
        DatabaseServer.tables.globals.config.WAVE_COEF_HIGH = bot_waves.high;
        DatabaseServer.tables.globals.config.WAVE_COEF_HORDE = bot_waves.horde;
    }

    static setBotCount() {
        if (!LC.config.bot_count || !LC.config.bot_count.enabled) {
            return;
        }
        ;
        const bot_count = LC.config.bot_count;
        ;
        ;
        DatabaseServer.tables.globals.config.MaxBotsAliveOnMap = bot_count.max_alive_bots;
        DatabaseServer.tables.bots.core.LOCAL_BOTS_COUNT = bot_count.local_bots_count;
    }

    static setBotDifficulty(sessionID) {
        if (!LC.config.bot_difficulty || !LC.config.bot_difficulty.enabled) {
            return;
        }
        ;
        const bot_difficulty = LC.config.bot_difficulty;
        DatabaseServer.tables.bots.core.MAX_WARNS_BEFORE_KILL = 0;
        InraidConfig.raidMenuSettings.aiDifficulty = LC.config.bot_difficulty.default_raid_difficulty;
        const assault = JSON.parse(LC.backup.bots.assault);
        const assaultgroup = JSON.parse(LC.backup.bots.assaultgroup);
        const bear = JSON.parse(LC.backup.bots.bear);
        const bossbully = JSON.parse(LC.backup.bots.bossbully);
        const bossgluhar = JSON.parse(LC.backup.bots.bossgluhar);
        const bosskilla = JSON.parse(LC.backup.bots.bosskilla);
        const bosskojaniy = JSON.parse(LC.backup.bots.bosskojaniy);
        const bosssanitar = JSON.parse(LC.backup.bots.bosssanitar);
        const cursedassault = JSON.parse(LC.backup.bots.cursedassault);
        const followerbully = JSON.parse(LC.backup.bots.followerbully);
        const followergluharassault = JSON.parse(LC.backup.bots.followergluharassault);
        const followergluharscout = JSON.parse(LC.backup.bots.followergluharscout);
        const followergluharsecurity = JSON.parse(LC.backup.bots.followergluharsecurity);
        const followergluharsnipe = JSON.parse(LC.backup.bots.followergluharsnipe);
        const followerkojaniy = JSON.parse(LC.backup.bots.followerkojaniy);
        const followersanitar = JSON.parse(LC.backup.bots.followersanitar);
        const marksman = JSON.parse(LC.backup.bots.marksman);
        const playerscav = JSON.parse(LC.backup.bots.playerscav);
        const pmcbot = JSON.parse(LC.backup.bots.pmcbot);
        const sectantpriest = JSON.parse(LC.backup.bots.sectantpriest);
        const sectantwarrior = JSON.parse(LC.backup.bots.sectantwarrior);
        const usec = JSON.parse(LC.backup.bots.usec);
        const targetBotTypes = [assaultgroup, bossbully, bossgluhar, bosskilla, bosskojaniy, bosssanitar,
            cursedassault, followerbully, followergluharassault, followergluharscout, followergluharsecurity,
            followergluharsnipe, followerkojaniy, followersanitar, playerscav, pmcbot, sectantpriest, sectantwarrior];
        for (let botTypeIdx in targetBotTypes) {
            const botType = targetBotTypes[botTypeIdx];
            botType.difficulty.easy = JSON.parse(JSON.stringify(assault.difficulty.easy));
            botType.difficulty.normal = JSON.parse(JSON.stringify(assault.difficulty.normal));
        }
        bear.difficulty = {
            "easy": JSON.parse(VFS.readFile(`user\\mods\\tarkov-spp-mod\\db\\pmc_difficulty_easy.json`)),
            "normal": JSON.parse(VFS.readFile(`user\\mods\\tarkov-spp-mod\\db\\pmc_difficulty_normal.json`)),
            "hard": JSON.parse(VFS.readFile(`user\\mods\\tarkov-spp-mod\\db\\pmc_difficulty_hard.json`)),
            "impossible": JSON.parse(VFS.readFile(`user\\mods\\tarkov-spp-mod\\db\\pmc_difficulty_impossible.json`))
        };
        usec.difficulty = JSON.parse(JSON.stringify(bear.difficulty));
        if (bot_difficulty.raider_ai_for_scav && !LC.isNewbie(sessionID)) {
            ;
            assault.difficulty = JSON.parse(JSON.stringify(assaultgroup.difficulty));
        }
        DatabaseServer.tables.bots.types.assault = assault;
        DatabaseServer.tables.bots.types.assaultgroup = assaultgroup;
        DatabaseServer.tables.bots.types.bear = bear;
        DatabaseServer.tables.bots.types.bossbully = bossbully;
        DatabaseServer.tables.bots.types.bossgluhar = bossgluhar;
        DatabaseServer.tables.bots.types.bosskilla = bosskilla;
        DatabaseServer.tables.bots.types.bosskojaniy = bosskojaniy;
        DatabaseServer.tables.bots.types.bosssanitar = bosssanitar;
        DatabaseServer.tables.bots.types.cursedassault = cursedassault;
        DatabaseServer.tables.bots.types.followerbully = followerbully;
        DatabaseServer.tables.bots.types.followergluharassault = followergluharassault;
        DatabaseServer.tables.bots.types.followergluharscout = followergluharscout;
        DatabaseServer.tables.bots.types.followergluharsecurity = followergluharsecurity;
        DatabaseServer.tables.bots.types.followergluharsnipe = followergluharsnipe;
        DatabaseServer.tables.bots.types.followerkojaniy = followerkojaniy;
        DatabaseServer.tables.bots.types.followersanitar = followersanitar;
        DatabaseServer.tables.bots.types.marksman = marksman;
        DatabaseServer.tables.bots.types.playerscav = playerscav;
        DatabaseServer.tables.bots.types.pmcbot = pmcbot;
        DatabaseServer.tables.bots.types.sectantpriest = sectantpriest;
        DatabaseServer.tables.bots.types.sectantwarrior = sectantwarrior;
        DatabaseServer.tables.bots.types.usec = usec;
        DatabaseServer.tables.bots.types.assault.chances.equipment.Headwear = bot_difficulty.scav_helmet_chance;
        DatabaseServer.tables.bots.types.assault.chances.equipment.ArmorVest = bot_difficulty.scav_armor_chance;
        DatabaseServer.tables.bots.types.usec.chances.equipment.Headwear =
            DatabaseServer.tables.bots.types.bear.chances.equipment.Headwear = bot_difficulty.pmc_helmet_chance;
        DatabaseServer.tables.bots.types.usec.chances.equipment.Earpiece =
            DatabaseServer.tables.bots.types.bear.chances.equipment.Earpiece = bot_difficulty.pmc_earpiece_chance;
        DatabaseServer.tables.bots.types.usec.chances.equipment.ArmorVest =
            DatabaseServer.tables.bots.types.bear.chances.equipment.ArmorVest = bot_difficulty.pmc_armor_chance;
        DatabaseServer.tables.bots.types.usec.chances.equipment.Backpack =
            DatabaseServer.tables.bots.types.bear.chances.equipment.Backpack = bot_difficulty.pmc_backpack_chance;
        DatabaseServer.tables.bots.types.usec.chances.mods.mod_equipment_000 =
            DatabaseServer.tables.bots.types.bear.chances.mods.mod_equipment_000 = bot_difficulty.pmc_helmet_side;
        DatabaseServer.tables.bots.types.usec.chances.mods.mod_equipment_001 =
            DatabaseServer.tables.bots.types.bear.chances.mods.mod_equipment_001 = bot_difficulty.pmc_helmet_visor;
        DatabaseServer.tables.bots.types.usec.chances.mods.mod_equipment_002 =
            DatabaseServer.tables.bots.types.bear.chances.mods.mod_equipment_002 = bot_difficulty.pmc_helmet_mount;
        DatabaseServer.tables.bots.types.usec.chances.mods.nvg =
            DatabaseServer.tables.bots.types.bear.chances.mods.nvg = bot_difficulty.pmc_helmet_nvg;
        DatabaseServer.tables.bots.types.bear.generation.items.magazines.min =
            DatabaseServer.tables.bots.types.usec.generation.items.magazines.min = 3;
        DatabaseServer.tables.bots.types.bear.generation.items.magazines.max =
            DatabaseServer.tables.bots.types.usec.generation.items.magazines.max = 4;
        DatabaseServer.tables.bots.types.bear.generation.items.healing.min =
            DatabaseServer.tables.bots.types.usec.generation.items.healing.min = 2;
        DatabaseServer.tables.bots.types.bear.generation.items.healing.max =
            DatabaseServer.tables.bots.types.usec.generation.items.healing.max = 2;
        let bodyParts_regular = '{"Head":{"min":35,"max":35},"Chest":{"min":85,"max":85},"Stomach":{"min":70,"max":70},"LeftArm":{"min":60,"max":60},"RightArm":{"min":60,"max":60},"LeftLeg":{"min":65,"max":65},"RightLeg":{"min":65,"max":65}}';
        let bodyParts_boosted = '{"Head":{"min":35,"max":35},"Chest":{"min":150,"max":150},"Stomach":{"min":120,"max":120},"LeftArm":{"min":100,"max":100},"RightArm":{"min":100,"max":100},"LeftLeg":{"min":110,"max":110},"RightLeg":{"min":110,"max":110}}';
        DatabaseServer.tables.bots.types.assault.BodyParts = JSON.parse(bodyParts_regular);
        DatabaseServer.tables.bots.types.assaultgroup.BodyParts = JSON.parse(bodyParts_regular);
        if (LC.config.bot_difficulty.pmc_hp_boost) {
            DatabaseServer.tables.bots.types.bear.BodyParts = JSON.parse(bodyParts_boosted);
            DatabaseServer.tables.bots.types.usec.BodyParts = JSON.parse(bodyParts_boosted);
        } else {
            DatabaseServer.tables.bots.types.bear.BodyParts = JSON.parse(bodyParts_regular);
            DatabaseServer.tables.bots.types.usec.BodyParts = JSON.parse(bodyParts_regular);
        }
    }

    static setBotGear(sessionID) {
        if (!LC.config.bot_difficulty || !LC.config.bot_difficulty.enabled) {
            return;
        }
        ;
        const geared_scav = LC.config.bot_difficulty.geared_scav;
        ;
        const pmcBotInven = DatabaseServer.tables.bots.types.pmcbot.inventory;
        const usecInven = DatabaseServer.tables.bots.types.usec.inventory;
        const bearInven = DatabaseServer.tables.bots.types.bear.inventory;
        const assaultInven = DatabaseServer.tables.bots.types.assault.inventory;
        const pmcBotItems = pmcBotInven.items;
        const usecItems = usecInven.items;
        const bearItems = bearInven.items;
        const assaultItems = assaultInven.items;
        const pmcBotEquip = pmcBotInven.equipment;
        const usecEquip = usecInven.equipment;
        const bearEquip = bearInven.equipment;
        const assaultEquip = assaultInven.equipment;
        const head_c0 = ["5aa2b9ede5b5b000137b758b", "59e7708286f7742cbd762753", "5bd073c986f7747f627e796c", "5ab8f20c86f7745cdb629fb2", "5b4329075acfc400153b78ff",
            "5b432b2f5acfc4771e1c6622"];
        const head_c3 = ["5a7c4850e899ef00150be885", "5aa7cfc0e5b5b00015693143", "5c06c6a80db834001b735491"];
        const head_c4 = ["5c0e874186f7745dc7616606", "5f60b34a41e30a4ab12a6947", "5e00c1ad86f774747333222c", "5c17a7ed2e2216152142459c", "5a154d5cfcdbcb001a3b00da",
            "5aa7e4a4e5b5b000137b76f2", "5aa7e454e5b5b0214e506fa2", "5ea17ca01412a1425304d1c0", "5e4bfc1586f774264f7582d3", "5d5e7d28a4b936645d161203"];
        const head_c5 = ["5f60c74e3b85f6263c145586", "5aa7e276e5b5b000171d0647"];
        const head_c6 = ["5ca20ee186f774799474abc2"];
        const armor_c2 = ["59e7635f86f7742cbf2c1095"];
        const armor_c3 = ["5ab8e4ed86f7742d8e50c7fa", "59e7635f86f7742cbf2c1095", "5c0e5edb86f77461f55ed1f7", "5b44d22286f774172b0c9de8"];
        const armor_c4 = ["5c0e57ba86f7747fa141986d", "5c0e655586f774045612eeb2", "5c0e53c886f7747fa54205c7"];
        const armor_c5 = ["5c0e541586f7747fa54205c9", "5f5f41476bdad616ad46d631", "5b44d0de86f774503d30cba8", "5ab8e79e86f7742d8b372e78", "5e9dacf986f774054d6b89f4"];
        const armor_c6 = ["5fd4c474dd870108a754b241", "5e4abb5086f77406975c9342", "6038b4b292ec1c3103795a0b", "6038b4ca92ec1c3103795a0d", "545cdb794bdc2d3a198b456a"];
        const rig_06 = ["572b7adb24597762ae139821", "5fd4c5477a8d854fa0105061"];
        const rig_08 = ["5d5d8ca986f7742798716522", "5fd4c4fa16cac650092f6771", "5e4abc1f86f774069619fbaa"];
        const rig_10 = ["6034d0230ca681766b6a0fb5", "59e7643b86f7742cbf2c109a"];
        const rig_16 = ["6034cf5fffd42c541047f72e", "5fd4c60f875c30179f5d04c2", "5f5f41f56760b4138443b352", "5b44c8ea86f7742d1627baf1", "5c0e9f2c86f77432297fe0a3",
            "5ca20abf86f77418567a43f2", "5d5d85c586f774279a21cbdb"];
        const rig_20 = ["603648ff5a45383c122086ac", "6040dd4ddcf9592f401632d2", "592c2d1a86f7746dbe2af32a", "5ab8dab586f77441cd04f2a2", "5648a69d4bdc2ded0b8b457b",
            "5df8a42886f77412640e2e75", "5c0e6a1586f77404597b4965"];
        const rig_c4 = ["5d5d646386f7742797261fd9", "5c0e446786f7742013381639", "5ab8dced86f774646209ec87", "5c0e722886f7740458316a57", "544a5caa4bdc2d1a388b4568",
            "5d5d87f786f77427997cfaef", "5c0e746986f7741453628fe5"];
        const rig_c5 = ["5b44cad286f77402a54ae7e5", "5e4ac41886f77406a511c9a8"];
        if (geared_scav && !LC.isNewbie(sessionID)) {
            assaultEquip.Headwear = [];
            assaultEquip.Headwear = assaultEquip.Headwear.concat(LC.getRandomList(head_c0, 15));
            assaultEquip.Headwear = assaultEquip.Headwear.concat(LC.getRandomList(head_c3, 45));
            assaultEquip.Headwear = assaultEquip.Headwear.concat(LC.getRandomList(head_c4, 35));
            assaultEquip.Headwear = assaultEquip.Headwear.concat(LC.getRandomList(head_c5, 5));
            assaultEquip.ArmorVest = [];
            assaultEquip.ArmorVest = assaultEquip.ArmorVest.concat(LC.getRandomList(armor_c3, 15));
            assaultEquip.ArmorVest = assaultEquip.ArmorVest.concat(LC.getRandomList(armor_c4, 60));
            assaultEquip.ArmorVest = assaultEquip.ArmorVest.concat(LC.getRandomList(armor_c5, 20));
            assaultEquip.ArmorVest = assaultEquip.ArmorVest.concat(LC.getRandomList(armor_c6, 5));
            assaultEquip.TacticalVest = [];
            assaultEquip.TacticalVest = assaultEquip.TacticalVest.concat(LC.getRandomList(rig_06, 5));
            assaultEquip.TacticalVest = assaultEquip.TacticalVest.concat(LC.getRandomList(rig_08, 5));
            assaultEquip.TacticalVest = assaultEquip.TacticalVest.concat(LC.getRandomList(rig_10, 10));
            assaultEquip.TacticalVest = assaultEquip.TacticalVest.concat(LC.getRandomList(rig_16, 25));
            assaultEquip.TacticalVest = assaultEquip.TacticalVest.concat(LC.getRandomList(rig_20, 25));
            assaultEquip.TacticalVest = assaultEquip.TacticalVest.concat(LC.getRandomList(rig_c4, 20));
            assaultEquip.TacticalVest = assaultEquip.TacticalVest.concat(LC.getRandomList(rig_c5, 10));
        } else {
            assaultEquip.Headwear = [];
            assaultEquip.Headwear = assaultEquip.Headwear.concat(LC.getRandomList(head_c0, 30));
            assaultEquip.Headwear = assaultEquip.Headwear.concat(LC.getRandomList(head_c3, 60));
            assaultEquip.Headwear = assaultEquip.Headwear.concat(LC.getRandomList(head_c4, 10));
            assaultEquip.ArmorVest = [];
            assaultEquip.ArmorVest = assaultEquip.ArmorVest.concat(LC.getRandomList(armor_c2, 30));
            assaultEquip.ArmorVest = assaultEquip.ArmorVest.concat(LC.getRandomList(armor_c3, 30));
            assaultEquip.ArmorVest = assaultEquip.ArmorVest.concat(LC.getRandomList(armor_c4, 40));
            assaultEquip.TacticalVest = [];
            assaultEquip.TacticalVest = assaultEquip.TacticalVest.concat(LC.getRandomList(rig_06, 10));
            assaultEquip.TacticalVest = assaultEquip.TacticalVest.concat(LC.getRandomList(rig_08, 10));
            assaultEquip.TacticalVest = assaultEquip.TacticalVest.concat(LC.getRandomList(rig_10, 10));
            assaultEquip.TacticalVest = assaultEquip.TacticalVest.concat(LC.getRandomList(rig_16, 25));
            assaultEquip.TacticalVest = assaultEquip.TacticalVest.concat(LC.getRandomList(rig_20, 15));
            assaultEquip.TacticalVest = assaultEquip.TacticalVest.concat(LC.getRandomList(rig_c4, 30));
        }
        bearItems.TacticalVest = [
            "5448be9a4bdc2dfd2f8b456a", "5e32f56fcb6d5863cc5e5ee4", "5710c24ad2720bc3458b45a3", "5a2a57cfc4a2826c6e06d44a",
            "5e831507ea0a7c419c2f9bd9", "5e8488fa988a8701445df1e4", "5c0e530286f7747fa1419862", "544fb37f4bdc2dee738b4567",
            "5c10c8fd86f7743d7d706df3", "5755383e24597772cb798966", "5af0548586f7743a532b7e99", "5751a25924597722c463c472",
            "590c678286f77426c9660122", "544fb45d4bdc2dee738b4568", "60098ad7c2240c0fe85c570a", "5af0454c86f7746bf20992e8",
            "590c657e86f77412b013051d", "5751a89d24597722aa0e8db0", "544fb3f34bdc2d03748b456a"
        ];
        usecItems.TacticalVest = JSON.parse(JSON.stringify(bearItems.TacticalVest));
        bearItems.Pockets = [
            "590c678286f77426c9660122", "60098ad7c2240c0fe85c570a", "5e8488fa988a8701445df1e4", "5c0e530286f7747fa1419862"
        ];
        usecItems.Pockets = JSON.parse(JSON.stringify(bearItems.Pockets));
        bearItems.SecuredContainer = [
            "59e0d99486f7744a32234762", "5c925fa22e221601da359b7b", "54527ac44bdc2d36668b4567", "59e6906286f7746c9f75e847", "59e690b686f7746c9f75e848",
            "58dd3ad986f77403051cba8f", "5a6086ea4f39f99cd479502f", "5a608bf24f39f98ffc77720e", "5cc80f53e4a949000e1ea4f8", "5cc80f38e4a949001152b560",
            "5cc80f67e4a949035e43bbba", "59e77a2386f7742ee578960a", "5cadf6eeae921500134b2799", "56dff026d2720bb8668b4567", "56dff061d2720bb5668b4567",
            "57a0e5022459774d1673f889", "5c0d688c86f77413ae3407b2", "5c0d668f86f7747ccb7f13b2", "560d61e84bdc2da74d8b4571", "5ba2678ad4351e44f824b344",
            "5ba26835d4351e0035628ff5", "5d6e6806a4b936088465b17e", "5d6e68a8a4b9360b6c0d54e2", "5c0d5e4486f77478390952fe", "573719df2459775a626ccbc2"
        ];
        usecItems.SecuredContainer = JSON.parse(JSON.stringify(bearItems.SecuredContainer));
        const addWeapon = function (itemId, slot, includeRaider) {
            if (includeRaider && !pmcBotEquip[slot].includes(itemId)) pmcBotEquip[slot].push(itemId);
            if (!bearEquip[slot].includes(itemId)) bearEquip[slot].push(itemId);
            if (!usecEquip[slot].includes(itemId)) usecEquip[slot].push(itemId);
        };
        const removeWeapon = function (itemId, slot, includeRaider) {
            let idx;
            if (includeRaider) {
                idx = pmcBotEquip[slot].indexOf(itemId);
                if (idx >= 0) pmcBotEquip[slot].splice(idx, 1);
            }
            idx = bearEquip[slot].indexOf(itemId);
            if (idx >= 0) bearEquip[slot].splice(idx, 1);
            idx = usecEquip[slot].indexOf(itemId);
            if (idx >= 0) usecEquip[slot].splice(idx, 1);
        };
        const setMods = function (itemId, mods, includeRaider) {
            if (includeRaider) pmcBotInven.mods[itemId] = JSON.parse(mods);
            bearInven.mods[itemId] = JSON.parse(mods);
            usecInven.mods[itemId] = JSON.parse(mods);
        };
        bearEquip.Headwear = [];
        bearEquip.Headwear = bearEquip.Headwear.concat(LC.getRandomList(head_c0, 7));
        bearEquip.Headwear = bearEquip.Headwear.concat(LC.getRandomList(head_c3, 28));
        bearEquip.Headwear = bearEquip.Headwear.concat(LC.getRandomList(head_c4, 56));
        bearEquip.Headwear = bearEquip.Headwear.concat(LC.getRandomList(head_c5, 6));
        bearEquip.Headwear = bearEquip.Headwear.concat(LC.getRandomList(head_c6, 3));
        usecEquip.Headwear = JSON.parse(JSON.stringify(bearEquip.Headwear));
        setMods('5c0e874186f7745dc7616606', '{"mod_equipment":["5c0919b50db834001b7ce3b9"]}', false);
        setMods('5f60b34a41e30a4ab12a6947', '{"mod_equipment_000":["5f60c076f2bcbb675b00dac2"],"mod_nvg":["5f60bf4558eff926626a60f2"],"mod_equipment_002":["5f60b85bbdb8e27dee3dc985"]}', false);
        setMods('5e00c1ad86f774747333222c', '{"mod_equipment_000":["5e00cfa786f77469dc6e5685"],"mod_equipment_001":["5e00cdd986f7747473332240"]}', false);
        setMods('5c17a7ed2e2216152142459c', '{"mod_equipment_000":["5a16b7e1fcdbcb00165aa6c9"],"mod_equipment_001":["5c178a942e22164bef5ceca3"]}', false);
        setMods('5a154d5cfcdbcb001a3b00da', '{"mod_equipment_000":["5a16badafcdbcb001865f72d"],"mod_nvg":["5ea058e01dbce517f324b3e2"]}', false);
        setMods('5aa7e4a4e5b5b000137b76f2', '{"mod_equipment":["5aa7e3abe5b5b000171d064d"]}', false);
        setMods('5aa7e454e5b5b0214e506fa2', '{"mod_equipment":["5aa7e3abe5b5b000171d064d"]}', false);
        setMods('5ea17ca01412a1425304d1c0', '{"mod_nvg":["5ea18c84ecf1982c7712d9a2"]}', false);
        setMods('5e4bfc1586f774264f7582d3', '{"mod_nvg":["5a16b8a9fcdbcb00165aa6ca"]}', false);
        setMods('5d5e7d28a4b936645d161203', '{"mod_nvg":["5a16b8a9fcdbcb00165aa6ca"]}', false);
        setMods('5f60c74e3b85f6263c145586', '{"mod_equipment":["5f60c85b58eff926626a60f7"]}', false);
        setMods('5aa7e276e5b5b000171d0647', '{"mod_equipment":["5aa7e373e5b5b000137b76f0"]}', false);
        setMods('5ca20ee186f774799474abc2', '{"mod_equipment":["5ca2113f86f7740b2547e1d2"]}', false);
        setMods('5ea058e01dbce517f324b3e2', '{"mod_nvg":["5a16b8a9fcdbcb00165aa6ca"]}', false);
        setMods('5a16b8a9fcdbcb00165aa6ca', '{"mod_nvg":["5c0695860db834001b735461"]}', false);
        setMods('5c0695860db834001b735461', '{"mod_nvg":["5c0696830db834001d23f5da"]}', false);
        bearEquip.Eyewear = [
            "59e770b986f7742cbd762754", "5aa2b986e5b5b00014028f4c", "5b432be65acfc433000ed01f", "5c0d32fcd174af02a1659c75",
            "5d6d2ef3a4b93618084f58bd", "5d6d2e22a4b9361bd5780d05", "5d5fca1ea4b93635fd598c07", "5c1a1cc52e221602b3136e3d",
            "557ff21e4bdc2d89578b4586", "5aa2b9aee5b5b00015693121", "603409c80ca681766b6a0fb2"
        ];
        usecEquip.Eyewear = JSON.parse(JSON.stringify(bearEquip.Eyewear));
        bearEquip.Earpiece = [
            "5b432b965acfc47a8774094e", "6033fa48ffd42c541047f728", "5645bcc04bdc2d363b8b4572", "5aa2ba71e5b5b000137b758f", "5c165d832e2216398b5a7e36"
        ];
        usecEquip.Earpiece = JSON.parse(JSON.stringify(bearEquip.Earpiece));
        bearEquip.ArmorVest = [];
        bearEquip.ArmorVest = bearEquip.ArmorVest.concat(LC.getRandomList(armor_c4, 27));
        bearEquip.ArmorVest = bearEquip.ArmorVest.concat(LC.getRandomList(armor_c5, 53));
        bearEquip.ArmorVest = bearEquip.ArmorVest.concat(LC.getRandomList(armor_c6, 15));
        usecEquip.ArmorVest = JSON.parse(JSON.stringify(bearEquip.ArmorVest));
        bearEquip.TacticalVest = [];
        bearEquip.TacticalVest = bearEquip.TacticalVest.concat(LC.getRandomList(rig_16, 25));
        bearEquip.TacticalVest = bearEquip.TacticalVest.concat(LC.getRandomList(rig_20, 40));
        bearEquip.TacticalVest = bearEquip.TacticalVest.concat(LC.getRandomList(rig_c4, 12));
        bearEquip.TacticalVest = bearEquip.TacticalVest.concat(LC.getRandomList(rig_c5, 23));
        usecEquip.TacticalVest = JSON.parse(JSON.stringify(bearEquip.TacticalVest));
        bearEquip.Backpack = [
            "5f5e467b0bc58666c37e7821", "5b44c6ae86f7742d1627baea", "545cdae64bdc2d39198b4568", "5d5d940f86f7742797262046",
            "6034d2d697633951dc245ea6", "5c0e805e86f774683f3dd637", "59e763f286f7742ee57895da", "5ab8ebf186f7742d8b372e80",
            "5f5e46b96bdad616ad46d613", "5c0e774286f77468413cc5b2", "5df8a4d786f77412672a1e3b"
        ];
        usecEquip.Backpack = JSON.parse(JSON.stringify(bearEquip.Backpack));
        const ump45_base = '{"mod_magazine":["5fc3e466187fea44d52eda90"],"mod_scope":["591c4efa86f7741030027726"],"mod_stock":["5fc3e4ee7283c4046c5814af"],"mod_barrel":["5fc3e4a27283c4046c5814ab"],"mod_mount_000":["5fc53954f8b6a877a729eaeb"],"mod_mount_001":["5fc5396e900b1d5091531e72"],"mod_mount_002":["5fc5396e900b1d5091531e72"]}';
        addWeapon("5fc3e272f8b6a877a729eac5", "FirstPrimaryWeapon", false);
        setMods("5fc3e272f8b6a877a729eac5", ump45_base, false);
        const vector45_base = '{"mod_sight_front":["5fb6567747ce63734e3fa1dc"],"mod_sight_rear":["5fb6564947ce63734e3fa1da"],"mod_stock":["5fb6558ad6f0b2136f2d7eb7"],"mod_barrel":["5fb65363d1409e5ca04b54f5"],"mod_mount":["5fbb976df9986c4cff3fe5f2"],"mod_mount_001":["5fce0f9b55375d18a253eff2"],"mod_mount_002":["5fce0f9b55375d18a253eff2"],"mod_scope":["57ae0171245977343c27bfcf"],"mod_magazine":["5fb651dc85f90547f674b6f4"]}';
        const vector45_barrel = '{"mod_muzzle":["5fb6548dd1409e5ca04b54f9"]}';
        addWeapon("5fb64bc92b1b027b1f50bcf2", "FirstPrimaryWeapon", false);
        setMods("5fb64bc92b1b027b1f50bcf2", vector45_base, false);
        setMods("5fb65363d1409e5ca04b54f5", vector45_barrel, false);
        const vector9_base = '{"mod_sight_front":["5fb6567747ce63734e3fa1dc"],"mod_sight_rear":["5fb6564947ce63734e3fa1da"],"mod_stock":["5fb6558ad6f0b2136f2d7eb7"],"mod_barrel":["5fbbc366ca32ed67276c1557"],"mod_mount":["5fbb976df9986c4cff3fe5f2"],"mod_mount_001":["5fce0f9b55375d18a253eff2"],"mod_mount_002":["5fce0f9b55375d18a253eff2"],"mod_scope":["57ae0171245977343c27bfcf"],"mod_magazine":["5a7ad2e851dfba0016153692","5a718f958dc32e00094b97e7"]}';
        const vector9_barrel = '{"mod_muzzle":["5fbbc34106bde7524f03cbe9"]}';
        addWeapon("5fc3f2d5900b1d5091531e57", "FirstPrimaryWeapon", false);
        setMods("5fc3f2d5900b1d5091531e57", vector9_base, false);
        setMods("5fbbc366ca32ed67276c1557", vector9_barrel, false);
        const mcx_base = '{"mod_pistol_grip":["5fbcbd6c187fea44d52eda14"],"mod_magazine":["55d4887d4bdc2d962f8b4570","5c6d46132e221601da357d56","544a37c44bdc2d25388b4567"],"mod_reciever":["5fbcc3e4d6fa9c00c571bb58"],"mod_stock":["5fbcc437d724d907e2077d5c"],"mod_charge":["5fbcc640016cce60e8341acc"]}';
        const mcx_receiver = '{"mod_barrel":["5fbbfacda56d053a3543f799"],"mod_handguard":["5fbc226eca32ed67276c155d"],"mod_sight_rear":["5fc0fa957283c4046c58147e"],"mod_scope":["57ae0171245977343c27bfcf"]}';
        const mcx_barrel = '{"mod_gas_block":["5fbc210bf24b94483f726481"],"mod_muzzle":["5fbc22ccf24b94483f726483"]}';
        const mcx_muzzle = '{"mod_muzzle_000":["5fbcbd10ab884124df0cd563"],"mod_muzzle_001":["5fbe760793164a5b6278efc8"]}';
        const mcx_handguard = '{"mod_sight_front": ["5fc0fa362770a0045c59c677"]}';
        addWeapon("5fbcc1d9016cce60e8341ab3", "FirstPrimaryWeapon", false);
        setMods("5fbcc1d9016cce60e8341ab3", mcx_base, false);
        setMods("5fbcc3e4d6fa9c00c571bb58", mcx_receiver, false);
        setMods("5fbbfacda56d053a3543f799", mcx_barrel, false);
        setMods("5fbc22ccf24b94483f726483", mcx_muzzle, false);
        setMods("5fbc226eca32ed67276c155d", mcx_handguard, false);
        const mk18_base = '{"mod_pistol_grip":["57c55efc2459772d2c6271e7"],"mod_magazine":["5fc23426900b1d5091531e15"],"mod_stock_001":["5649be884bdc2d79388b4577"],"mod_reciever":["5fc278107283c4046c581489"]}';
        const mk18_stock_001 = '{"mod_stock_000":["5fc2369685fd526b824a5713"]}';
        const mk18_receiver = '{"mod_scope":["5c0517910db83400232ffee5"],"mod_barrel":["5fc23678ab884124df0cd590"],"mod_handguard":["5fc235db2770a0045c59c683"],"mod_sight_rear":[]}';
        const mk18_barrel = '{"mod_muzzle":["5fc23636016cce60e8341b05"],"mod_gas_block":["5fc2360f900b1d5091531e19"]}';
        addWeapon("5fc22d7c187fea44d52eda44", "FirstPrimaryWeapon", false);
        setMods("5fc22d7c187fea44d52eda44", mk18_base, false);
        setMods("5649be884bdc2d79388b4577", mk18_stock_001, false);
        setMods("5fc278107283c4046c581489", mk18_receiver, false);
        setMods("5fc23678ab884124df0cd590", mk18_barrel, false);
        const five_seven_base = '{"mod_barrel":["5d3eb5b6a4b9361eab311902"],"mod_reciever":["5d3eb44aa4b93650d64e4979"],"mod_magazine":["5d3eb5eca4b9363b1f22f8e4"],' +
            '"mod_tactical":["56def37dd2720bec348b456a"]}';
        const five_seven_receiver = '{"mod_sight_rear":["5d3eb4aba4b93650d64e497d"],"mod_sight_front":["5d3eb536a4b9363b1f22f8e2"]}';
        addWeapon("5d3eb3b0a4b93615055e84d2", "Holster", false);
        setMods("5d3eb3b0a4b93615055e84d2", five_seven_base, false);
        setMods("5d3eb44aa4b93650d64e4979", five_seven_receiver, false);
        const pl15_base = '{"mod_barrel":["602a95edda11d6478d5a06da","602a95fe4e02ce1eaa358729"],"mod_reciever":["60228924961b8d75ee233c32"],"mod_magazine":["602286df23506e50807090c6"],"mod_tactical":["56def37dd2720bec348b456a"]}';
        const pl15_thr_barrel = '{"mod_muzzle":["5c7e8fab2e22165df16b889b"]}';
        const pl15_receiver = '{"mod_sight_rear":["602293f023506e50807090cb"],"mod_sight_front":["60228a850ddce744014caf69"]}';
        addWeapon("602a9740da11d6478d5a06dc", "Holster", false);
        setMods("602a9740da11d6478d5a06dc", pl15_base, false);
        setMods("602a95fe4e02ce1eaa358729", pl15_thr_barrel, false);
        setMods("60228924961b8d75ee233c32", pl15_receiver, false);
        removeWeapon('5a7828548dc32e5a9c28b516', 'FirstPrimaryWeapon', false);
        {
            const ammo = {
                "12ga": {"cartridges": ["5d6e6806a4b936088465b17e", "5d6e68a8a4b9360b6c0d54e2"]},
                "20ga": {"cartridges": ["5d6e6a5fa4b93614ec501745"]},
                "23ga": {"cartridges": ["5e85a9a6eacf8c039e4e2ac1", "5f647f31b6238e5dd066e196"]},
                "9x18": {"cartridges": ["57372140245977611f70ee91", "573719df2459775a626ccbc2"]},
                "9x19": {"cartridges": ["56d59d3ad2720bdb418b4577", "5c925fa22e221601da359b7b", "5efb0da7a29a85116f6ea05f"]},
                "9x21": {"cartridges": ["5a269f97c4a282000b151807", "5a26ac0ec4a28200741e1e18"]},
                "9x39": {"cartridges": ["57a0e5022459774d1673f889", "5c0d668f86f7747ccb7f13b2"]},
                ".45": {"cartridges": ["5efb0cabfb3e451d70735af5"]},
                "4.6x30": {"cartridges": ["5ba2678ad4351e44f824b344", "5ba26835d4351e0035628ff5"]},
                "5.45x39": {"cartridges": ["56dff061d2720bb5668b4567", "56dff026d2720bb8668b4567", "5c0d5e4486f77478390952fe"]},
                "5.56x45": {"cartridges": ["59e6906286f7746c9f75e847", "54527ac44bdc2d36668b4567", "59e690b686f7746c9f75e848"]},
                ".300": {"cartridges": ["5fd20ff893a8961fc660a954"]},
                "5.7x28": {"cartridges": ["5cc80f53e4a949000e1ea4f8", "5cc80f67e4a949035e43bbba", "5cc80f38e4a949001152b560"]},
                ".366": {"cartridges": ["59e655cb86f77411dc52a77b", "5f0596629e22f464da6bbdd9"]},
                "7.62x39": {"cartridges": ["5656d7c34bdc2d9d198b4587", "59e0d99486f7744a32234762"]},
                "7.62x51": {"cartridges": ["58dd3ad986f77403051cba8f", "5a608bf24f39f98ffc77720e", "5a6086ea4f39f99cd479502f"]},
                "7.62x54R": {"cartridges": ["5887431f2459777e1612938f", "560d61e84bdc2da74d8b4571"]},
                "12.7x55": {"cartridges": ["5cadf6eeae921500134b2799"]},
                ".338": {"cartridges": ["5fc275cf85fd526b824a571a", "5fc382a9d724d907e2077dab"]}
            }
            const addItem = function (itemId) {
                if (!pmcBotInven.items.TacticalVest.includes(itemId)) {
                    pmcBotInven.items.TacticalVest.push(itemId);
                }
                if (!pmcBotInven.items.SecuredContainer.includes(itemId)) {
                    pmcBotInven.items.SecuredContainer.push(itemId);
                }
                if (!usecItems.TacticalVest.includes(itemId))
                    usecItems.TacticalVest.push(itemId);
                if (!usecItems.SecuredContainer.includes(itemId))
                    usecItems.SecuredContainer.push(itemId);
                if (!bearItems.TacticalVest.includes(itemId))
                    bearItems.TacticalVest.push(itemId);
                if (!bearItems.SecuredContainer.includes(itemId))
                    bearItems.SecuredContainer.push(itemId);
            };
            const setCartridges = function (cartridge, ammoList) {
                setMods(cartridge, JSON.stringify(ammoList), true);
                addItem(cartridge);
                for (let ammoIdx in ammoList) addItem(ammoList[ammoIdx]);
            };
            const removeMagazine = function (magazine, alternative, botType) {
                if (botType) {
                    for (let modId in botType.inventory.mods) {
                        const mod = botType.inventory.mods[modId];
                        if (mod.mod_magazine) {
                            const magIdx = mod.mod_magazine.indexOf(magazine);
                            if (magIdx >= 0) {
                                if (mod.mod_magazine.length > 1) {
                                    mod.mod_magazine.splice(magIdx, 1);
                                } else {
                                    mod.mod_magazine.splice(magIdx, 1, alternative);
                                }
                            }
                        }
                    }
                    delete botType.inventory.mods[magazine];
                    const vestIdx = botType.inventory.items.TacticalVest.indexOf(magazine);
                    if (vestIdx >= 0) botType.inventory.items.TacticalVest.splice(vestIdx, 1);
                    const pocketIdx = botType.inventory.items.Pockets.indexOf(magazine);
                    if (pocketIdx >= 0) botType.inventory.items.Pockets.splice(pocketIdx, 1);
                    const scIdx = botType.inventory.items.SecuredContainer.indexOf(magazine);
                    if (scIdx >= 0) botType.inventory.items.SecuredContainer.splice(scIdx, 1);
                } else {
                    removeMagazine(magazine, alternative, DatabaseServer.tables.bots.types.pmcbot);
                    removeMagazine(magazine, alternative, DatabaseServer.tables.bots.types.bear);
                    removeMagazine(magazine, alternative, DatabaseServer.tables.bots.types.usec);
                }
            };
            removeMagazine('5448c1d04bdc2dff2f8b4569', '5aaa5dfee5b5b000140293d3');
            removeMagazine('5998529a86f774647f44f421', '5c0672ed0db834001b7353f3');
            removeMagazine('5c0673fb0db8340023300271', '5c0672ed0db834001b7353f3');
            removeMagazine('5df8f535bb49d91fb446d6b0', '5a3501acc4a282000d72293a');
            removeMagazine('5c503ac82e221602b21d6e9a', '5c503ad32e2216398b5aada2');
            removeMagazine('5c5db6552e2216001026119d', '5c5db6652e221600113fba51');
            removeMagazine('5de8e8dafd6b4e6e2276dc32', '5de8eac42a78646d96665d91');
            removeMagazine('5d2f213448f0355009199284', '5926c3b286f774640d189b6b');
            removeMagazine('55d4837c4bdc2d1d4e8b456c', '5bed61680db834001d2c45ab');
            removeMagazine('5aaa5e60e5b5b000140293d6', '5aaa5dfee5b5b000140293d3');
            removeMagazine('5b7bef1e5acfc43d82528402', '5b7bef5d5acfc43bca7067a3');
            removeMagazine('57838f0b2459774a256959b2', '57838f9f2459774a150289a0');
            removeMagazine('587df3a12459772c28142567', '587df583245977373c4f1129');
            removeMagazine('59e5d83b86f7745aed03d262', '5ac66bea5acfc43b321d4aec');
            removeMagazine('5b1fd4e35acfc40018633c39', '5ac66bea5acfc43b321d4aec');
            removeMagazine('5de8eaadbbaf010b10528a6d', '5de8eac42a78646d96665d91');
            removeMagazine('5de8ea8ffd6b4e6e2276dc35', '5de8eac42a78646d96665d91');
            removeMagazine('5ba264f6d4351e0034777d52', '5ba26586d4351e44f824b340');
            removeMagazine('5a7882dcc5856700177af662', '5a78830bc5856700137e4c90');
            setCartridges('57616a9e2459773c7a400234', ammo['12ga']);
            setCartridges('5a78830bc5856700137e4c90', ammo['12ga']);
            setCartridges('55d485804bdc2d8c2f8b456b', ammo['12ga']);
            setCartridges('5a38ed75c4a28232996e40c6', ammo['20ga']);
            setCartridges('5c6161fb2e221600113fbde5', ammo['20ga']);
            setCartridges('5f647d9f8499b57dc40ddb93', ammo['23ga']);
            setCartridges('57d1519e24597714373db79d', ammo['9x18']);
            setCartridges('5c0672ed0db834001b7353f3', ammo['9x19']);
            setCartridges('599860ac86f77436b225ed1a', ammo['9x19']);
            setCartridges('5a718f958dc32e00094b97e7', ammo['9x19']);
            setCartridges('5a7ad2e851dfba0016153692', ammo['9x19']);
            setCartridges('5a718da68dc32e000d46d264', ammo['9x19']);
            setCartridges('5a718b548dc32e000d46d262', ammo['9x19']);
            setCartridges('5c5db6742e2216000f1b2852', ammo['9x19']);
            setCartridges('5c5db6652e221600113fba51', ammo['9x19']);
            setCartridges('5de8eac42a78646d96665d91', ammo['9x19']);
            setCartridges('576a5ed62459771e9c2096cb', ammo['9x19']);
            setCartridges('5a351711c4a282000b1521a4', ammo['9x19']);
            setCartridges('5926c3b286f774640d189b6b', ammo['9x19']);
            setCartridges('602286df23506e50807090c6', ammo['9x19']);
            setCartridges('59f99a7d86f7745b134aa97b', ammo['9x21']);
            setCartridges('5a9e81fba2750c00164f6b11', ammo['9x39']);
            setCartridges('57838f9f2459774a150289a0', ammo['9x39']);
            setCartridges('5fc3e466187fea44d52eda90', ammo['.45']);
            setCartridges('5fb651dc85f90547f674b6f4', ammo['.45']);
            setCartridges('5ba2657ed4351e0035628ff2', ammo['4.6x30']);
            setCartridges('5ba26586d4351e44f824b340', ammo['4.6x30']);
            setCartridges('5d3eb5eca4b9363b1f22f8e4', ammo['5.7x28']);
            setCartridges('5cc70093e4a949033c734312', ammo['5.7x28']);
            setCartridges('55d482194bdc2d1d4e8b456b', ammo['5.45x39']);
            setCartridges('5aaa4194e5b5b055d06310a5', ammo['5.45x39']);
            setCartridges('5bed61680db834001d2c45ab', ammo['5.45x39']);
            setCartridges('55d480c04bdc2d1d4e8b456a', ammo['5.45x39']);
            setCartridges('564ca99c4bdc2d16268b4589', ammo['5.45x39']);
            setCartridges('544a37c44bdc2d25388b4567', ammo['.300']);
            setCartridges('55d4887d4bdc2d962f8b4570', ammo['.300']);
            setCartridges('5c6d46132e221601da357d56', ammo['.300']);
            setCartridges('55802d5f4bdc2dac148b458e', ammo['5.56x45']);
            setCartridges('59c1383d86f774290a37e0ca', ammo['5.56x45']);
            setCartridges('5c05413a0db834001c390617', ammo['5.56x45']);
            setCartridges('5d1340b3d7ad1a0b52682ed7', ammo['5.56x45']);
            setCartridges('5c6d450c2e221600114c997d', ammo['5.56x45']);
            setCartridges('5d1340cad7ad1a0b0b249869', ammo['5.56x45']);
            setCartridges('5aaa5dfee5b5b000140293d3', ammo['5.56x45']);
            setCartridges('5ac66c5d5acfc4001718d314', ammo['5.56x45']);
            setCartridges('5c0548ae0db834001966a3c2', ammo['5.56x45']);
            setCartridges('5c6d42cb2e2216000e69d7d1', ammo['5.56x45']);
            setCartridges('5de653abf76fdc1ce94a5a2a', ammo['.366']);
            setCartridges('59fafc5086f7740dbe19f6c3', ammo['.366']);
            setCartridges('59fafc9386f774067d462453', ammo['.366']);
            setCartridges('5a01c29586f77474660c694c', ammo['7.62x39']);
            setCartridges('5cfe8010d7ad1a59283b14c6', ammo['7.62x39']);
            setCartridges('5ac66bea5acfc43b321d4aec', ammo['7.62x39']);
            setCartridges('5e21a3c67e40bd02257a008a', ammo['7.62x39']);
            setCartridges('59d625f086f774661516605d', ammo['7.62x39']);
            setCartridges('5a0060fc86f7745793204432', ammo['7.62x39']);
            setCartridges('59d6272486f77466146386ff', ammo['7.62x39']);
            setCartridges('5c5970672e221602b21d7855', ammo['7.62x39']);
            setCartridges('587df583245977373c4f1129', ammo['7.62x39']);
            setCartridges('5a3501acc4a282000d72293a', ammo['7.62x51']);
            setCartridges('5df8f541c41b2312ea3335e3', ammo['7.62x51']);
            setCartridges('5c503ad32e2216398b5aada2', ammo['7.62x51']);
            setCartridges('5aaf8a0be5b5b00015693243', ammo['7.62x51']);
            setCartridges('5addccf45acfc400185c2989', ammo['7.62x51']);
            setCartridges('5d25a6538abbc306c62e630d', ammo['7.62x51']);
            setCartridges('5d25a7b88abbc3054f3e60bc', ammo['7.62x51']);
            setCartridges('5b7bef9c5acfc43d102852ec', ammo['7.62x51']);
            setCartridges('5b7bef5d5acfc43bca7067a3', ammo['7.62x51']);
            setCartridges('5b099ac65acfc400186331e1', ammo['7.62x51']);
            setCartridges('5888988e24597752fe43a6fa', ammo['7.62x51']);
            setCartridges('5df25b6c0b92095fd441e4cf', ammo['7.62x51']);
            setCartridges('5addcce35acfc4001a5fc635', ammo['7.62x51']);
            setCartridges('5bae13ded4351e44f824bf38', ammo['7.62x54R']);
            setCartridges('559ba5b34bdc2d1f1a8b4582', ammo['7.62x54R']);
            setCartridges('5c88f24b2e22160bc12c69a6', ammo['7.62x54R']);
            setCartridges('5c471c442e221602b542a6f8', ammo['7.62x54R']);
            setCartridges('5caf1109ae9215753c44119f', ammo['12.7x55']);
            setCartridges('5fc23426900b1d5091531e15', ammo['.338']);
            const setExclusiveMags = function (weaponId, allowedMags, replacementMags, botType) {
                if (botType) {
                    if (botType.inventory.mods[weaponId] && botType.inventory.mods[weaponId].mod_magazine) {
                        botType.inventory.mods[weaponId].mod_magazine = JSON.parse(JSON.stringify(allowedMags));
                    }
                    for (let modId in botType.inventory.mods) {
                        if (modId === weaponId) continue;
                        const mod = botType.inventory.mods[modId];
                        if (mod.mod_magazine) {
                            for (let magIdx in allowedMags) {
                                const target = allowedMags[magIdx];
                                const replacement = replacementMags[magIdx];
                                let testIdx = mod.mod_magazine.indexOf(target);
                                if (testIdx >= 0) mod.mod_magazine.splice(testIdx, 1, replacement);
                            }
                        }
                    }
                } else {
                    setExclusiveMags(weaponId, allowedMags, replacementMags, DatabaseServer.tables.bots.types.pmcbot);
                    setExclusiveMags(weaponId, allowedMags, replacementMags, DatabaseServer.tables.bots.types.bear);
                    setExclusiveMags(weaponId, allowedMags, replacementMags, DatabaseServer.tables.bots.types.usec);
                }
            };
            setExclusiveMags('59e6687d86f77411d949b251',
                ['59fafc5086f7740dbe19f6c3', '59fafc9386f774067d462453'],
                ['5a0060fc86f7745793204432', '5a0060fc86f7745793204432']
            );
            setExclusiveMags('5fbcc1d9016cce60e8341ab3',
                ['544a37c44bdc2d25388b4567', '55d4887d4bdc2d962f8b4570', '5c6d46132e221601da357d56'],
                ['59c1383d86f774290a37e0ca', '5c6d42cb2e2216000e69d7d1', '5c05413a0db834001c390617']
            );
        }
    }

    static setBossChance(sessionID) {
        if (!LC.config.boss_chance || !LC.config.boss_chance.enabled) {
            return;
        }
        ;
        const boss_chance = LC.config.boss_chance;
        if (boss_chance.adaptive && sessionID &&
            SaveServer.profiles[sessionID].characters &&
            SaveServer.profiles[sessionID].characters.pmc) {
            let quests = SaveServer.profiles[sessionID].characters.pmc.Quests;
            quest_loop: for (let idx in quests) {
                if (quests[idx].status === 'Started') {
                    let qid = quests[idx].qid;
                    switch (qid) {
                        case '5d25e2c386f77443e7549029':
                        case '5d25e43786f7740a212217fa':
                            ;
                            boss_chance.bossBully = 100;
                            break;
                        case '5d25e2e286f77444001e2e48':
                        case '5dc53acb86f77469c740c893':
                            ;
                            boss_chance.bossKilla = 100;
                            break;
                        case '5d25e44f86f77443e625e385':
                            ;
                            boss_chance.bossGluhar = 100;
                            break;
                        case '5edab4b1218d181e29451435':
                            ;
                            boss_chance.bossSanitar = 100;
                            break;
                        case '5d25e2ee86f77443e35162ea':
                        case '5d25e4ca86f77409dd5cdf2c':
                        case '600302d73b897b11364cd161':
                            ;
                            boss_chance.bossKojaniy = 100;
                            break;
                    }
                }
            }
        }
        const locations = DatabaseServer.tables.locations;
        for (let locationIdx in locations) {
            const location = locations[locationIdx];
            if (location.base && location.base.BossLocationSpawn) {
                for (let bossIdx in location.base.BossLocationSpawn) {
                    const boss = location.base.BossLocationSpawn[bossIdx];
                    switch (boss.BossName) {
                        case 'sectantPriest':
                        case 'bossSanitar':
                        case 'bossBully':
                        case 'bossKilla':
                        case 'bossGluhar':
                        case 'bossKojaniy':
                            boss.BossChance = boss_chance[boss.BossName];
                            break;
                        default:
                    }
                }
            }
        }
    }

    static setPmcConversionChance(map, sessionID) {
        if (!LC.config.pmc_conversion_chance || !LC.config.pmc_conversion_chance.enabled) {
            return;
        }
        ;
        let percent = LC.getRandomIntInclusive(LC.config.pmc_conversion_chance.from, LC.config.pmc_conversion_chance.to);
        let isCompleted = function (quest, cid) {
            return quest.completedConditions.includes(cid);
        };
        if (LC.config.pmc_conversion_chance.as_assault || LC.config.pmc_conversion_chance.as_boss) {
            percent = 0;
        } else if (LC.config.pmc_conversion_chance.adaptive) {
            let quests = SaveServer.profiles[sessionID].characters.pmc.Quests;
            let correction = 0;
            for (let idx in quests) {
                let quest = quests[idx];
                if (quest.status === 'Started') {
                    let qid = quest.qid;
                    if (qid === '59ca264786f77445a80ed044' && 'shoreline' === map && !isCompleted(quest, '59ca27f786f77445aa0ddc14')) {
                        ;
                        correction = 50;
                    } else if (qid === '59ca29fb86f77445ab465c87' && !isCompleted(quest, '5c922dde86f77438500a0fec')) {
                        ;
                        correction = 40;
                    } else if (qid === '59ca2eb686f77445a80ed049' && !isCompleted(quest, '59ca2fba86f77445e4732b25')) {
                        ;
                        correction = 50;
                    } else if (qid === '5c0d190cd09282029f5390d8') {
                        ;
                        correction = 50;
                    } else if (qid === '5c0bd01e86f7747cdd799e56') {
                        ;
                        correction = 50;
                    } else if (qid === '5c0bd94186f7747a727f09b2') {
                        ;
                        correction = 34;
                    } else if (qid === '596b455186f77457cb50eccb') {
                        ;
                        correction = 34;
                    } else if (qid === '5a27c99a86f7747d2c6bdd8e' && !isCompleted(quest, '5be0198686f774595412d9c4')) {
                        ;
                        correction = 50;
                    } else if (qid === '5b4795fb86f7745876267770' && 'interchange' === map && !isCompleted(quest, '5c923d3d86f774556e08d7a5')) {
                        ;
                        correction = 34;
                    } else if (qid === '5c0bc91486f7746ab41857a2' && !isCompleted(quest, '5c0bcc9c86f7746fe16dbba9')) {
                        ;
                        correction = 34;
                    } else if (qid === '5c1234c286f77406fa13baeb' && 'bigmap' === map) {
                        ;
                        correction = 100;
                    } else if (qid === '5c0bde0986f77479cf22c2f8' &&
                        (
                            ('woods' === map && !isCompleted(quest, '5c0bdf2c86f7746f016734a8')) ||
                            ('rezervbase' === map && !isCompleted(quest, '5c137b8886f7747ae3220ff4')) ||
                            ('shoreline' === map && !isCompleted(quest, '5c137ef386f7747ae10a821e')) ||
                            ('bigmap' === map && !isCompleted(quest, '5c137f5286f7747ae267d8a3'))
                        )
                    ) {
                        ;
                        correction = 'shoreline' === map ? 40 : 34;
                    } else if (qid === '5d25d2c186f77443e35162e5') {
                        ;
                        correction = 34;
                    } else if (qid === '5d25e2b486f77409de05bba0' && ('factory4_day' === map || 'factory4_night' === map)) {
                        ;
                        correction = 34;
                    } else if (qid === '5d25e2d886f77442734d335e') {
                        ;
                        correction = 50;
                    } else if (qid === '5d25e44386f77409453bce7b' && 'bigmap' === map) {
                        ;
                        correction = 34;
                    } else if (qid === '5bc47dbf86f7741ee74e93b9') {
                        ;
                        correction = 50;
                    } else if (qid === '5bc4856986f77454c317bea7') {
                        ;
                        correction = 50;
                    } else if (qid === '5bc4893c86f774626f5ebf3e' && 'woods' === map) {
                        ;
                        correction = 50;
                    }
                }
            }
            if (correction > 0) {
                percent = correction;
            }
        }
        ;
        if (LC.config.pmc_conversion_chance.apply_assault_group) {
            BotConfig.pmc.types.assaultGroup = percent;
        } else {
            BotConfig.pmc.types.assaultGroup = 100;
        }
        BotConfig.pmc.types.assault = percent;
        BotConfig.pmc.types.pmcBot = percent;
    }

    static getCategory(itemId) {
        let ret = null;
        let item = null;
        let categories = DatabaseServer.tables.templates.handbook.Categories;
        let items = DatabaseServer.tables.templates.handbook.Items;
        for (let itemIdx in items) {
            if (items[itemIdx].Id === itemId) {
                item = items[itemIdx];
                break;
            }
        }
        if (item) {
            let findCategory = function (id) {
                let rr = null;
                for (let catIdx in categories) {
                    if (categories[catIdx].Id === id) rr = categories[catIdx];
                }
                return rr;
            };
            let cat = findCategory(item.ParentId);
            let lastCat = null;
            while (cat) {
                lastCat = cat;
                cat = findCategory(cat.ParentId);
            }
            if (lastCat) ret = lastCat;
        }
        return ret;
    }

    static hideAssort(trader, assortId) {
        LC.addAssort(trader, assortId, 5, null, null, null, null);
    }

    static addAssort(trader, assortId, ll, questId, item, barter, mods) {
        if (item) trader.assort.items.push(JSON.parse(item));
        if (barter) trader.assort.barter_scheme[assortId] = JSON.parse(barter);
        if (ll) trader.assort.loyal_level_items[assortId] = ll;
        if (questId) trader.questassort.success[assortId] = questId;
        if (mods) mods.forEach(mod => trader.assort.items.push(JSON.parse(mod)));
    }

    static findAssort(trader, itemId, findMoneyTrade) {
        let assortId;
        let items = trader.assort.items;
        for (let itemIdx in items) {
            let item = items[itemIdx];
            if (item.slotId === 'hideout' && item._tpl === itemId) {
                let barterScheme = trader.assort.barter_scheme[item._id];
                let hasMoneyTrade = false;
                let hasBarterTrade = false;
                for (let barterSchemeIdx in barterScheme) {
                    let barterSchemeChild = barterScheme[barterSchemeIdx];
                    for (let barterSchemeChildIdx in barterSchemeChild) {
                        let barterSchemeTerminal = barterSchemeChild[barterSchemeChildIdx];
                        if (barterSchemeTerminal._tpl === '5449016a4bdc2d6f028b456f'
                            || barterSchemeTerminal._tpl === '5696686a4bdc2da3298b456a'
                            || barterSchemeTerminal._tpl === '569668774bdc2da2298b4568') {
                            hasMoneyTrade = true;
                        } else {
                            hasBarterTrade = true;
                        }
                    }
                }
                if (findMoneyTrade && hasMoneyTrade && !hasBarterTrade) {
                    assortId = item._id;
                    break;
                } else if (!findMoneyTrade && !hasMoneyTrade) {
                    assortId = item._id;
                    break;
                }
            }
        }
        return assortId;
    };

    static getHandbookPrice(id) {
        let ret = DatabaseServer.tables.templates.items[id]._props.CreditsPrice;
        const handbook = DatabaseServer.tables.templates.handbook.Items;
        for (let idx in handbook) {
            let item = handbook[idx];
            if (item.Id === id) {
                ret = item.Price;
                break;
            }
        }
        return ret;
    }

    static setHandbookPrice(id, price) {
        const handbook = DatabaseServer.tables.templates.handbook.Items;
        for (let idx in handbook) {
            let item = handbook[idx];
            if (item.Id === id) {
                item.Price = price;
                break;
            }
        }
    }

    static isNewbie(sessionID) {
        let newbie = false;
        if (sessionID) {
            let profile = SaveServer.profiles[sessionID];
            newbie = profile && profile.characters && profile.characters.pmc && profile.characters.pmc.Info.Level < 10;
        }
        return newbie;
    }

    static validateItemId(itemId) {
        return !!DatabaseServer.tables.locales.global.en.templates[barter.item];
    }

    static getRandomList(source, length) {
        const ret = [];
        for (let idx = 0; idx < length; idx++) {
            ret.push(source[LC.getRandomInt(0, source.length)]);
        }
        return ret;
    };

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
        console.log(`LC Debug> ${msg}`);
    }

    static log(msg) {
        Logger.log(`LC> ${msg}`, `white`, `blue`);
    }
}

module.exports.LC = LC;
