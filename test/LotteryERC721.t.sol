// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../contracts/LotteryERC721.sol";
import "../contracts/DummyERC20.sol";
import "./MockRandom.sol";
import "./DummyTicketValidator.sol";

contract LotteryERC721Test is Test {
    LotteryERC721 public collection;
    DummyERC20 public payToken;
    MockRandom public randomSource;

    function setUp() public {
      randomSource = new MockRandom();
      collection = new LotteryERC721("Test", "TEST", randomSource);
      payToken = new DummyERC20("Test", "TEST");
    }

    function testSingleBuyer() public {
      ILotteryERC721.PotShareEntry[] memory shares = new ILotteryERC721.PotShareEntry[](2);
      shares[0].recipient = address(0);
      shares[0].share = 0xcccccccccccccccc;
      shares[1].recipient = address(1);
      shares[1].share = 0x3333333333333333;

      uint256 ticketPrice = 1000;
      uint256 duration = 100;

      ILotteryERC721.LotteryConfig memory config = ILotteryERC721.LotteryConfig(
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

    function testManyBuyers(uint64 randomValue, uint256 buyerCount, uint64 shareToCause) public {
      buyerCount = bound(buyerCount, 1, 90);

      ILotteryERC721.PotShareEntry[] memory shares = new ILotteryERC721.PotShareEntry[](2);
      shares[0].recipient = address(0);
      shares[0].share = 0xffffffffffffffff - shareToCause;
      shares[1].recipient = address(1);
      shares[1].share = shareToCause;

      uint256 ticketPrice = 1000;
      uint256 duration = 100;

      ILotteryERC721.LotteryConfig memory config = ILotteryERC721.LotteryConfig(
        'Test Lottery', 'Winner take all?', shares, ticketPrice, address(payToken),
        block.timestamp + duration, address(0)
      );

      uint256 tokenId = collection.mint(config);

      uint256 buyerAddressOffset = 100;
      uint256 totalSharesBought;
      address[] memory buyers = new address[](buyerCount);
      uint256[] memory sharesToBuy = new uint256[](buyerCount);

      for(uint i = 0; i < buyerCount; i++) {
        sharesToBuy[i] = 10 * (i + 1);
        totalSharesBought += sharesToBuy[i];
        buyers[i] = address(uint160(buyerAddressOffset + i));

        vm.startPrank(buyers[i]);
        payToken.mint(ticketPrice * sharesToBuy[i]);
        payToken.approve(address(collection), ticketPrice * sharesToBuy[i]);
        collection.buyTickets(tokenId, sharesToBuy[i]);
        vm.stopPrank();
      }

      vm.warp(block.timestamp + duration + 3);
      collection.beginProcessLottery(tokenId);

      randomSource.pushValue(randomValue);
      collection.finishProcessLottery(tokenId);
      uint256 winner = (randomValue * totalSharesBought / 0xffffffffffffffff);

      uint256 curPos;
      for(uint i = 0; i < buyerCount; i++) {
        if((winner == 0 && curPos == 0) ||
            (curPos + sharesToBuy[i] >= winner && curPos < winner)) {
          assertEq(payToken.balanceOf(address(buyers[i])),
            ticketPrice * totalSharesBought * (0xffffffffffffffff - shareToCause) / 0xffffffffffffffff);
        } else {
          assertEq(payToken.balanceOf(address(buyers[i])), 0);
        }
        curPos += sharesToBuy[i];
      }
      assertEq(payToken.balanceOf(address(1)), ticketPrice * totalSharesBought * shareToCause / 0xffffffffffffffff);
      // XXX Rounding error acceptable?
      assertEq(payToken.balanceOf(address(collection)) <= 1, true);
    }

    function testValidator() public {
      ILotteryERC721.PotShareEntry[] memory shares = new ILotteryERC721.PotShareEntry[](1);
      shares[0].recipient = address(0);
      shares[0].share = 0xffffffffffffffff;

      uint256 ticketPrice = 1000;
      uint256 duration = 100;
      uint256 minimumPurchase = 100;

      DummyTicketValidator validator = new DummyTicketValidator(
        minimumPurchase,
        address(this)
      );

      ILotteryERC721.LotteryConfig memory config = ILotteryERC721.LotteryConfig(
        'Test Lottery', 'Winner take all?', shares, ticketPrice, address(payToken),
        block.timestamp + duration, address(validator)
      );

      uint256 tokenId = collection.mint(config);

      payToken.mint(ticketPrice * minimumPurchase);
      payToken.approve(address(collection), ticketPrice * minimumPurchase);

      vm.expectRevert();
      collection.buyTickets(tokenId, minimumPurchase - 1);

      collection.buyTickets(tokenId, minimumPurchase);

      vm.startPrank(address(1));
      payToken.mint(ticketPrice * minimumPurchase);
      payToken.approve(address(collection), ticketPrice * minimumPurchase);

      vm.expectRevert();
      collection.buyTickets(tokenId, minimumPurchase);
      vm.stopPrank();

      vm.warp(block.timestamp + duration + 3);
      collection.beginProcessLottery(tokenId);

      randomSource.pushValue(0x7777777777777777);
      collection.finishProcessLottery(tokenId);

      assertEq(payToken.balanceOf(address(this)), ticketPrice * minimumPurchase);
      assertEq(payToken.balanceOf(address(collection)), 0);
    }
}

