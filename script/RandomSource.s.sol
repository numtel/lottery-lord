// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

import "../contracts/RandomSource.sol";

contract Deploy is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    vm.startBroadcast(deployerPrivateKey);

    uint64 subscriptionId = uint64(vm.envUint("SUBSCRIPTION_ID"));
    address coordinator = vm.envAddress("COORDINATOR_ADDR");
    bytes32 keyHash = vm.envBytes32("KEY_HASH");

    new RandomSource(subscriptionId, coordinator, keyHash);

    vm.stopBroadcast();
  }
}




