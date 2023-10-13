// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../contracts/LotteryERC721.sol";
import "../contracts/DummyERC20.sol";

contract LotteryERC721Test is Test {
    LotteryERC721 public collection;

    function setUp() public {
      collection = new LotteryERC721("Test", "TEST");
    }

    function testProcess() public {
//       collection.mint();
    }
}

