'use strict'
const {Wallets, Gateway} = require('fabric-network');
const fs = require('fs');
const path = require('path');

const testNetworkRoot = path.resolve(require('os').homedir(),'go/src/github.com/hyperledger/fabric-samples/test-network');

async function main(){
    try { 
        const gateway = new Gateway();
        const wallet = await Wallets.newFileSystemWallet('./wallets');

        const predefinedOrgs = [{
            name:'org1.example.com',
            mspId: 'Org1MSP',
            users:['Admin','User1']  
          },{
              name:'org2.example.com',
              mspId: 'Org2MSP',
              users:['Admin','User1']  
          }];

          for(const org of predefinedOrgs) {
            const credPath = path.join(testNetworkRoot,'/organizations/peerOrganizations/',org.name,'/users');
            for(const user of org.users){
                const mspFolderPath = path.join(credPath,`${user}@${org.name}`,'/msp');
                const certFile = path.join(mspFolderPath,'/signcerts/', fs.readdirSync(path.join(mspFolderPath,'/signcerts/'))[0]);
                const keyFile = path.join(mspFolderPath,'/keystore/', fs.readdirSync(path.join(mspFolderPath,'/keystore/'))[0]);
                const cert = fs.readFileSync(certFile).toString();
                const key = fs.readFileSync(keyFile).toString();
                const identity = {
                    credentials: {
                        certificate:cert,
                        privateKey:key,
                    },
                    mspId: org.mspId,
                    type:'X.509'
                }
                const identityLable = `${user}@${org.name}`;
                await wallet.put(identityLable,identity);
            }
          }


    } catch (error) {
        console.log('Error while adding Wallets');
        console.log(error.stack);
    }
}

main().then(()=>{
    console.log('Done');
}).catch((error)=>{
    console.log(e);
    process.exit(1);
})