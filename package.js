const { LI } = require("./src/Injector.js");
const { LC } = require("./src/Controller.js");
const SellToFleaMarket = require("./src/SellToFleaMarket.js");


module.exports.li = new LI();
module.exports.lc = new LC();
module.exports.Mod = new SellToFleaMarket();
