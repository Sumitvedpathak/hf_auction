'use strict';

const { Contract } = require('fabric-contract-api');

const bidObjectType = "bidObjType";

class AuctionContract extends Contract {

    async _putState(ctx, bid) {
        const bidCompKey = ctx.stub.createCompositeKey(bidObjectType,[bid.id]);
        const bidValue = Buffer.from(JSON.stringify(bid));
        console.log("Bid Composite Key - " + bidCompKey + ", Bid Value - " + bidValue);
        await ctx.stub.putState(bidCompKey,bidValue);
    }

    async createBid(ctx,id,value){
        const bid = {
            id : id,
            value : value,
            bidder : ctx.clientIdentity.getID()
        };
        await this._putState(ctx,bid);
        console.log("Bid Created Successfully!");
    }

    async  listBids(ctx){
        const iterator = ctx.stub.getStateByPartialCompositeKey(bidObjectType,[]);
        let result = [];
        for await(const itr of iterator) {
            const bidVal = JSON.parse(itr.value.toString('utf8'));
            result.push(bidVal);
        }
        console.log(result);
        return JSON.stringify(result);
    }

}

module.exports = AuctionContract;