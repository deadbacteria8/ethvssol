
pragma solidity >=0.7.0 <0.9.0;


contract Voting_program {
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
    uint256 constant alphax  = 9795465329430476641583257384615415945569937089772795679365385111574088102095;
    uint256 constant alphay  = 11358962500655597475707233584789912628749516143980280870043968973878166937826;
    uint256 constant betax1  = 20803065116264764805696367291124290159422012207906491019612995787065367457949;
    uint256 constant betax2  = 5453981423348226299040955794067551899651652962218145315331850085079772238151;
    uint256 constant betay1  = 20844435963200447861288172902951758281500008132770705500516053403404089182969;
    uint256 constant betay2  = 20358361865517144196552582686311167645438286850842316846255319243928475541013;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 14362412518224563215217305140856398465257185153739889118721559999170213224319;
    uint256 constant deltax2 = 11758734701711396443304213288145604804936426407729668932569086763346691161144;
    uint256 constant deltay1 = 6007661382189704639559120687540715990480724778917784281809286917139380492257;
    uint256 constant deltay2 = 13921932380194719706031681152155582248568699458113915577272160707883740852009;
    uint256 constant IC0x = 20681048944043166160389038196060425798629899529000559761399109838505029337897;
    uint256 constant IC0y = 14533905007948902280433495537550048529533860486024281558866665701254310345930;
    uint256 constant IC1x = 5528940669077279465370780628598530062718019285010774810818571606464463923837;
    uint256 constant IC1y = 9801857240352038138054655072343943613560928216052954962399866854958915638826;
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;
    uint16 constant pLastMem = 896;
    struct Candidate {
        string name;
        uint256 voteCount;
    }
    struct CandidateInput {
        string Party;
        address Key;
    }

    mapping(address => Candidate) public candidates;
    address[] public candidateAddresses;
    address owner;
    
    constructor(CandidateInput[] memory _candidates) {
        for (uint256 i = 0; i < _candidates.length; i++) {
            candidates[_candidates[i].Key] = Candidate({
                name: _candidates[i].Party,
                voteCount: 0
            });
            candidateAddresses.push(_candidates[i].Key);
        }

        owner = msg.sender;
    }

    function vote(
        address _candidate, 
        uint[2] calldata _pA, 
        uint[2][2] calldata _pB, 
        uint[2] calldata _pC, 
        uint[1] calldata _pubSignals
    ) public {
        bool proofValid = verifyProof(_pA, _pB, _pC, _pubSignals);
        require(proofValid, "Value proof must be true"); 
        require(_pubSignals[0] == 1, "Value proof must be 1");
        candidates[_candidate].voteCount += 1;
    }

    function getCandidates() public view returns (Candidate[] memory) {
        Candidate[] memory allCandidates = new Candidate[](candidateAddresses.length);

        for (uint256 i = 0; i < candidateAddresses.length; i++) {
            allCandidates[i] = candidates[candidateAddresses[i]];
        }

        return allCandidates;
    }

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[1] calldata _pubSignals) internal view returns (bool) {
        bool isValid;
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            

            // Validate all evaluations
            let result := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            isValid := result
         }
        return isValid;
     }
 }



