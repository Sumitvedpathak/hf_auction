'use strict';
const Helper = require('./bid');
const { Contract } = require('fabric-contract-api');

const bidObjectType = "bidObjType";
const assetObjectType = "assetObjType";

const StateType = Object.freeze({ASSET:"asset",BID:"bid"});
const AssetStatus = Object.freeze({
    SALE: "Sale", SOLD: "Sold", WITHDRAW: "Withdraw"
});

// const Participents = ["Org1","Org2","Org3"];
const Participents = ["Org1","Org2"];

class AuctionContract extends Contract {

    async bid(ctx, id, assetId, value){

        console.log('Executing Bid function');

        const assetFlg = await this._isAssetExist(ctx, assetId)
        if(!assetFlg){
            throw new Error("Asset does not exists");
        }

        const asset = await this._getDetailsFor(ctx,StateType.ASSET, assetId);
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

    async closeBiddingForAsset(ctx, id) {
        let statusMsg = '';
        const assetFlg = await this._isAssetExist(ctx, id);
        if(!assetFlg) {
            return new Error(`Asset ${id} does not exists.`);
        }

        const asset = await this._getDetailsFor(ctx, StateType.ASSET, id);
        if(ctx.clientIdentity.getID() !== asset.seller) {
            return new Error('You are not authorized to close the Bid.');
        }

        const bidList = JSON.parse(await this.getBidLists(ctx, asset.id));
        if(bidList.length === 0){
            asset.status = AssetStatus.WITHDRAW
            statusMsg = `Biding closed successfully for asset ${asset.id} as there was no bidder who bid the asset. `;
        } else {
            bidList.sort((bid1, bid2) => bid2.price - bid1.price);
            const bestBid = bidList[0];
            asset.buyer = bestBid.bidder;
            asset.buyingPrice = bestBid.value;
            statusMsg = `Biding closed successfully for asset ${asset.id}. The new owner of Asset is now ${asset.buyer} with last bidding price ${asset.buyingPrice}`;
        }

        await this._putState(ctx, StateType.ASSET, asset);
        return statusMsg;
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

        const asset = await this._getDetailsFor(ctx, StateType.ASSET, id);
        console.log(asset);
        if(ctx.clientIdentity.getID() !== asset.seller) {
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

    async  getBidLists(ctx, assetId = ''){
        let result = [];
        for (let i = 0; i < Participents.length; i++) {
            if(ctx.clientIdentity.getMSPID() === Participents[i]+'MSP') {
                continue;
            }
            const collStr = this._getCollectionName(ctx.clientIdentity.getMSPID(),Participents[i]+'MSP');
            console.log('Collection String for - '+collStr);
            result.push(await ctx.stub.getPrivateData(collStr,bidObjectType));
            // let iterator  = ctx.stub.getPrivateDataByPartialCompositeKey(collStr,bidObjectType,[]);
            // for await(const itr of iterator) {
            //     const bidVal = JSON.parse(itr.value.toString('utf8'));
            //     if(ctx.clientIdentity.getMSPID() === bidVal.assetOrg) {
            //         if(assetId === ''){
            //             console.log('Bid Object - '+ bidVal);
            //             result.push(bidVal);
            //         } else if( assetId === bidVal.assetId) {
            //             console.log('Bid Object - '+ bidVal);
            //             result.push(bidVal);
            //         }
            //     }
            // }
        }
        console.log(result);
        return JSON.stringify(result);
    }

    async _getDetailsFor(ctx, stateType, id, collStr = ''){
        const objType = (stateType === StateType.ASSET) ? assetObjectType : bidObjectType;

        const compKey = ctx.stub.createCompositeKey(objType,[id]);
        
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