'use strict'

const fs = require('fs');
const path = require('path');
const util = require('util');
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

        console.log('Adding Block Listener');
        const blockListener = await network.addBlockListener(
            async (blockEvent) => {
                console.log('');
                console.log('-----------Block Listener----------------');
                console.log(`Block header: ${util.inspect(blockEvent.blockData.header,{showHidden: false, depth: 5})}`);
                // console.log('###############################################');
                // console.log(`Blcok data: ${util.inspect(blockEvent.blockData.data,{showHidden:false,depth:5})}`);
                // console.log('###############################################');
                // console.log(`Block Metadata: ${util.inspect(blockEvent.blockData.metadata,{showHidden:false,depth:5})}`);
                // console.log('###############################################');
            }
        );

        console.log('Getting Contract');
        const contract = network.getContract('aution1');

        console.log('Adding Contract Listener');
        const contractListener = await contract.addContractListener(
            async (contractEvent) => {
                console.log();
                console.log('-----------Contract Listener----------------');
                console.log(`Event name: ${contractEvent.eventName}, payload: ${contractEvent.payload.toString()}`);
                console.log('---------------------------------------------');
                console.log();
            }
        );

        let contractArgs = optional.args || [];

        console.log('Adding Commit Listener');
        let tx = contract.createTransaction(functionName);
        const comitListener = await network.addCommitListener(
            async (error, commitEvent) => {
                console.log();
                console.log('------------------Commit Listener--------------------');
                if(error){
                    console.error(error);
                    return;
                }

                console.log(`Transaction ${commitEvent.transactionId} status: ${commitEvent.status}`);
                console.log('--------------------------------------------------------');
                console.log();
            },network.getChannel().getEndorsers(),
            tx.getTransactionId()
        );

        console.log('Submitting Transaction');
        const resp = await tx.submit(...contractArgs);
        // const resp = await contract.submitTransaction(functionName,...contractArgs);
        // const resp = await contract.createTransaction(functionName)
        // .setEndorsingPeers([gateway.getIdentity().mspId])
        // .submit(...contractArgs);

        console.log("Added Asset successfully.");




    } catch(error) {
        console.log('error processing transaction.');
        console.log('Error - '+ error.stack);
    } finally {
        console.log('Disconnect from GateWay');
        gateway.disconnect();
    }
}

main();