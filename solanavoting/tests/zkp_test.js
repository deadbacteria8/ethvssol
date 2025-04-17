import * as web3 from "@solana/web3.js";
import * as snarkjs from "snarkjs";
import path from "path";
import { buildBn128, utils } from "ffjavascript";
import { expect } from "chai";

import { Console } from "console";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import initWasm, { convert_proof } from "../wasm/pkg/wasm.js";
import { randomInt } from "crypto";


const { unstringifyBigInts } = utils;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const wasmPath = path.join(__dirname, "../circuit", "Vote.wasm");
//const zkeyPath = path.join(__dirname, "../circuit", "Vote_final.zkey");

async function loadWasm() {
    const wasmPath = join(__dirname, "../wasm/pkg/wasm_bg.wasm");

    const wasmBuffer = await readFile(wasmPath);
    console.log(wasmBuffer)
    await initWasm(wasmBuffer);
}

describe("ZKP", () => {
    before(async () => {
        // Initialize the WASM module before any tests run
        await loadWasm();
    });

    /*it("Test", async () => {
        let input = { "a":1,"b":5 };
        let { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
        const curve = await buildBn128();
        let proofProc = unstringifyBigInts(proof);
        let pi_a = g1Uncompressed(curve, proofProc.pi_a);
        console.log(Array(pi_a))
        let proofA = convert_proof(pi_a);
        console.log(proofA)
    })*/

    it("CreateTestData", () => {
        let array = [];

        for(let i = 0; i <= 1000; i++) {
            const user = {
                hasVoted: false,
                age: randomInt(18, 100)
            };
            array.push(user);
        }
        return array;
        
    })
})




