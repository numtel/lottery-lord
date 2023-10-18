// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

import "../contracts/LotteryERC721.sol";

contract Deploy is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    vm.startBroadcast(deployerPrivateKey);

    string memory name = vm.envString("COLLECTION_NAME");
    string memory symbol = vm.envString("COLLECTION_SYMBOL");
    address randomSource = vm.envAddress("RANDOM_SOURCE");

    new LotteryERC721(name, symbol, IRandom(randomSource));

    vm.stopBroadcast();
  }
}



