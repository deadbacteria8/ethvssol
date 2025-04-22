const { expect } = require("chai");
const { ethers } = require("hardhat");
const path = require("path");
const snarkjs = require("snarkjs");
const wasmPath = path.join(__dirname, "../../circuit", "Vote.wasm");
const zkeyPath = path.join(__dirname, "../../circuit", "Vote_final.zkey");
const { getData } = require('./test_accounts');
const fs = require("fs");

describe("VotingProgram", function () {
  const voteCounts = [50];
  const votingRounds = 1;
  let allResults = {};

  console.log(`\n=======================================================================`);
  console.log(`Starting ETH Voting with ${votingRounds} rounds with ${voteCounts} ballots`);
  console.log(`=======================================================================\n`);

  voteCounts.forEach((votesToBeDone) => {
    describe(`VotesToBeDone: ${votesToBeDone}`, function () {
      let votingRoundsResult = {};
      let txFeesPerRound = {};

      Array.from({ length: votingRounds }).forEach((_, round) => {
        describe(`Voting Round ${round + 1}`, function () {
          let parties;
          let voting;
          let owner, addr1, addr2;
          let timeElapsed;
          let txFees;
          const BLOCK_GAS_LIMIT = 1000000;
          const blockTimeMs = 1;
          let currentBlockGas = 0;

          before(async function () {
            parties = getData();
            [owner, addr1, addr2] = await ethers.getSigners();
            const Voting = await ethers.getContractFactory("Voting_program");
            voting = await Voting.deploy(parties);
            await ethers.provider.send("evm_mine", []);
            await voting.waitForDeployment();
          });

          it("Votes for a candidate", async function () {
            this.timeout(1000000);
            const provider = ethers.provider;
            let lastMine = performance.now();
            const completeTransactionPromise = async (voteId) => {
              const voteAccount = (parties[Math.floor(Math.random() * parties.length)]).Key;
              let input = { "voterId": voteId };

              let { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);

              const callData = await snarkjs.groth16.exportSolidityCallData(proof, [publicSignals]);
              const argv = JSON.parse("[" + callData + "]");
              const [a, b, c, inputArray] = argv;
              const estimatedGas = await voting.vote.estimateGas(voteAccount, a, b, c, inputArray, {
                from: owner.address,
              });
              const txFunc = async (nonce) => {
                await voting.vote(voteAccount, a, b, c, inputArray, {
                  gasLimit: estimatedGas, 
                  nonce: nonce,
                });
              }
              return { "txFunc": txFunc, "estimatedGas": estimatedGas};
            };

            const promiseArray = [];
            proofTimes = [];
            txFees = [];
            const startTime = performance.now();
            for (let i = 1; i <= votesToBeDone; i++) {
              promiseArray.push(completeTransactionPromise(i));
            }

            const results = await Promise.all(promiseArray);
            let currentGas = 0;
            let txFuncs = [];
            for(let i in results) {
              const {txFunc, estimatedGas} = results[i];
              if(currentGas + parseInt(estimatedGas.toString()) > BLOCK_GAS_LIMIT) {
                let baseNonce = await provider.getTransactionCount(owner.address);
                await Promise.all(txFuncs.map((fn, index) => fn(baseNonce + index)));
                const currentTime = performance.now();
                const elapsedTimeInSec = currentTime - lastMine;
                const timeLeft = blockTimeMs - elapsedTimeInSec;
                const remainingTime = Math.max(0, timeLeft);
                await new Promise(resolve => setTimeout(resolve, remainingTime));
                await ethers.provider.send("evm_mine", []);
                lastMine = performance.now();
                txFuncs = [];
                currentGas = 0;
              }
              txFuncs.push(txFunc);
              currentGas+= parseInt(estimatedGas.toString());
            }

            if(txFuncs.length > 0) {
              let baseNonce = await provider.getTransactionCount(owner.address);
              await Promise.all(txFuncs.map((fn, index) => fn(baseNonce + index)));
              const currentTime = performance.now();
              const elapsedTimeInSec = currentTime - lastMine;
              const timeLeft = blockTimeMs - elapsedTimeInSec;
              const remainingTime = Math.max(0, timeLeft);
              await new Promise(resolve => setTimeout(resolve, remainingTime));
              await ethers.provider.send("evm_mine", []);
            }
            const endTime = performance.now();
            timeElapsed = endTime - startTime;
            txFeesPerRound[round + 1] = txFees;
          });
          after("Print results", async function () {
            this.timeout(1000000);
            let totalRecordedVotes = 0;
            let partyVotes = {};
            const allCandidates = await voting.getCandidates();
            let partyIndex = 0;
            allCandidates.forEach(candidate => {
              totalRecordedVotes += Number(candidate.voteCount);
              partyVotes[`party_${partyIndex}`] = Number(candidate.voteCount);
              partyIndex++;
            })

            partyVotes["ballot_count"] = totalRecordedVotes;
            partyVotes["execution_time_ms"] = Number(timeElapsed.toFixed(2));
            partyVotes["total_tx_fee_wei"] = txFees.reduce((a, b) => a + Number(b), 0);
            partyVotes["avg_tx_fee_ETH"] = Number(
              (txFees.reduce((a, b) => a + Number(b), 0) / 1e18).toFixed(6)
            );
            
            const votesAreMissing = totalRecordedVotes == votesToBeDone ? 
              "All votes are recorded on the blockchain" : 
              "Votes are missing, test case is not valid";
            console.log(votesAreMissing);
            votingRoundsResult[round + 1] = partyVotes;
          });
        });
      });

      after(function () {
        this.timeout(1000000);
        const table = [];
        for (const round in votingRoundsResult) {
          const result = votingRoundsResult[round];
          table.push({
            Round: round,
            ...result
          });
        }
        console.log(`\n==================================================================`);
        console.log(`Completed ${votingRounds} rounds with ${votesToBeDone} ballots`);
        console.log(`==================================================================\n`);

        allResults[votesToBeDone] = table;
      });
    });
  });

  after(function () {
    this.timeout(1000000);
    const fullTable = [];

    for (const voteCount in allResults) {
      allResults[voteCount].forEach(row => {
        fullTable.push({
          VotesToBeDone: voteCount,
          ...row
        });
      });
    }

    console.log("All Combined Voting Results:");
    console.table(fullTable);

    const headers = Object.keys(fullTable[0]);
    const csvRows = [
      headers.join(','),
      ...fullTable.map(row => headers.map(h => row[h]).join(','))
    ];

    const csvContent = csvRows.join('\n');
    const outputPath = path.join(__dirname, 'combined_voting_results_eth.csv');
    fs.writeFileSync(outputPath, csvContent, 'utf8');

    console.log(`Combined CSV written to ${outputPath}`);
  });
});
