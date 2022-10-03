import { formatBytes32String } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { proposals } from "../constants/proposals";
import { Ballot, Ballot__factory } from "../typechain-types";
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import ballotABI from '../artifacts/contracts/Ballot.sol/Ballot.json';
import { BALLOT_CONTRACT_ADDRESS } from "../constants/addresses";
dotenv.config();

const setupProvider = () => {
    const options = {
        alchemy: process.env.ALCHEMY_API_KEY,
        infura: process.env.INFURA_API_KEY,
    }
    const provider = ethers.providers.getDefaultProvider('goerli', options);
    return provider;
}

async function main() {
    console.log('Ballot Contract deployment started');

    const provider = setupProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? '');
    const signer = wallet.connect(provider);
    const balanceBN = await signer.getBalance();
    const balance = Number(ethers.utils.formatEther(balanceBN));
    const selectedVoter = '0x450CA0dCF46cdB19d21b609BE72cD013F6F1E7db';
    console.log('Wallet Balance:', balance);

    const anotherWallet = new ethers.Wallet(process.env.ANOTHER_PRIVATE_KEY ?? '');
    const anotherSigner = anotherWallet.connect(provider);

    if (balance < 0.1) {
        throw new Error('Not enough balance');
    }

    const ballotFactory = new Ballot__factory(signer);
    let ballotContract: Ballot;
    const proposalsByteLike = proposals.map(p => formatBytes32String(p));

    if (!BALLOT_CONTRACT_ADDRESS) {
        ballotContract = await ballotFactory.deploy(proposalsByteLike);
        await ballotContract.deployed();
        console.log('Ballot Contract deployed successfully');
    } else {
        ballotContract = new ethers.Contract(BALLOT_CONTRACT_ADDRESS, ballotABI.abi, signer) as Ballot;
    }

    // chairperson
    const chairPerson = await ballotContract.chairperson();
    console.log({ chairPerson });

    // proposals.forEach(async (p, i) => {
    //     const proposal = await ballotContract.proposals(i);
    //     const name = ethers.utils.parseBytes32String(proposal.name);
    //     console.log(i, name, proposal);
    // });
    let voterForAddress1;
    try {
        voterForAddress1 = await ballotContract.voters(selectedVoter);
        console.log({voterForAddress1});
    } catch (error) {
        console.log(error)
    }

    // Give voting rights
    try {
        const rightToVoteTx = await ballotContract.giveRightToVote(selectedVoter);
        const rightToVoteReceTxReceipt = await rightToVoteTx.wait();
        console.log({rightToVoteReceTxReceipt});
    } catch (error) {
        console.log(error);
    }
    // Give voting rights end here

    // Delegate vote starts here
    try {
        const delegateVoteTx = await ballotContract.connect(anotherSigner).delegate(signer.address);
        const delegateTxReceipt = await delegateVoteTx.wait();
        console.log({delegateTxReceipt});
    } catch (error) {
        console.log(error);
    }
    // Delegate vote ends here


    // Casting vote starts here
    try {
        const castVoteTx = await ballotContract.connect(signer).vote(0);
        const castVoteTxReceipt = await castVoteTx.wait();
        console.log({castVoteTxReceipt});
    } catch (error) {
        console.log(error);
    }
    // Casting vote ends here

    try {
        const winningProposalNumber = await ballotContract.winningProposal();
        console.log({winningProposalNumber});

        const winningProposalName = await ballotContract.winnerName();
        console.log(ethers.utils.parseBytes32String(winningProposalName));
    } catch (error) {
        console.log(error);
    }

    voterForAddress1 = await ballotContract.voters(selectedVoter);
    console.log(voterForAddress1);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
