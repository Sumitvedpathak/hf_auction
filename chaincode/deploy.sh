CHAINCODE=$1
VERSION=$2

echo "--------------------------Deploying Chaincode --------------------------------------------------------"

./network.sh deployCC -ccn ${CHAINCODE}${VERSION} -ccv ${VERSION}.0 -ccp ../proj/hf_auction/chaincode -ccl javascript  -cccg ../proj/hf_auction/chaincode/collection/config.json -ccep "OR('Org1MSP.member','Org2MSP.member','Org3MSP.member')"

# ./network.sh deployCC -ccn ${CHAINCODE}${VERSION} -ccv ${VERSION}.0 -ccp ../proj/hf_auction/chaincode -ccl javascript  -cccg ../proj/hf_auction/chaincode/collection/config.json -ccep "OR('Org1MSP.member','Org2MSP.member')"

export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
export orderer="-o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"
export peer_org1="--peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export peer_org2="--peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
export peer_org3="--peerAddresses localhost:11051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt"

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org3MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp
export CORE_PEER_ADDRESS=localhost:11051

echo "--------------------------Installing Chaincode on Org3 --------------------------------------------------------"
peer lifecycle chaincode install ${CHAINCODE}${VERSION}.tar.gz

peer lifecycle chaincode queryinstalled >&log.txt
cat log.txt
PACKAGE_ID=$(sed -n "/${CHAINCODE}${VERSION}_${VERSION}/{s/^Package ID: //; s/, Label:.*$//; p;}" log.txt)
# echo Chaincode is ${CHAINCODE}${VERSION}_${VERSION}.0
echo PackageID is ${PACKAGE_ID}

echo "--------------------------Deploying Chaincode on Org3--------------------------------------------------------"

peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name ${CHAINCODE}${VERSION} --version ${VERSION}.0 --package-id $PACKAGE_ID --sequence 1 --tls --cafile ${orderer} --collections-config ../proj/hf_auction/chaincode/collection/config.json --signature-policy "OR('Org1MSP.member','Org2MSP.member','Org3MSP.member')"

echo "--------------------------------------------------------Now Executing Queries--------------------------------------------------------"

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051


echo 'Adding Asset'
peer chaincode invoke ${orderer} -C mychannel -n ${CHAINCODE}${VERSION} ${peer_org1} ${peer_org2} -c '{"function":"addAsset","Args":["1","Car","50"]}'
sleep 2
echo 'Get Asset List'
peer chaincode invoke ${orderer} -C mychannel -n ${CHAINCODE}${VERSION} ${peer_org1} ${peer_org2} -c '{"function":"getAssetLists","Args":["Asset"]}'
echo 'Get Bid Lists'
peer chaincode invoke ${orderer} -C mychannel -n ${CHAINCODE}${VERSION} ${peer_org1} ${peer_org2} -c '{"function":"getBidLists","Args":["1"]}'

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051
sleep 2
echo 'Bidding Org 2'
peer chaincode invoke ${orderer} -C mychannel -n ${CHAINCODE}${VERSION} ${peer_org1} ${peer_org2} -c '{"function":"bid","Args":["Org1MSP1","1","55"]}'
peer chaincode invoke ${orderer} -C mychannel -n ${CHAINCODE}${VERSION} ${peer_org1} ${peer_org2} -c '{"function":"bid","Args":["Org1MSP2","1","65"]}'
peer chaincode invoke ${orderer} -C mychannel -n ${CHAINCODE}${VERSION} ${peer_org1} ${peer_org2} -c '{"function":"bid","Args":["Org1MSP3","1","70"]}'

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org3MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp
export CORE_PEER_ADDRESS=localhost:11051
echo 'Bidding Org 3'
peer chaincode invoke ${orderer} -C mychannel -n ${CHAINCODE}${VERSION} ${peer_org1} ${peer_org2} -c '{"function":"bid","Args":["Org2MSP1","1","60"]}'
peer chaincode invoke ${orderer} -C mychannel -n ${CHAINCODE}${VERSION} ${peer_org1} ${peer_org2} -c '{"function":"bid","Args":["Org2MSP2","1","77"]}'
peer chaincode invoke ${orderer} -C mychannel -n ${CHAINCODE}${VERSION} ${peer_org1} ${peer_org2} -c '{"function":"bid","Args":["Org2MSP3","1","90"]}'


export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
sleep 2
echo 'Get Bid Lists'
peer chaincode invoke ${orderer} -C mychannel -n ${CHAINCODE}${VERSION} ${peer_org1} ${peer_org2} -c '{"function":"getBidLists","Args":["1"]}'
echo 'Closing Bids'
peer chaincode invoke ${orderer} -C mychannel -n ${CHAINCODE}${VERSION} ${peer_org1} ${peer_org2} -c '{"function":"closeBiddingForAsset","Args":["1"]}'
sleep 2
echo 'Get Asset List'
peer chaincode invoke ${orderer} -C mychannel -n ${CHAINCODE}${VERSION} ${peer_org1} ${peer_org2} -c '{"function":"getAssetLists","Args":["Asset"]}'