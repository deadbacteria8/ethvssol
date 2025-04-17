import * as anchor from "@coral-xyz/anchor";


process.env.ANCHOR_PROVIDER_URL = "http://localhost:8899";
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.voting_program;
export { provider };
export default program;