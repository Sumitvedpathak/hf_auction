'use strict';
const Helper = require('./helpers');
const { Contract } = require('fabric-contract-api');

const bidObjectType = "bidObjType";
const assetObjectType = "assetObjType";

const StateType = Object.freeze({ASSET:"asset",BID:"bid"});
const AssetStatus = Object.freeze({
    SALE: "Sale", SOLD: "Sold", WITHDRAW: "Withdraw"
});

class AuctionContract extends Contract {

    async _putState(ctx, stateType, obj) {
        const objType = (stateType === StateType.ASSET) ? assetObjectType : bidObjectType;
        console.log(objType);
        const compKey = ctx.stub.createCompositeKey(objType, [obj.id]);
        const stateObj = Buffer.from(JSON.stringify(obj));
        console.log("Composite Key - " + compKey + ", Value - " + stateObj);
        await ctx.stub.putState(compKey,stateObj);
    }

    async _isAssetExist(ctx, id){
        const assetList = JSON.parse(await this.getListsFor(ctx,StateType.ASSET));
        console.log(assetList.length);
        let existsFlg = false;
        let asset = null;
        for (var i=0; i < assetList.length; i++){
            console.log(`For ${id} and ${assetList[i].id} = ${id === assetList[i].id}`);
            if(id === assetList[i].id){
                existsFlg = true;
                asset = assetList[i];
                break;
            }
        }
        return {Exists : existsFlg, Asset: asset};
    }

    async addAssetToBid(ctx,id, assetName, value, lowestValue){
        const assetObj = await this._isAssetExist(ctx, id)
        if(assetObj.Exists){
            throw new Error("Asset Id already exists");
        }

        const asset = {
            id:id,
            name:assetName,
            seller:ctx.clientIdentity.getMSPID(),
            status:AssetStatus.SALE,
            minimumBid:lowestValue
        };

        const assetCompKey = ctx.stub.createCompositeKey(assetObjectType,[asset.id]);
        await this._putState(ctx, StateType.ASSET, asset);
    }

    async withDrawAsset(ctx, id){
        const asset = await this._isAssetExist(ctx, id)
        if(!asset.Exists){
            throw new Error("Asset Id does not exists");
        }
        asset.Asset.status = AssetStatus.WITHDRAW;
        await this._putState(ctx, StateType.ASSET, asset.Asset);
    }

    async  getListsFor(ctx,stateType){
        const objType = (stateType.toLowerCase() === StateType.ASSET) ? assetObjectType : bidObjectType;
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

    async createBid(ctx,id,value){
        const bid = {
            bidder : ctx.clientIdentity.getMSPID(),
            value : value
        };
        // await Helper._putState(ctx,bid);
        await this._putState(ctx, StateType.BID, bid);
        console.log("Bid Created Successfully!");
    }

}

module.exports = AuctionContract;