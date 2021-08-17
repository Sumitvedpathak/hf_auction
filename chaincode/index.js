'use strict';

const auctionContract = require('./lib/auction');

module.exports.AuctionContract = auctionContract;
module.exports.contracts = [auctionContract];