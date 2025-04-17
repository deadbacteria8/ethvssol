
export default {
    CreateVoteAccount: async (methods, voteAccount,name) => {
        return await methods
            .createVoteAccount(name)
            .accounts({
            voteAccount: voteAccount.publicKey,
            })
            .instruction(); 
    },
    SendVote: async (methods, proof_a, proof_b, proof_c, publicInputs, voteAccount) => {

        return await methods
        .submitVote(proof_a, proof_b, proof_c, publicInputs)
        .accounts({
            voteAccount: voteAccount.publicKey,
        })
        .signers()
        .instruction();
    }
}