const { LI } = require("./src/Injector.js");
const { LC } = require("./src/Controller.js");
const { FLEA } = require("./src/FleaMarket.js");

module.exports.li = new LI();
module.exports.lc = new LC();
module.exports.flea = new FLEA();