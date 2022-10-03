import { formatBytes32String } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { proposals } from "../constants/proposals";
import { Ballot } from "../typechain-types";

async function main() {
  const accounts = await ethers.getSigners();
  
  const proposalsByteLike = proposals.map(p => formatBytes32String(p));

  console.log('Ballot Contract deployment started');

  const ballotContractFactory = await ethers.getContractFactory("Ballot");
  const ballotContractDeploy = await ballotContractFactory.deploy(proposalsByteLike);

  await ballotContractDeploy.deployed();

  console.log('Ballot Contract deployed successfully');

  // chairperson
  const chairPerson = await ballotContractDeploy.chairperson();
  console.log({ chairPerson });

  proposals.forEach(async (p, i) => {
    const proposal = await ballotContractDeploy.proposals(i);
    const name = ethers.utils.parseBytes32String(proposal.name);
    console.log(i, name, proposal);
  });

  let voterForAddress1 = await ballotContractDeploy.voters(accounts[1].address);
  console.log(voterForAddress1);

  // Give voting rights
  const rightToVoteTx = await ballotContractDeploy.giveRightToVote(accounts[1].address);
  const rightToVoteReceTxReceipt = await rightToVoteTx.wait();
  console.log(rightToVoteReceTxReceipt);
  // Give voting rights end here

  voterForAddress1 = await ballotContractDeploy.voters(accounts[1].address);
  console.log(voterForAddress1);

  // Casting vote starts here
  const castVoteTx = await ballotContractDeploy.connect(accounts[1]).vote(0);
  const castVoteTxReceipt = await castVoteTx.wait();
  console.log(castVoteTxReceipt);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
