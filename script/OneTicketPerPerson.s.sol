// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

import "../contracts/OneTicketPerPerson.sol";
import "../test/MockVerification.sol";

contract Deploy is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    vm.startBroadcast(deployerPrivateKey);

    address verifications = vm.envAddress("VERIFICATIONS");

    new OneTicketPerPerson(verifications);

    vm.stopBroadcast();
  }
}

contract DeployMockVerification is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    vm.startBroadcast(deployerPrivateKey);

    new MockVerification();

    vm.stopBroadcast();
  }
}

