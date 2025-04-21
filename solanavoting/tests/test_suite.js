
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const wasmPath = path.join(__dirname, "../../circuit", "Vote.wasm");
const zkeyPath = path.join(__dirname, "../../circuit", "Vote_final.zkey");
const { unstringifyBigInts } = utils;
const {SendVote} = ProgramMethods;

describe("voting_program", () => {
    let parties;
    let timeElapsed;
    const votesToBeDone = 3;
    before(async () => {
        await loadWasm();
        //This initializes vote accounts on the blockchain
        parties = await AddPartiesSolana();
    });
    it("Votes for a candidate", async function () {
        //This sets the max amount of time the test case can run
        this.timeout(1000000);
        let curve = await buildBn128();
        const completeTransactionPromise = async (voteId) => {
            //This randomizes which voteAccount to vote for
            const voteAccount = (parties[Math.floor(Math.random() * parties.length)]).Key;
            let input = { "voterId":voteId };
            let { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
            let proofProc = unstringifyBigInts(proof);
            publicSignals = unstringifyBigInts(publicSignals);
            const pi_a = g1Uncompressed(curve, proofProc.pi_a);
            const proof_a = rust_endianess(Buffer.from(pi_a));
            const pi_b = g2Uncompressed(curve, proofProc.pi_b);
            const pi_c = g1Uncompressed(curve, proofProc.pi_c);
            const publicSignalsBuffer = to32ByteBuffer(BigInt(publicSignals[0]));
            let transaction = new Transaction();
            const startTime = Date.now();
            const instruction = await SendVote(program.methods, proof_a, pi_b, pi_c, publicSignalsBuffer, voteAccount);
            transaction.add(instruction);
            await provider.sendAndConfirm(transaction);
            const endTime = Date.now();
            console.log(`Transaction took ${endTime - startTime} ms`);
        }
        let promiseArray = [];
        let startTime = performance.now();
        for(let i = 1; i <= votesToBeDone; i++) {
            promiseArray.push(completeTransactionPromise(i));
        }
        //To maximise the amount of votes being sent at the same time
        await Promise.all(promiseArray);
        let endTime = performance.now();
        timeElapsed = endTime - startTime;
    });
    after("Print results", async () => {
        console.log("Total time " + timeElapsed);
        let totalRecordedVotes = 0;
        for(var i in parties) {
            const voterState = await program.account.voteAccount.fetch(parties[i].Key.publicKey);
            console.log(voterState);
            console.log(voterState.voteCount.toNumber())
            totalRecordedVotes = totalRecordedVotes + voterState.voteCount.toNumber();
        }
        //The value of votesAreMissing is dependent on if the total amount of recorded votes on the blockchain-
        //matches the amount of votes to be done from the beggining.
        const votesAreMissing = totalRecordedVotes == votesToBeDone ? "All votes are recorded on the blockchain" : "Votes are missing, test case is not valid";
        console.log(votesAreMissing);
    })
});
