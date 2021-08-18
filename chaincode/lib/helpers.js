const { Contract } = require('fabric-contract-api');

class Helper extends Contract{

    async _putState(ctx, bid) {
        const bidCompKey = ctx.stub.createCompositeKey(bidObjectType,[bid.id]);
        const bidValue = Buffer.from(JSON.stringify(bid));
        console.log("Bid Composite Key - " + bidCompKey + ", Bid Value - " + bidValue);
        await ctx.stub.putState(bidCompKey,bidValue);
    }

}

module.exports = Helper;