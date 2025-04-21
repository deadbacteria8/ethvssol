const { expect } = require("chai");
const { ethers } = require("hardhat");
const path = require("path");
const snarkjs = require("snarkjs");
const wasmPath = path.join(__dirname, "../../circuit", "Vote.wasm");
const zkeyPath = path.join(__dirname, "../../circuit", "Vote_final.zkey");
const { getData } = require('./test_accounts');
describe("VotingProgram", function () {
  let voting;
  let owner;
  let addr1;
  let addr2;
  const votesToBeDone = 10;
  let parties = getData();
  this.beforeAll(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const Voting = await ethers.getContractFactory("Voting_program");
    candidateNames = ["Alice", "Bob", "Charlie"];
    voting = await Voting.deploy(parties);
    await voting.waitForDeployment();
  });

  it("vote", async function ()  {
    this.timeout(1000000);
    const provider = ethers.provider;
    const baseNonce = await provider.getTransactionCount(owner.address);
    console.log(baseNonce)
    async function createVote (voteId){
      let input = { "voterId": voteId };
      let { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
      const voteAccount = (parties[Math.floor(Math.random() * parties.length)]).Key;
      const callData = await snarkjs.groth16.exportSolidityCallData(proof, [publicSignals]);
      const argv = JSON.parse("[" + callData + "]");
      const [a, b, c, inputArray] = argv;
      const tx = await voting.vote(voteAccount, a, b, c, inputArray, {
        gasLimit: 30000000,
        nonce: baseNonce + voteId - 1,
      });
      await tx.wait();
    }

    let promiseArray = [];
    for(var i = 1; i <= 100; i++) {
      promiseArray.push(createVote(i));
    }
    await Promise.all(promiseArray);
  })

  it("Should initialize with correct candidates", async function () {
    const allCandidates = await voting.getCandidates();
    console.log("All candidates:");
    allCandidates.forEach(candidate => {
        console.log(`Name: ${candidate.name}, Votes: ${candidate.voteCount}`);
    });
  });

});
