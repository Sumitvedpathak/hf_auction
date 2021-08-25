'use strict';
const Helper = require('./bid');
const { Contract } = require('fabric-contract-api');

const bidObjectType = "bidObjType";
const assetObjectType = "assetObjType";

const StateType = Object.freeze({ASSET:"asset",BID:"bid"});
const AssetStatus = Object.freeze({
    SALE: "Sale", SOLD: "Sold", WITHDRAW: "Withdraw"
});

class AuctionContract extends Contract {

    async bid(ctx, id, assetId, value){

        console.log('Executing Bid function');
        // const asset = this.getListsFor(ctx,StateType.ASSET);
        const assetObj = await this._getAsset(ctx, assetId);


        const asset = JSON.parse(assetObj);

        if(Object.keys(asset).length === 0){
            throw new Error(`Asset with ${assetId} does not exists`);
        }

        if(ctx.clientIdentity.getID() === asset.seller) {
            throw new Error(`Asset Owner cannot bid for its own Asset`);
        }

        if(value < asset.minimumBid){
            throw new Error(`Asset starting bid value is ${asset.minimumBid}. Cannot be less than that.`)
        }

        const bid = {
            id: id,
            assetId:assetId,
            bidder : ctx.clientIdentity.getID(),
            value : value
        };

        await this._putState(ctx, StateType.BID, bid);
        return "Bid Created Successfully!";
    }

    async addAsset(ctx,id, assetName, lowestValue){
        const assetObj = await this._isAssetExist(ctx, id)
        if(assetObj.Exists){
            throw new Error("Asset Id already exists");
        }

        const asset = {
            id:id,
            name:assetName,
            seller:ctx.clientIdentity.getID(),
            organization: ctx.clientIdentity.getMSPID(),
            status:AssetStatus.SALE,
            minimumBid:lowestValue
        };

        const assetCompKey = ctx.stub.createCompositeKey(assetObjectType,[asset.id]);
        await this._putState(ctx, StateType.ASSET, asset);
        return `Asset ${id} added Successfully!`;
    }

    async withDrawAsset(ctx, id){
        const asset = await this._isAssetExist(ctx, id)
        if(!asset.Exists){
            throw new Error("Asset Id does not exists");
        }
        if(ctx.clientIdentity.getID() !== asset.Asset.seller) {
            throw new Error('Not authorize to withdraw. Only Sellet is authorized to withdraw')
        }

        asset.Asset.status = AssetStatus.WITHDRAW;
        await this._putState(ctx, StateType.ASSET, asset.Asset);
        return `Asset ${id} withdrawn Successfully from bid!`;
    }

    async  getListsFor(ctx,stateType){
        const objType = (stateType.toLowerCase() === StateType.ASSET) ? assetObjectType : bidObjectType;
        const iterator = ctx.stub.getStateByPartialCompositeKey(objType,[]);

        let result = [];
        for await(const itr of iterator) {
            const bidVal = JSON.parse(itr.value.toString('utf8'));
            result.push(bidVal);
        }
        console.log(result);
        return JSON.stringify(result);
    }

    async _getAsset(ctx, id){
        const iterator = ctx.stub.getStateByPartialCompositeKey(assetObjectType,[]);
        let asset;
        for await(const itr of iterator) {
            const assetObj = JSON.parse(itr.value.toString());
            if(assetObj.id === id){
                asset = assetObj;
            } 
        }
        return JSON.stringify(asset);
    }

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

}

module.exports = AuctionContract;