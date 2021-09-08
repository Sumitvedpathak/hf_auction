'use strict'

const fs = require('fs');
const path = require('path');
const {Wallets, Gateway} = require('fabric-network');

const testNetworkRoot = path.resolve(require('os').homedir(),'go/src/github.com/hyperledger/fabric-samples/test-network');

async function main() {

    const gateway = new Gateway();
    const wallet = await Wallets.newFileSystemWallet('./wallets');

    try {
        let args = process.argv.slice(2);

        const identityLable = args[0];
        const functionName = args[1];

        const orgNameDomain = identityLable.split('@')[1];
        const orgName = orgNameDomain.split('.')[0];

        let optional = {};
        if(args.length > 2){
            optional = JSON.parse(args[2]);
        }

        const connectionProfile = JSON.parse(
            fs.readFileSync(path.join(testNetworkRoot,'organizations/peerOrganizations',orgNameDomain,`/connection-${orgName}.json`),
            'utf8')
        );

        const connectionOptions = {
            identity:identityLable,
            wallet:wallet,
            discovery: {enable:true, asLocalhost:true}
        };

        console.log('Connecting to Fabric network');
        await gateway.connect(connectionProfile,connectionOptions);

        console.log('Getting mychannel network');
        const network = await gateway.getNetwork('mychannel');

        console.log('Getting Contract');
        const contract = network.getContract('auction2');

        let contractArgs = optional.args || [];

        console.log('Submitting Transaction');
        const resp = await contract.createTransaction(functionName)
        .setEndorsingPeers([gateway.getIdentity().mspId])
        .submit(...contractArgs);

        console.log(resp);




    } catch(error) {
        console.log('error processing transaction.');
        console.log('Error - '+ error.stack);
    } finally {
        console.log('Disconnect from GW');
        gateway.disconnect();
    }

}

main();