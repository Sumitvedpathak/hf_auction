'use strict';
const Helper = require('./auction1');
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
        console.log('Asset - '+asset);
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
        console.log('Bid object - '+bid);

        const collStr = this._getCollectionName(asset.organization, bid.organization);
        await this._putState(ctx, StateType.BID, bid, collStr);
        return "Bid Created Successfully!";
    }

    async closeBiddingForAsset(ctx, id) {
        console.log('Executing closeBiddingForAsset')
        let statusMsg = '';
        const assetFlg = await this._isAssetExist(ctx, id);
        if(!assetFlg) {
            return new Error(`Asset ${id} does not exists.`);
        }

        const asset = await this._getDetailsFor(ctx, StateType.ASSET, id);
        console.log(`Asset Exists - ${asset}`);
        if(ctx.clientIdentity.getID() !== asset.seller) {
            return new Error('You are not authorized to close the Bid.');
        }

         const bidList = await this.getBidLists(ctx, asset.id);
        console.log('Bid LIst - '+bidList+'----- Bid list length - '+ bidList.length+'-----------Obj - '+ bidList[0]);
        if(bidList.length === 0){
            asset.status = AssetStatus.WITHDRAW
            statusMsg = `Biding closed successfully for asset ${asset.id} as there was no bidder who bid the asset. `;
        }
        else {
            bidList.sort((bid1, bid2) => bid2.price - bid1.price);
            const bestBid = bidList[0];
            asset.buyer = bestBid.bidder;
            asset.buyingPrice = bestBid.value;
            asset.status = AssetStatus.SOLD;
            statusMsg = `Biding closed successfully for asset ${asset.id}. The new owner of Asset is now ${asset.buyer} with last bidding price ${asset.buyingPrice}`;
        }
        console.log('Asset to update object - '+asset);
        await this._putState(ctx, StateType.ASSET, asset);
        console.log('Ending closeBiddingForAsset')
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
        console.log('Executing getBidLists');
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
                    if(assetId === ''){
                        console.log('Bid Object - '+ bidVal);
                        result.push(bidVal);
                    } else if( assetId === bidVal.assetId) {
                        console.log('Bid Object - '+ bidVal);
                        result.push(bidVal);
                    }
                }
            }

            // const assetCompKey = ctx.stub.createCompositeKey(assetObjectType,[assetId]);
            // console.log('Composite Key - '+ assetCompKey);
            // const prvtData = await ctx.stub.getPrivateData(collStr,assetCompKey)
            // console.log('Private Data - '+ prvtData);
            // if(!prvtData || prvtData.length === 0){
            //     return result;
            // }
            // result.push(JSON.parse(prvtData.toString()));
        }
        console.log('Result obj - '+result);
        return result;
    }

    async _getDetailsFor(ctx, stateType, id, collStr = ''){
        const objType = (stateType === StateType.ASSET) ? assetObjectType : bidObjectType;

        const compKey = ctx.stub.createCompositeKey(objType,[id]);
        
        let assetBytes = null;
        collStr = collStr || '';
        if(collStr === '') {
            console.log('GetState - '+compKey);
            assetBytes = await ctx.stub.getState(compKey);
        } else {
            console.log('PrivateData - '+compKey);
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
        console.log('ObjectType - '+objType);
        let compKey = '';
        const stateObj = Buffer.from(JSON.stringify(obj));
        if(collString === '') {
            compKey = ctx.stub.createCompositeKey(objType, [obj.id]);
            console.log(`composite Key - ${compKey}, /Value - ${stateObj}`);
            await ctx.stub.putState(compKey,stateObj);
        } else {
            compKey = ctx.stub.createCompositeKey(objType, [obj.id]);
            console.log(`Collection - ${collString}, /composite Key - ${compKey}, /Value - ${stateObj}`);
            await ctx.stub.putPrivateData(collString, compKey, stateObj);
        }
        console.log('Exiting _PutState');
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