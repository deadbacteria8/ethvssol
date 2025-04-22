

import { buildBn128, utils } from "ffjavascript";
import { Transaction } from "@solana/web3.js";
import ProgramMethods from "./ProgramMethods/ProgramMethods.js"
import loadWasm from "./Initialization/WasmInit.js";
import program, {provider} from "./Initialization/AnchorProgramInit.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { AddPartiesSolana } from "./SeedData.js";
import * as snarkjs from "snarkjs";
import { g1Uncompressed, g2Uncompressed, to32ByteBuffer} from "./Helper/Uncompression.js";
import { rust_endianess } from "../wasm/pkg/wasm.js";
import * as fs from "fs"
  
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const wasmPath = path.join(__dirname, "../../circuit", "Vote.wasm");
const zkeyPath = path.join(__dirname, "../../circuit", "Vote_final.zkey");
const { unstringifyBigInts } = utils;
const {SendVote} = ProgramMethods;

describe("voting_program", async () => {
    const voteCounts = [4];
    const votingRounds = 1;
    const LAMPORTS_PER_SOL = 1_000_000_000;
    let allResults = {};

    console.log(`\n=======================================================================`);
    console.log(`Starting SOLANA Voting with ${votingRounds} rounds with ${voteCounts} ballots`);
    console.log(`=======================================================================\n`);

    voteCounts.forEach((votesToBeDone) => {
        describe(`VotesToBeDone: ${votesToBeDone}`, () => {
            let votingRoundsResult = {};
            let proofTimesPerRound = {};
            let txFeesPerRound = {};

            Array.from({ length: votingRounds }).forEach((_, round) => {
                describe(`Voting Round ${round + 1}`, () => {
                    let parties;
                    let timeElapsed;
                    let proofTimes;
                    let txFees;
                    let curve;

                    before(async () => {
                        await loadWasm();
                        curve = await buildBn128();
                        parties = await AddPartiesSolana();
                    });


                    it("Votes for a candidate", async function () {
                        this.timeout(1000000);
                        const completeTransactionPromise = async (voteId) => {
                            const voteAccount = (parties[Math.floor(Math.random() * parties.length)]).Key;
                            let input = { "voterId": voteId };

                            let { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);


                            let proofProc = unstringifyBigInts(proof);
                            publicSignals = unstringifyBigInts(publicSignals);
                            const pi_a = g1Uncompressed(curve, proofProc.pi_a);
                            const proof_a = rust_endianess(Buffer.from(pi_a));
                            const pi_b = g2Uncompressed(curve, proofProc.pi_b);
                            const pi_c = g1Uncompressed(curve, proofProc.pi_c);
                            const publicSignalsBuffer = to32ByteBuffer(BigInt(publicSignals[0]));


                            return await SendVote(program.methods, proof_a, pi_b, pi_c, publicSignalsBuffer, voteAccount);
                        };

                        const promiseArray = [];
                        proofTimes = [];
                        txFees = [];

                        
                        const startTime = performance.now();
                        for (let i = 1; i <= votesToBeDone; i++) {
                            promiseArray.push(completeTransactionPromise(i));
                        }
                        
                        const results = await Promise.all(promiseArray);
                        let transaction = new Transaction();
                        let blockhash  = (await provider.connection.getLatestBlockhash()).blockhash;
                        transaction.recentBlockhash = blockhash;
                        transaction.feePayer = provider.wallet.publicKey;
                        for(let i in results) {
                            const instruction = results[i];
                            const serializedInstruction = instruction.data;
                            const instructionSize = serializedInstruction.length
                            const serialized = transaction.serialize({
                                verifySignatures: false,
                                requireAllSignatures: false,
                            })
                            const size = serialized.length + 1 + (transaction.signatures.length * 64)
                            if(size + instructionSize > 1232) {
                                const message = transaction.compileMessage();
                                const { value: fee } = await provider.connection.getFeeForMessage(message);
                                txFees.push(fee);
                                await provider.sendAndConfirm(transaction);
                                transaction = new Transaction();
                                blockhash  = (await provider.connection.getLatestBlockhash()).blockhash;
                                transaction.recentBlockhash = blockhash;
                                transaction.feePayer = provider.wallet.publicKey;
                            }
                            transaction.add(results[i])
                        }

                        const message = transaction.compileMessage();
                        const { value: fee } = await provider.connection.getFeeForMessage(message);
                        txFees.push(fee);
                        await provider.sendAndConfirm(transaction);
                        

                        const endTime = performance.now();
                        timeElapsed = endTime - startTime;



                        txFeesPerRound[round + 1] = txFees;
                    });

                    after("Print results", async () => {
                        console.log("Total time " + timeElapsed);
                        let totalRecordedVotes = 0;
                        let partyVotes = {};
                        for (var i in parties) {
                            const voterState = await program.account.voteAccount.fetch(parties[i].Key.publicKey);
                            // console.log(voterState);
                            totalRecordedVotes += voterState.voteCount.toNumber();
                            partyVotes[`party_${i}`] = voterState.voteCount.toNumber();
                        }

                        partyVotes["ballot_count"] = totalRecordedVotes;
                        partyVotes["execution_time_ms"] = Number(timeElapsed.toFixed(2));
                        partyVotes["total_tx_fee_lamports"] = txFees.reduce((a, b) => a + b, 0);
                        partyVotes["avg_tx_fee_SOL"] = Number(
                            (txFees.reduce((a, b) => a + b, 0) / LAMPORTS_PER_SOL).toFixed(6)
                        );
                        
                        const votesAreMissing = totalRecordedVotes == votesToBeDone ? "All votes are recorded on the blockchain" : "Votes are missing, test case is not valid";
                        console.log(votesAreMissing);
                        votingRoundsResult[round + 1] = partyVotes;
                    });
                });
            });
            after(() => {
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
    after(() => {
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
        const outputPath = path.join(__dirname, 'combined_voting_results.csv');
        fs.writeFileSync(outputPath, csvContent, 'utf8');
    
        console.log(`Combined CSV written to ${outputPath}`);
    });
});