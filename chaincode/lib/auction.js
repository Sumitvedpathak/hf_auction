'use strict';
const { Contract } = require('fabric-contract-api');

const bidObjType = "bidObjType";
const assetObjType = "assetObjType";
const AuctionType = Object.freeze({ASSET:"asset",BID:"bid"});
const AssetStatus = Object.freeze({SALE: "Sale", SOLD: "Sold", WITHDRAW: "Withdraw"});

const Organizations = ["Org1","Org2"];
class AuctionContract extends Contract{

    async addAsset(ctx, id, name, startingPrice) {
        console.log('Executing addAsset');

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

    async addAsset(ctx, id, name, startingPrice) {
        console.log('Executing addAsset');

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
        const listObj = await this._getList(ctx, AuctionType.ASSET);
        status = status || '';
        console.log(`Status = ${status}, Length = ${listObj.length}`);
        for(let i=0; i<listObj.length; i++){
            if (status === ''){
                resultSet.push(listObj[i]);
            } else if(status.toLower() === listObj[i].status.toLower()){
                resultSet.push(listObj[i]);
            }  
        }
        console.log('Exiting getAsset');
        return resultSet;
    }

    async isExists(ctx, auctionType, id){
        const asset = await this._get(ctx,auctionType,id);
        return !Object.keys(asset).length;
    }

    async _getList(ctx, auctionType) {
        console.log(`Executing _getList for ${auctionType}`);
        
        let returnResult = [];
        if(auctionType === AuctionType.ASSET){
            const listIterator = ctx.stub.getStateByPartialCompositeKey(assetObjType,[]);
            for await (const obj of listIterator) {
                const asset = JSON.parse(obj.value.toString())
                console.log(`Iterator asset - ${asset}`);
                returnResult.push(asset);
            }
        } else {}

        console.log('Exiting _getList. Return = '+returnResult);
        return JSON.stringify(returnResult);
    }

    async _get(ctx, auctionType, id, collection='') {
        console.log(`Executing _get for ${auctionType}`);
        const key = (auctionType === AuctionType.ASSET) ? assetObjType : bidObjType;
        const compositeKey = ctx.stub.createCompositeKey(key,[id]);
        console.log(`Composite Key - ${compositeKey}`);
        let objBytes;
        if(auctionType === AuctionType.ASSET) {
            objBytes = await ctx.stub.getState(compositeKey);
        } else {
            collection = collection || '';
            objBytes = await ctx.stub.getPrivateData(collection,compositeKey);
        }
        const returnObj = JSON.parse(objBytes.toString());
        console.log(`Return Object - ${returnObj}`);
        console.log('Exiting _get');
        return returnObj;
    }

    async _put(ctx, auctionType, id, obj, collection='') {
        console.log(`Executing _put for ${auctionType}`);
        const key = (auctionType === AuctionType.ASSET) ? assetObjType : bidObjType;
        const compositeKey = ctx.stub.createCompositeKey(key,[id]);
        console.log(`Composite Key - ${compositeKey}`);
        console.log(`Object - ${obj}`);
        if(auctionType === AuctionType.ASSET) {
            await ctx.stub.putState(compositeKey,Buffer.from(JSON.stringify(obj)));
        } else {
            collection = collection || '';
            await ctx.stub.putPrivateData(collection,compositeKey,Buffer.from(JSON.stringify(obj)));
        }
        console.log('Exiting _put');
    }
}

module.exports = AuctionContract;