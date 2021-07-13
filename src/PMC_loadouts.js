"use strict";

class PMC_loadouts
{
	constructor()
	{
		this.mod = "[SPP]PMC bots loadout mod";
		Logger.info("Randomize bots loadout");
		ModLoader.onLoad["PMC_loadouts"] = require("../src/PMC_loadouts.js").onLoadMod;
	}
	
	static onLoadMod()
	{
		// Constants
		const Config = JsonUtil.deserialize(VFS.readFile(`user\\mods\\tarkov-spp-mod\\db\\pmc_loadout.json`));
		const Items = DatabaseServer.tables.templates.items;
		const Bots = DatabaseServer.tables.bots.types;
		const HeadWearMaxLevel = (Config.HeadwearMaxLevel + 1)
		const HeadWearMinLevel = (Config.HeadwearMinLevel - 1)
		const ArmoredVestMaxLevel = (Config.ArmoredVestMaxLevel + 1)
		const ArmoredVestMinLevel = (Config.ArmoredVestMinLevel - 1)
		const BlacklistHeadwear = Config.BlacklistEquipment.BlacklistHeadwear
		const BlacklistEarpiece = Config.BlacklistEquipment.BlacklistEarpiece
		const BlacklistFaceCover = Config.BlacklistEquipment.BlacklistFaceCover
		const BlacklistArmorVests = Config.BlacklistEquipment.BlacklistArmorVests
		const BlacklistEyewear = Config.BlacklistEquipment.BlacklistEyewear
		const BlacklistArmbands = Config.BlacklistEquipment.BlacklistArmbands
		const BlacklistRigs = Config.BlacklistEquipment.BlacklistRigs
		const BlacklistBackpacks = Config.BlacklistEquipment.BlacklistBackpacks
		const BlacklistWeap = Config.BlacklistEquipment.BlacklistWeap
		const BlacklistItems = Config.BlacklistEquipment.BlacklistItems
		
		for (const botType in DatabaseServer.tables.bots.types) {
			if (botType === "usec" || botType === "bear") {
				// empty inventory slots
				Bots[botType].inventory.equipment.Headwear = [];
				Bots[botType].inventory.equipment.Earpiece = [];
				Bots[botType].inventory.equipment.FaceCover = [];
				Bots[botType].inventory.equipment.ArmorVest = [];
				Bots[botType].inventory.equipment.Eyewear = [];
				Bots[botType].inventory.equipment.ArmBand = [];
				Bots[botType].inventory.equipment.TacticalVest = [];
				Bots[botType].inventory.equipment.Backpack = [];
				Bots[botType].inventory.equipment.FirstPrimaryWeapon = [];
				Bots[botType].inventory.equipment.SecondPrimaryWeapon = [];
				Bots[botType].inventory.equipment.Holster = [];
				Bots[botType].inventory.equipment.Scabbard = [];
				
				Bots[botType].inventory.mods = {};
				
				Bots[botType].inventory.items.TacticalVest = [];
				Bots[botType].inventory.items.Pockets = [];
				Bots[botType].inventory.items.Backpack = [];
				Bots[botType].inventory.items.SecuredContainer = [];
				
				// push new items into inventory slots
				for (const itemId in DatabaseServer.tables.templates.items) {
					
					// equipment
					// Headwear
					if (Items[itemId]._parent === "5a341c4086f77401f2541505" && Items[itemId]._props.armorClass < HeadWearMaxLevel && Items[itemId]._props.armorClass > HeadWearMinLevel) {
						Bots[botType].inventory.equipment.Headwear.push(itemId);
					}
					// Earpiece
					if (Items[itemId]._parent === "5645bcb74bdc2ded0b8b4578") {
						for (const earpiece in Items["55d7217a4bdc2d86028b456d"]._props.Slots[11]._props.filters[0].Filter) {
							const earpieceId = Items["55d7217a4bdc2d86028b456d"]._props.Slots[11]._props.filters[0].Filter[earpiece]
							
							if (itemId === earpieceId) {
								Bots[botType].inventory.equipment.Earpiece.push(earpieceId);
							}
						}
					}
					// Face Cover
					if (Items[itemId]._parent === "5a341c4686f77469e155819e" && Items[itemId]._props.armorClass < 7) {
						Bots[botType].inventory.equipment.FaceCover.push(itemId);
					}
					// Armor Vests
					if (Items[itemId]._parent === "5448e54d4bdc2dcc718b4568" && Items[itemId]._props.armorClass < ArmoredVestMaxLevel && Items[itemId]._props.armorClass > ArmoredVestMinLevel) {
						Bots[botType].inventory.equipment.ArmorVest.push(itemId);
					}
					// Eyewear
					if (Items[itemId]._parent === "5448e5724bdc2ddf718b4568") {
						Bots[botType].inventory.equipment.Eyewear.push(itemId);
					}
					// Armbands
					if (Items[itemId]._parent === "5b3f15d486f77432d0509248" && Items[itemId]._props.armorClass < 7) {
						Bots[botType].inventory.equipment.ArmBand.push(itemId);
					}
					// Armored Tactical Rigs
					if (Items[itemId]._parent === "5448e5284bdc2dcb718b4567" && Items[itemId]._props.armorClass > 0) {
						if (Items[itemId]._parent === "5448e5284bdc2dcb718b4567" && Items[itemId]._props.armorClass < ArmoredVestMaxLevel && Items[itemId]._props.armorClass > ArmoredVestMinLevel) {
							Bots[botType].inventory.equipment.TacticalVest.push(itemId);
						}
					}
					// Non-armored Tactical Rigs
					if (Items[itemId]._parent === "5448e5284bdc2dcb718b4567" && !Items[itemId]._props.armorClass) {
						Bots[botType].inventory.equipment.TacticalVest.push(itemId);
					}
					// Backpacks
					if (Items[itemId]._parent === "5448e53e4bdc2d60728b4567") {
						Bots[botType].inventory.equipment.Backpack.push(itemId);
					}
					// First and Second primary weapons
					if (Items[itemId]._props.weapUseType === "primary" && itemId !== "5422acb9af1c889c16000029") {
						Bots[botType].inventory.equipment.FirstPrimaryWeapon.push(itemId);
						Bots[botType].inventory.equipment.SecondPrimaryWeapon.push(itemId);
					}
					// Sidearms
					if (Items[itemId]._props.weapUseType === "secondary" && itemId !== "5422acb9af1c889c16000029") {
						Bots[botType].inventory.equipment.Holster.push(itemId);
					}
					// Melee
					if (Items[itemId]._parent === "5447e1d04bdc2dff2f8b4567" && itemId !== "5fc64ea372b0dd78d51159dc") {
						Bots[botType].inventory.equipment.Scabbard.push(itemId);
					}
					
					// Eresh made the mods/mags generation below, i just tweaked it a lil bit
					// mods
					for (const slots in Items[itemId]._props.Slots) {
						if (itemId !== "55d7217a4bdc2d86028b456d") {
							if (Items[itemId]) {
								if (!Bots[botType].inventory.mods[itemId]) {
									Bots[botType].inventory.mods[itemId] = new Object()
								}
								
								Bots[botType].inventory.mods[itemId][Items[itemId]._props.Slots[slots]._name] = Items[itemId]._props.Slots[slots]._props.filters[0].Filter;
							}
						}
					}
					// generate mags
					if (Items[itemId]._parent === "5448bc234bdc2d3c308b4569") {
						
						if (!Bots[botType].inventory.mods[itemId]) {
							Bots[botType].inventory.mods[itemId] = new Object()
						}
						
						for (const ammo in Items[itemId]._props.Cartridges[0]._props.filters[0].Filter) {
							const ammoId = Items[itemId]._props.Cartridges[0]._props.filters[0].Filter[ammo]
							
							if (!Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name]) {
								Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name] = [];
							}
							
							if (Items[ammoId]) {
								if (Items[ammoId]._props.Caliber === "Caliber9x18PM" && Items[ammoId]._props.PenetrationPower > 19) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._props.Caliber === "Caliber762x25TT" && Items[ammoId]._props.PenetrationPower > 24) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._props.Caliber === "Caliber9x19PARA" && Items[ammoId]._props.PenetrationPower > 29) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._props.Caliber === "Caliber1143x23ACP" && Items[ammoId]._props.PenetrationPower > 29) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._props.Caliber === "Caliber9x21" && Items[ammoId]._props.PenetrationPower > 29) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._props.Caliber === "Caliber57x28" && Items[ammoId]._props.PenetrationPower > 29) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._props.Caliber === "Caliber46x30" && Items[ammoId]._props.PenetrationPower > 29) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._props.Caliber === "Caliber9x39" && Items[ammoId]._props.PenetrationPower > 29) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._props.Caliber === "Caliber366TKM" && Items[ammoId]._props.PenetrationPower > 29) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._props.Caliber === "Caliber545x39" && Items[ammoId]._props.PenetrationPower > 29) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._props.Caliber === "Caliber556x45NATO" && Items[ammoId]._props.PenetrationPower > 29) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._props.Caliber === "Caliber762x35" && Items[ammoId]._props.PenetrationPower > 29) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._props.Caliber === "Caliber762x39" && Items[ammoId]._props.PenetrationPower > 29) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._props.Caliber === "Caliber762x51" && Items[ammoId]._props.PenetrationPower > 29) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._props.Caliber === "Caliber762x54R" && Items[ammoId]._props.PenetrationPower > 29) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._props.Caliber === "Caliber86x70" && Items[ammoId]._props.PenetrationPower > 29) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._props.Caliber === "Caliber127x55" && Items[ammoId]._props.PenetrationPower > 29) {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
								if (Items[ammoId]._parent === "5485a8684bdc2da71d8b4567" && Items[ammoId]._props.Caliber !== "Caliber9x18PM" 
								&& Items[ammoId]._props.Caliber !== "Caliber762x25TT" && Items[ammoId]._props.Caliber !== "Caliber9x19PARA" && Items[ammoId]._props.Caliber !== "Caliber1143x23ACP" 
								&& Items[ammoId]._props.Caliber !== "Caliber57x28"  && Items[ammoId]._props.Caliber !== "Caliber46x30"  && Items[ammoId]._props.Caliber !== "Caliber9x39"  
								&& Items[ammoId]._props.Caliber !== "Caliber366TKM"  && Items[ammoId]._props.Caliber !== "Caliber545x39"  && Items[ammoId]._props.Caliber !== "Caliber556x45NATO"  
								&& Items[ammoId]._props.Caliber !== "Caliber762x35"  && Items[ammoId]._props.Caliber !== "Caliber762x39"  && Items[ammoId]._props.Caliber !== "Caliber762x51"  
								&& Items[ammoId]._props.Caliber !== "Caliber9x21"  && Items[ammoId]._props.Caliber !== "Caliber762x54R"  && Items[ammoId]._props.Caliber !== "Caliber86x70"  
								&& Items[ammoId]._props.Caliber !== "Caliber127x55") {
									Bots[botType].inventory.mods[itemId][Items[itemId]._props.Cartridges[0]._name].push(ammoId);
								}
							}
						}
					}
					
					// loose loot/meds/nades
					// meds
					if (Items[itemId]._parent) {
						if (Items[Items[itemId]._parent]._parent === "543be5664bdc2dd4348b4569" && Items[itemId]._props.MaxHpResource < 1801 && itemId !== "terragroupSpecialist_chemical_meds" 
						&& itemId !== "terragroupSpecialist_chemical_meds2") {
							Bots[botType].inventory.items.TacticalVest.push(itemId);
							Bots[botType].inventory.items.Pockets.push(itemId);
							Bots[botType].inventory.items.Backpack.push(itemId);
							Bots[botType].inventory.items.SecuredContainer.push(itemId);
						}
					}
					// loose loot
					if (Items[itemId]._parent) {
						if (!Items[itemId]._props.QuestItem && Items[itemId]._props.BackgroundColor !== "yellow" && Items[Items[itemId]._parent]._parent === "5448eb774bdc2d0a728b4567") {
							Bots[botType].inventory.items.TacticalVest.push(itemId);
							Bots[botType].inventory.items.Pockets.push(itemId);
							Bots[botType].inventory.items.Backpack.push(itemId);
						}
					}
					// food/drinks
					if (Items[itemId]._parent) {
						if (Items[Items[itemId]._parent]._parent === "543be6674bdc2df1348b4569") {
							Bots[botType].inventory.items.TacticalVest.push(itemId);
							Bots[botType].inventory.items.Pockets.push(itemId);
							Bots[botType].inventory.items.Backpack.push(itemId);
						}
					}
					// keys
					if (Items[itemId]._parent) {
						if (!Items[itemId]._props.QuestItem && Items[itemId]._props.BackgroundColor !== "yellow" && Items[Items[itemId]._parent]._parent === "543be5e94bdc2df1348b4568" 
						&& itemId !== "terragroupSpecialist_manager_keycard") {
							Bots[botType].inventory.items.TacticalVest.push(itemId);
							Bots[botType].inventory.items.Pockets.push(itemId);
							Bots[botType].inventory.items.Backpack.push(itemId);
						}
					}
					// cases/maps
					if (Items[itemId]._parent === "5795f317245977243854e041" || Items[itemId]._parent === "567849dd4bdc2d150f8b456e") {
						Bots[botType].inventory.items.TacticalVest.push(itemId);
						Bots[botType].inventory.items.Pockets.push(itemId);
						Bots[botType].inventory.items.Backpack.push(itemId);
					}
					// info loot
					if (!Items[itemId]._props.QuestItem && Items[itemId]._props.BackgroundColor !== "yellow" && Items[itemId]._parent === "5448ecbe4bdc2d60728b4568") {
						Bots[botType].inventory.items.TacticalVest.push(itemId);
						Bots[botType].inventory.items.Pockets.push(itemId);
						Bots[botType].inventory.items.Backpack.push(itemId);
					}
					// loose mods
					if (Config.AllowWeaponModsInLootPool) {
						if (Items[itemId]._props.RaidModdable === false) {
							Bots[botType].inventory.items.TacticalVest.push(itemId);
							Bots[botType].inventory.items.Pockets.push(itemId);
							Bots[botType].inventory.items.Backpack.push(itemId);
						}
					}
					// special items loot (markers, multitool, etc.)
					if (!Items[itemId]._props.QuestItem && Items[itemId]._props.BackgroundColor !== "yellow" && Items[itemId]._parent === "5447e0e74bdc2d3c308b4567" && itemId !== "5f4f9eb969cdc30ff33f09db") {
						Bots[botType].inventory.items.TacticalVest.push(itemId);
						Bots[botType].inventory.items.Pockets.push(itemId);
						Bots[botType].inventory.items.Backpack.push(itemId);
					}
					// nades
					if (Items[itemId]._parent === "543be6564bdc2df4348b4568") {
						Bots[botType].inventory.items.TacticalVest.push(itemId);
						Bots[botType].inventory.items.Pockets.push(itemId);
					}
					// ammo
					if (Items[itemId]._parent === "5485a8684bdc2da71d8b4567") {
						Bots[botType].inventory.items.SecuredContainer.push(itemId);
					}
				
					// Blacklist some shit
					// Headwear
					for (const BlacklistHeadwearEntry in BlacklistHeadwear) {
						let BlacklistHeadwearId = BlacklistHeadwear[BlacklistHeadwearEntry]
						if (itemId === BlacklistHeadwearId) {
							Bots[botType].inventory.equipment.Headwear = Bots[botType].inventory.equipment.Headwear.filter(v => v !== itemId);
						}
					}
					// Earpiece
					for (const BlacklistEarpieceEntry in BlacklistEarpiece) {
						let BlacklistEarpieceId = BlacklistEarpiece[BlacklistEarpieceEntry]
						if (itemId === BlacklistEarpieceId) {
							Bots[botType].inventory.equipment.Earpiece = Bots[botType].inventory.equipment.Earpiece.filter(v => v !== itemId);
						}
					}
					// Face Cover
					for (const BlacklistFaceCoverEntry in BlacklistFaceCover) {
						let BlacklistFaceCoverId = BlacklistFaceCover[BlacklistFaceCoverEntry]
						if (itemId === BlacklistFaceCoverId) {
							Bots[botType].inventory.equipment.FaceCover = Bots[botType].inventory.equipment.FaceCover.filter(v => v !== itemId);
						}
					}
					// Armor Vests
					for (const BlacklistArmorVestsEntry in BlacklistArmorVests) {
						let BlacklistArmorVestsId = BlacklistArmorVests[BlacklistArmorVests]
						if (itemId === BlacklistArmorVestsId) {
							Bots[botType].inventory.equipment.ArmorVest = Bots[botType].inventory.equipment.ArmorVest.filter(v => v !== itemId);
						}
					}
					// Eyewear
					for (const BlacklistEyewearEntry in BlacklistEyewear) {
						let BlacklistEyewearId = BlacklistEyewear[BlacklistEyewearEntry]
						if (itemId === BlacklistEyewearId) {
							Bots[botType].inventory.equipment.Eyewear = Bots[botType].inventory.equipment.Eyewear.filter(v => v !== itemId);
						}
					}
					// Armbands
					for (const BlacklistArmbandsEntry in BlacklistArmbands) {
						let BlacklistArmbandsId = BlacklistArmbands[BlacklistArmbandsEntry]
						if (itemId === BlacklistArmbandsId) {
							Bots[botType].inventory.equipment.ArmBand = Bots[botType].inventory.equipment.ArmBand.filter(v => v !== itemId);
						}
					}
					// Rigs
					for (const BlacklistRigsEntry in BlacklistRigs) {
						let BlacklistRigsId = BlacklistRigs[BlacklistRigsEntry]
						if (itemId === BlacklistRigsId) {
							Bots[botType].inventory.equipment.TacticalVest = Bots[botType].inventory.equipment.TacticalVest.filter(v => v !== itemId);
						}
					}
					// Backpacks
					for (const BlacklistBackpacksEntry in BlacklistBackpacks) {
						let BlacklistBackpacksId = BlacklistBackpacks[BlacklistBackpacksEntry]
						if (itemId === BlacklistBackpacksId) {
							Bots[botType].inventory.equipment.Backpack = Bots[botType].inventory.equipment.Backpack.filter(v => v !== itemId);
						}
					}
					// First and Second primary weapons
					for (const BlacklistWeapEntry in BlacklistWeap) {
						let BlacklistWeapId = BlacklistWeap[BlacklistWeapEntry]
						if (itemId === BlacklistWeapId) {
							Bots[botType].inventory.equipment.FirstPrimaryWeapon = Bots[botType].inventory.equipment.FirstPrimaryWeapon.filter(v => v !== itemId);
							Bots[botType].inventory.equipment.SecondPrimaryWeapon = Bots[botType].inventory.equipment.SecondPrimaryWeapon.filter(v => v !== itemId);
							Bots[botType].inventory.equipment.Holster = Bots[botType].inventory.equipment.Holster.filter(v => v !== itemId);
							Bots[botType].inventory.equipment.Scabbard = Bots[botType].inventory.equipment.Scabbard.filter(v => v !== itemId);
						}
					}
					// Items (meds/nades/loose loot)
					for (const BlacklistItemsEntry in BlacklistItems) {
						let BlacklistItemsId = BlacklistItems[BlacklistItemsEntry]
						if (itemId === BlacklistItemsId) {
							Bots[botType].inventory.items.TacticalVest = Bots[botType].inventory.items.TacticalVest.filter(v => v !== itemId);
							Bots[botType].inventory.items.Pockets = Bots[botType].inventory.items.Pockets.filter(v => v !== itemId);
							Bots[botType].inventory.items.Backpack = Bots[botType].inventory.items.Backpack.filter(v => v !== itemId);
							Bots[botType].inventory.items.SecuredContainer = Bots[botType].inventory.items.SecuredContainer.filter(v => v !== itemId);
						}
					}
				}
				
				// chances
				for (const equipment in Bots[botType].chances.equipment) {
					if (equipment === "ArmorVest" || equipment === "Headwear" || equipment === "FirstPrimaryWeapon") {
						Bots[botType].chances.equipment[equipment] = 99;
					} else if (equipment === "TacticalVest" || equipment === "Scabbard") {
						Bots[botType].chances.equipment[equipment] = 100;
					} else if (equipment === "SecondPrimaryWeapon") {
						Bots[botType].chances.equipment[equipment] = 10;
					} else {
						Bots[botType].chances.equipment[equipment] = 50;
					}
				}
				for (const mods in Bots[botType].chances.mods) {
					if (mods === "mod_mount_004" || mods === "mod_charge" || mods === "mod_tactical" || mods === "mod_bipod" || mods === "mod_foregrip" || mods === "mod_tactical_000" || mods === "mod_equipment" 
					|| mods === "mod_equipment_000" || mods === "mod_scope_001" || mods === "mod_muzzle_001" || mods === "mod_tactical001" || mods === "mod_equipment_001" || mods === "mod_equipment_002") {
						Bots[botType].chances.mods[mods] = 50;
					} else if (mods === "mod_mount_001" || mods === "mod_tactical_2" || mods === "mod_tactical_001" || mods === "mod_tactical002" || mods === "mod_scope_002") {
						Bots[botType].chances.mods[mods] = 25;
					} else if (mods === "mod_tactical_002" || mods === "mod_mount_002" || mods === "mod_scope_003") {
						Bots[botType].chances.mods[mods] = 12;
					} else if (mods === "mod_tactical_003" || mods === "mod_mount_003" || mods === "mod_nvg") {
						Bots[botType].chances.mods[mods] = 6;
					} else if (mods === "mod_mount_005") {
						Bots[botType].chances.mods[mods] = 3;
					} else if (mods === "mod_mount_006") {
						Bots[botType].chances.mods[mods] = 2;
					} else if (mods === "mod_launcher") {
						Bots[botType].chances.mods[mods] = 0;
					} else if (mods === "mod_scope" || mods === "mod_scope_000") {
						Bots[botType].chances.mods[mods] = 60;
					} else {
						Bots[botType].chances.mods[mods] = 99;
					}
				}
				
				//logger.logInfo(common_f.json.serialize(Bots[botType].inventory.equipment.Headwear) + " - Headwear" + " " + botType)
				//logger.logInfo(common_f.json.serialize(Bots[botType].inventory.equipment.Earpiece) + " - Earpiece")
				//logger.logInfo(common_f.json.serialize(Bots[botType].inventory.equipment.FaceCover) + " - FaceCover")
				//logger.logInfo(common_f.json.serialize(Bots[botType].inventory.equipment.ArmorVest) + " - ArmorVest")
				//logger.logInfo(common_f.json.serialize(Bots[botType].inventory.equipment.Eyewear) + " - Eyewear")
				//logger.logInfo(common_f.json.serialize(Bots[botType].inventory.equipment.ArmBand) + " - ArmBand")
				//logger.logInfo(common_f.json.serialize(Bots[botType].inventory.equipment.TacticalVest) + " - TacticalVest")
				//Logger.info(JsonUtil.serialize(Bots[botType].inventory.equipment.FirstPrimaryWeapon) + " - FirstPrimaryWeapon")
				//logger.logInfo(common_f.json.serialize(Bots[botType].inventory.equipment.SecondPrimaryWeapon) + " - SecondPrimaryWeapon")
				//logger.logInfo(common_f.json.serialize(Bots[botType].inventory.equipment.Holster) + " - Holster")
				//logger.logInfo(common_f.json.serialize(Bots[botType].inventory.equipment.Scabbard) + " - Scabbard")
				
				//logger.logInfo(common_f.json.serialize(Bots[botType].inventory.items.TacticalVest) + " - items.TacticalVest")
				//logger.logInfo(common_f.json.serialize(Bots[botType].inventory.items.Pockets) + " - items.Pockets")
				//Logger.info(JsonUtil.serialize(Bots[botType].inventory.items.Backpack) + " - items.Backpack")
				//logger.logInfo(common_f.json.serialize(Bots[botType].inventory.items.SecuredContainer) + " - items.SecuredContainer")
				
				//logger.logInfo(common_f.json.serialize(Bots[botType].chances.equipment) + " - chances.equipment")
				//logger.logInfo(common_f.json.serialize(Bots[botType].chances.mods) + " - chances.mods")
				
				/*
				Bots[botType].inventory.equipment.FirstPrimaryWeapon = [
					"AK50"
				];
				
				PMC_loadouts.testBot("bear")
				PMC_loadouts.testBot("bear")
				PMC_loadouts.testBot("bear")
				PMC_loadouts.testBot("bear")
				PMC_loadouts.testBot("bear")
				PMC_loadouts.testBot("bear")
				PMC_loadouts.testBot("bear")
				PMC_loadouts.testBot("bear")
				PMC_loadouts.testBot("bear")
				PMC_loadouts.testBot("bear")
				PMC_loadouts.testBot("bear")
				PMC_loadouts.testBot("bear")
				*/
			}
		}
    }
	
	static testBot(role)
	{
		let bot = JsonUtil.clone(DatabaseServer.tables.bots.base);
		
		var testing = BotController.generateBot(bot, role)
	}
}

module.exports = PMC_loadouts;