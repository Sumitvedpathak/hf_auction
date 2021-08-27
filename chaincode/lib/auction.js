'use strict';
const Helper = require('./bid');
const { Contract } = require('fabric-contract-api');

const bidObjectType = "bidObjType";
const assetObjectType = "assetObjType";

const StateType = Object.freeze({ASSET:"asset",BID:"bid"});
const AssetStatus = Object.freeze({
    SALE: "Sale", SOLD: "Sold", WITHDRAW: "Withdraw"
});

const Participents = ["Org1","Org2","Org3"];

class AuctionContract extends Contract {

    async bid(ctx, id, assetId, value){

        console.log('Executing Bid function');

        const assetFlg = await this._isAssetExist(ctx, id)
        if(!assetFlg){
            throw new Error("Asset Id already exists");
        }

        const asset = await this._getAsset(ctx, assetId);
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
            organization: ctx.clientIdentity.getMSPID(),
            assetOrg : asset.organization,
            value : value
        };

        const collStr = this._getCollectionName(asset.organization, bid.organization);
        await this._putState(ctx, StateType.BID, bid, collStr);
        return "Bid Created Successfully!";
    }

    async addAsset(ctx,id, assetName, lowestValue){
        const assetFlg = await this._isAssetExist(ctx, id)
        if(assetFlg){
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
        const assetFlg = await this._isAssetExist(ctx, id)
        if(!assetFlg){
            throw new Error("Asset Id does not exists");
        }

        const asset = await this._getAsset(ctx, id);

        if(ctx.clientIdentity.getID() !== asset.Asset.seller) {
            throw new Error('Not authorize to withdraw. Only Sellet is authorized to withdraw')
        }

        asset.Asset.status = AssetStatus.WITHDRAW;
        await this._putState(ctx, StateType.ASSET, asset.Asset);
        return `Asset ${id} withdrawn Successfully from bid!`;
    }

    async  getAssetLists(ctx){
        let iterator = ctx.stub.getStateByPartialCompositeKey(assetObjectType,[]);
        
        let result = [];
        for await(const itr of iterator) {
            const bidVal = JSON.parse(itr.value.toString('utf8'));
            result.push(bidVal);
        }
        console.log(result);
        return JSON.stringify(result);
    }

    async  getBidLists(ctx){
        let result = [];
        for (let i = 0; i < Participents.length; i++) {
            if(ctx.clientIdentity.getMSPID() === Participents[i]+'MSP') {
                continue;
            }
            const collStr = this._getCollectionName(ctx.clientIdentity.getMSPID(),Participents[i]+'MSP');
            console.log('Collection String for - '+collStr);
            let iterator  = ctx.stub.getPrivateDataByPartialCompositeKey(collStr,bidObjectType,[]);
            for await(const itr of iterator) {
                const bidVal = JSON.parse(itr.value.toString('utf8'));
                if(ctx.clientIdentity.getMSPID() === bidVal.assetOrg) {
                    console.log('Bid Object - '+ bidVal);
                    result.push(bidVal);
                }
            }
        }
        console.log(result);
        return JSON.stringify(result);
    }


    async _getAsset(ctx, id, collStr = ''){
        const compKey = ctx.stub.createCompositeKey(assetObjectType,[id]);
        
        let assetBytes = null;
        if(collStr === '') {
            assetBytes = await ctx.stub.getState(compKey);
        } else {
            assetBytes = await ctx.stub.getPrivateData(collStr,compKey);
        }

        if(!assetBytes || assetBytes.length === 0) {
            throw new Error(`Asset ${id} does not exists.`);
        }

        return JSON.parse(assetBytes.toString());
    }

    async _putState(ctx, stateType, obj, collString = '') {
        console.log('Executing _PutState');
        const objType = (stateType === StateType.ASSET) ? assetObjectType : bidObjectType;
        console.log(objType);
        const compKey = ctx.stub.createCompositeKey(objType, [obj.id]);
        const stateObj = Buffer.from(JSON.stringify(obj));
        console.log("Composite Key - " + compKey + ", Value - " + stateObj);
        if(collString === '') {
            console.log(`composite Key - ${compKey}, /Type - ${stateObj}`);
            await ctx.stub.putState(compKey,stateObj);
        } else {
            console.log(`Collection - ${collString}, /composite Key - ${compKey}, /Type - ${stateObj}`);
            await ctx.stub.putPrivateData(collString, compKey, stateObj);
        }
    }

    async _isAssetExist(ctx, id, collStr = ''){
        const compKey = ctx.stub.createCompositeKey(assetObjectType,[id]);
        let assetBytes = null;
        if(collStr === '') {
            assetBytes = await ctx.stub.getState(compKey);
        } else {
            assetBytes = await ctx.stub.getPrivateData(collStr,compKey);
        }

        return assetBytes && assetBytes.length > 0;
    }

    _getCollectionName(org1, org2) {
        return [org1,org2].sort().join('-');
    }

}

module.exports = AuctionContract;