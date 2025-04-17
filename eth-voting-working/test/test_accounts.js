let Parties = require("../../TestData/Parties.js")
const { ethers } = require("hardhat");
const getData = () => {
    for(var i in Parties) {
        Parties[i].Key = ethers.Wallet.createRandom().address;
    }
    return Parties;
}

    exports.getData = getData;
