'use strict';
const { Contract } = require('fabric-contract-api');

const bidObjType = "bidObjType";
const assetObjType = "assetObjType";
const AuctionType = Object.freeze({ASSET:"asset",BID:"bid"});
const AssetStatus = Object.freeze({SALE: "Sale", SOLD: "Sold", WITHDRAW: "Withdraw"});
const Organizations = ["Org1MSP","Org2MSP"];

class AuctionContract extends Contract{

    async bid(ctx, id, assetId, price){
        console.log('Executing Bid.')
        const value = parseFloat(price);
        
        if(!(await this._isExists(ctx,AuctionType.ASSET,assetId))) {
            throw new Error(`Asset ${assetId} does not exists.`);
        }

        const asset = await this._get(ctx, AuctionType.ASSET, assetId);

        if(asset.seller === ctx.clientIdentity.getID()) {
            throw new Error(`Asset owner cannot bid its own asset`);
        }

        if(price < asset.startingPrice) {
            throw new Error(`Bidding price should be more than Assets minimum price ${asset.startingPrice}`);
        }

        const bid = {
            id : id,
            assetId : assetId,
            bidder : ctx.clientIdentity.getID(),
            organization : ctx.clientIdentity.getMSPID(),
            price : value 
        };

        const collection = this._getCollectionName(asset.organization, ctx.clientIdentity.getMSPID());
        await this._put(ctx,AuctionType.BID,assetId,bid,collection);
        return `Successfully added bid for asset ${assetId} at price ${price}`;
    }

    async closeBidding(ctx, assetId){
        console.log('Executing closeBid.')
        
        if(!(await this._isExists(ctx,AuctionType.ASSET,assetId))) {
            throw new Error(`Asset ${assetId} does not exists.`);
        }

        const asset = await this._get(ctx, AuctionType.ASSET, assetId);

        if(asset.seller !== ctx.clientIdentity.getID()) {
            throw new Error('Sorry you are not authorized! Only asset owner can close the bid.');
        }
        let bids = [];
        for(let i = 0; i < Organizations.length; i++){
            if(asset.organization !== Organizations[i]){
                const collection = this._getCollectionName(ctx.clientIdentity.getMSPID(), Organizations[i]);
                bids.push(await this._get(ctx,AuctionType.BID,assetId,collection));
            }
        }
        console.log(`Bids length - ${bids.length}`)
        return bids;
    }

    async addAsset(ctx, id, name, startingPrice) {
        console.log('Executing addAsset');

        if(await this._isExists(ctx,AuctionType.ASSET,id)) {
            throw new Error(`Asset ${assetId} already exists.`);
        }

        const minBid = parseFloat(startingPrice);
        const asset = {
            id : id,
            name : name,
            seller : ctx.clientIdentity.getID(),
            organization: ctx.clientIdentity.getMSPID(),
            status : AssetStatus.SALE,
            startingPrice : minBid
        };

        await this._put(ctx,AuctionType.ASSET,id,asset);
        return `Asset ${name} is now open for bidding`;
    }

    async getAssets(ctx, status = ''){
        console.log(`Executing getAsset for ${status}`);
        let resultSet = [];
        const listObj = JSON.parse(await this._getList(ctx, AuctionType.ASSET, status));
        status = status || '';
        console.log(`Status = ${status}, Length = ${listObj.length}`);
        for(let i=0; i<listObj.length; i++){
            if (status === ''){
                console.log(`Obj - ${listObj[i].toString()}`)
                resultSet.push(listObj[i]);
            } else if(status === listObj[i].status){
                resultSet.push(listObj[i]);
            }  
        }
        console.log('Exiting getAsset');
        return resultSet;
    }

    async _isExists(ctx, auctionType, id){
        console.log("Executing IsExists");
        const key = (auctionType === AuctionType.ASSET) ? assetObjType : bidObjType;
        const compositeKey = ctx.stub.createCompositeKey(key,[id]);
        let objBytes;
        if(auctionType === AuctionType.ASSET){
            console.log(`Composite Key - ${compositeKey}`)
            objBytes = await ctx.stub.getState(compositeKey);
        }
        console.log('Exiting isExists')
        return objBytes && objBytes.length > 0;
    }

    async _getList(ctx, auctionType, assetStatus='') {
        console.log(`Executing _getList for ${auctionType}`);
        
        let returnResult = [];
        if(auctionType === AuctionType.ASSET){
            const listIterator = ctx.stub.getStateByPartialCompositeKey(assetObjType,[]);
            for await (const obj of listIterator) {
                const asset = JSON.parse(obj.value.toString())
                returnResult.push(asset);
            }
        } else {}

        console.log('Exiting _getList. Return = '+returnResult);
        return JSON.stringify(returnResult);
    }

    async _get(ctx, auctionType, id, collection='') {
        console.log(`Executing _get for ${auctionType}`);
        const key = (auctionType === AuctionType.ASSET) ? assetObjType : bidObjType;
        let compositeKey = ctx.stub.createCompositeKey(key,[id]);
        let objBytes;
        if(auctionType === AuctionType.ASSET) {
            console.log(`Asset Composite Key - ${compositeKey}`);
            objBytes = await ctx.stub.getState(compositeKey);
        } else {
            console.log(`Bid Composite Key - ${compositeKey}, collection - ${collection}`);
            collection = collection || '';
            objBytes = await ctx.stub.getPrivateData(collection,compositeKey);
        }

        if(!objBytes || objBytes.length === 0) {
            return null;
        }

        const returnObj = JSON.parse(objBytes.toString());
        console.log('Exiting _get');
        return returnObj;
    }

    async _put(ctx, auctionType, id, obj, collection='') {
        console.log(`Executing _put for ${auctionType}`);
        const key = (auctionType === AuctionType.ASSET) ? assetObjType : bidObjType;
        const compositeKey = ctx.stub.createCompositeKey(key,[id]);
        if(auctionType === AuctionType.ASSET) {
            console.log(`Composite Key - ${compositeKey}`);
            await ctx.stub.putState(compositeKey,Buffer.from(JSON.stringify(obj)));
        } else {
            collection = collection || '';
            console.log(`Composite Key - ${compositeKey}, collection - ${collection}`);
            await ctx.stub.putPrivateData(collection,compositeKey,Buffer.from(JSON.stringify(obj)));
        }
        console.log('Exiting _put');
    }

    _getCollectionName(org1, org2) {
        return [org1,org2].sort().join('-');
    }
}

module.exports = AuctionContract;