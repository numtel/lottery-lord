// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../contracts/LotteryERC721.sol";
import "../contracts/DummyERC20.sol";
import "./MockRandom.sol";

contract LotteryERC721Test is Test {
    LotteryERC721 public collection;
    DummyERC20 public payToken;
    MockRandom public randomSource;

    uint256 constant buyerCount = 10;

    function setUp() public {
      randomSource = new MockRandom();
      collection = new LotteryERC721("Test", "TEST", randomSource);
      payToken = new DummyERC20("Test", "TEST");
    }

    function testSingleBuyer() public {
      LotteryERC721.PotShareEntry[] memory shares = new LotteryERC721.PotShareEntry[](2);
      shares[0].recipient = address(0);
      shares[0].share = 0xcccccccccccccccc;
      shares[1].recipient = address(1);
      shares[1].share = 0x3333333333333333;

      uint256 ticketPrice = 1000;
      uint256 duration = 100;

      LotteryERC721.LotteryConfig memory config = LotteryERC721.LotteryConfig(
        'Test Lottery', 'Winner take all?', shares, ticketPrice, address(payToken),
        block.timestamp + duration, address(0)
      );

      uint256 tokenId = collection.mint(config);

      uint256 sharesToBuy1 = 10000;
      payToken.mint(ticketPrice * sharesToBuy1);
      payToken.approve(address(collection), ticketPrice * sharesToBuy1);
      collection.buyTickets(tokenId, sharesToBuy1);

      // Not yet ended
      vm.expectRevert();
      collection.beginProcessLottery(tokenId);

      // Not yet begun
      vm.expectRevert();
      collection.finishProcessLottery(tokenId);

      vm.warp(block.timestamp + duration + 3);
      collection.beginProcessLottery(tokenId);

      // Not yet fulfilled
      vm.expectRevert();
      collection.finishProcessLottery(tokenId);

      randomSource.pushValue(0x7777777777777777);
      collection.finishProcessLottery(tokenId);

      assertEq(payToken.balanceOf(address(this)), ticketPrice * sharesToBuy1 * 4/5);
      assertEq(payToken.balanceOf(address(1)), ticketPrice * sharesToBuy1 * 1/5);
      assertEq(payToken.balanceOf(address(collection)), 0);
    }

    function testManyBuyers(uint64 randomValue) public {
      vm.assume(randomValue != 0);

      LotteryERC721.PotShareEntry[] memory shares = new LotteryERC721.PotShareEntry[](2);
      shares[0].recipient = address(0);
      shares[0].share = 0xcccccccccccccccc;
      shares[1].recipient = address(1);
      shares[1].share = 0x3333333333333333;

      uint256 ticketPrice = 1000;
      uint256 duration = 100;

      LotteryERC721.LotteryConfig memory config = LotteryERC721.LotteryConfig(
        'Test Lottery', 'Winner take all?', shares, ticketPrice, address(payToken),
        block.timestamp + duration, address(0)
      );

      uint256 tokenId = collection.mint(config);

      uint256 buyerAddressOffset = 100;
      uint256 totalSharesBought;
      address[buyerCount] memory buyers;
      uint256[buyerCount] memory sharesToBuy;

      for(uint i = 0; i < buyerCount; i++) {
        sharesToBuy[i] = 10;
        totalSharesBought += sharesToBuy[i];
        buyers[i] = address(uint160(buyerAddressOffset + i));

        vm.startPrank(buyers[i]);
        payToken.mint(ticketPrice * sharesToBuy[i]);
        payToken.approve(address(collection), ticketPrice * sharesToBuy[i]);
        collection.buyTickets(tokenId, sharesToBuy[i]);
        vm.stopPrank();
      }

      // Not yet ended
      vm.expectRevert();
      collection.beginProcessLottery(tokenId);

      // Not yet begun
      vm.expectRevert();
      collection.finishProcessLottery(tokenId);

      vm.warp(block.timestamp + duration + 3);
      collection.beginProcessLottery(tokenId);

      // Not yet fulfilled
      vm.expectRevert();
      collection.finishProcessLottery(tokenId);

      randomSource.pushValue(randomValue);
      collection.finishProcessLottery(tokenId);
      console.log(randomValue);
      // TODO fix this winner calculation
      uint256 winner = (randomValue * buyerCount / 0xffffffffffffffff);
      if(winner > 0) winner--;
      console.log(winner);


      for(uint i = 0; i < buyerCount; i++) {
        console.log(payToken.balanceOf(buyers[i]));
//         assertEq(payToken.balanceOf(address(buyers[i])),
//           i == winner ? ticketPrice * totalSharesBought * 4/5 : 0);
      }
//       assertEq(payToken.balanceOf(address(this)), ticketPrice * sharesToBuy1 * 4/5);
      assertEq(payToken.balanceOf(address(1)), ticketPrice * totalSharesBought * 1/5);
      assertEq(payToken.balanceOf(address(collection)), 0);
    }
}

