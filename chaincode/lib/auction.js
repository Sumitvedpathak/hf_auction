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


    async bid(ctx,assetId,value){

        console.log('Executing Bid function');
        const asset = JSON.parse(this._getAsset(ctx,assetId));

        if(Object.keys(asset).length === 0){
            return new Error(`Asset with ${assetId} does not exists`);
        }

        console.log('Asset = '+asset);

        if(ctx.clientIdentity.getID() === asset.seller) {
            return new Error(`Asset Owner cannot bid for its own Asset`);
        }

        if(value < asset.minimumBid){
            return new Error(`Asset starting bid value is ${asset.minimumBid}. Cannot be less than that.`)
        }

        const bid = {
            assetId:assetId,
            bidder : ctx.clientIdentity.getMSPID(),
            value : value
        };
        console.log('Bid - '+bid);

        await this._putState(ctx, StateType.BID, bid);
        console.log("Bid Created Successfully!");
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

    async _getAsset(ctx, id){
        console.log('Executing _getAsset');
        const iterator = ctx.stub.getStateByPartialCompositeKey(assetObjectType,[]);
        console.log(iterator);
        let asset = null;
        for await(const itr of iterator) {
            const assetObj = JSON.parse(itr.value.toString('utf8'));
            console.log('Asset - '+ assetObj)
            if(assetObj.id === id){
                asset = assetObj;
                console.log('Found asset - '+ asset)
            }
        }
        console.log('Asset from _getAsset - '+asset);
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