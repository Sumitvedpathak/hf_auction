'use strict';
const Helper = require('./helpers');
const { Contract } = require('fabric-contract-api');

const bidObjectType = "bidObjType";
const assetObjectType = "assetObjType";

const StateType = Object.freeze({Asset:1,Bid:2});
const AssetStatus = Object.freeze({
    Sale: 1, Sold: 2, Withdrawn: 3
});

class AuctionContract extends Contract {

    async _putState(ctx, type, obj) {
        const objType = (stateType === StateType.Asset) ? assetObjectType : bidObjectType;
        console.log(objType);
        const compKey = ctx.stub.createCompositeKey(objType, [obj.id]);
        const stateObj = Buffer.from(JSON.stringify(obj));
        console.log("Composite Key - " + compKey + ", Value - " + stateObj);
        await ctx.stub.putState(compKey,stateObj);
    }

    async addAssetToBid(ctx,id, assetName, value, lowestValue){
        const asset = {
            id:id,
            name:assetName,
            seller:ctx.clientIdentity.getMSPID(),
            status:AssetStatus.Sale,
            minimumBid:lowestValue
        };

        const assetCompKey = ctx.stub.createCompositeKey(assetObjectType,[asset.id]);
        await this._putState(ctx, StateType.Asset, asset);
    }

    async createBid(ctx,id,value){
        const bid = {
            id : id,
            value : value,
            bidder : ctx.clientIdentity.getMSPID()
        };
        // await Helper._putState(ctx,bid);
        await this._putState(ctx, StateType.Bid, bid);
        console.log("Bid Created Successfully!");
    }

    async  getListsFor(ctx,stateType){
        const objType = (stateType === StateType.Asset) ? assetObjectType : bidObjectType;
        console.log(objType);
        const iterator = ctx.stub.getStateByPartialCompositeKey(objType,[]);
        let result = [];
        for await(const itr of iterator) {
            const bidVal = JSON.parse(itr.value.toString('utf8'));
            result.push(bidVal);
        }
        console.log(result);
        return JSON.stringify(result);
    }


    // async  listBids(ctx){
    //     const iterator = ctx.stub.getStateByPartialCompositeKey(bidObjectType,[]);
    //     let result = [];
    //     for await(const itr of iterator) {
    //         const bidVal = JSON.parse(itr.value.toString('utf8'));
    //         result.push(bidVal);
    //     }
    //     console.log(result);
    //     return JSON.stringify(result);
    // }

}

module.exports = AuctionContract;