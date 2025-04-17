#!/bin/bash

# Compile the circom file
echo "Compiling Vote.circom..."
circom Vote.circom --r1cs --wasm --sym
echo "Vote.circom compiled successfully."

# Run powersoftau new command
echo "Running powersoftau new..."
node ../node_modules/snarkjs/cli.js powersoftau new bn128 12 pot12_0000.ptau -v
echo "powersoftau new completed."

# Run powersoftau contribute command
echo "Running powersoftau contribute..."
node ../node_modules/snarkjs/cli.js powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v -e="random text"
echo "powersoftau contribute completed."

# Run powersoftau beacon command
echo "Running powersoftau beacon..."
node ../node_modules/snarkjs/cli.js powersoftau beacon pot12_0001.ptau pot12_beacon.ptau 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"
echo "powersoftau beacon completed."

# Run powersoftau prepare phase2 command
echo "Running powersoftau prepare phase2..."
node ../node_modules/snarkjs/cli.js powersoftau prepare phase2 pot12_beacon.ptau pot12_final.ptau -v
echo "powersoftau prepare phase2 completed."

# Run powersoftau verify command
echo "Running powersoftau verify..."
node ../node_modules/snarkjs/cli.js powersoftau verify pot12_final.ptau
echo "powersoftau verify completed."

# Run zkey new command
echo "Running zkey new..."
node ../node_modules/snarkjs/cli.js zkey new Vote.r1cs pot12_final.ptau Vote_0000.zkey
echo "zkey new completed."

# Run zkey contribute command
echo "Running zkey contribute..."
echo "some random text" | node ../node_modules/snarkjs/cli.js zkey contribute Vote_0000.zkey Vote_final.zkey --name="1st Contributor" -v -e="more random text"
echo "zkey contribute completed."

# Run zkey export verificationkey command
echo "Running zkey export verificationkey..."
node ../node_modules/snarkjs/cli.js zkey export verificationkey Vote_final.zkey verification_key.json
echo "zkey export verificationkey completed."

echo "Script executed successfully!"
