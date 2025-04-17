import parties from "../../TestData/Parties.js";
import ProgramMethods from "./ProgramMethods/ProgramMethods.js";
import program, {provider} from "./Initialization/AnchorProgramInit.js";
import * as anchor from "@coral-xyz/anchor";
import { Transaction } from "@solana/web3.js";
const {CreateVoteAccount} = ProgramMethods;
async function AddPartiesSolana() {
    const promises = [];
    for(var i in parties) {
        const key = anchor.web3.Keypair.generate();
        parties[i].Key = key;
        promises.push(CreateVoteAccountPromise(program.methods, key, parties[i].Party));
    }
    await Promise.all(promises);
    return parties;
}

async function CreateVoteAccountPromise(methods, key, party) {
    const instruction = await CreateVoteAccount(methods, key, party);
    const transaction = new Transaction().add(instruction);
    await provider.sendAndConfirm(transaction, [key]);
}

export {AddPartiesSolana}
