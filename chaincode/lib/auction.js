'use strict';

const { Contract } = require('fabric-contract-api');

const bidObjectType = "bidObjType";

class AuctionContract extends Contract {

    async _putState(ctx, bid) {
        const bidCompKey = ctx.stub.createCompositeKey(bidObjectType,[bid.id]);
        const bidValue = Buffer.from(JSON.stringify(bid));
        console.log("Bid Composite Key - " + bidCompKey + "Bid Value - " + bidValue);
        await ctx.stub.putState(bidCompKey,bidValue);
    }

    async createBid(ctx,id,value){
        const bid = {
            id : id,
            value : value,
            bidder : ctx.clientIdentity.getId()
        };
        await this._putState(ctx,bid);
    }

}

module.exports = AuctionContract;