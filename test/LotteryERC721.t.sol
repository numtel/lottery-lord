// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/LotteryERC721.sol";
import "../contracts/DummyERC20.sol";
import "../contracts/OneTicketPerPerson.sol";
import "./MockRandom.sol";
import "./MockVerification.sol";
import "./DummyTicketValidator.sol";

contract LotteryERC721Test is ILotteryERC721, Test {
  // XXX: Compiler crashes with strange error if this test contract doesn't
  //  inherit the ILotteryERC721 interface. Seems to be something with the
  //  event emission checks. Anyways, to make this contract match the
  //  interface, this unused mapping is here
  mapping(uint256 => mapping(address => uint256)) public ticketsBought;

    LotteryERC721 public collection;
    DummyERC20 public payToken;
    MockRandom public randomSource;

    uint32 constant public callbackGasLimit = 100000;

    function setUp() public {
      randomSource = new MockRandom();
      collection = new LotteryERC721("Test", "TEST", randomSource, "http://localhost/lottery/1337/");
      payToken = new DummyERC20("Test", "TEST");
    }

    function testSingleBuyer() public {
      ILotteryERC721.PotShareEntry[] memory shares = new ILotteryERC721.PotShareEntry[](2);
      shares[0].recipient = address(0);
      shares[0].share = 0xcccccccccccccccc;
      shares[1].recipient = address(1000);
      shares[1].share = 0x3333333333333333;

      uint256 ticketPrice = 1000;
      uint256 duration = 100;

      ILotteryERC721.LotteryConfig memory config = ILotteryERC721.LotteryConfig(
        'Test Lottery', 'Winner take all?', shares, ticketPrice, address(payToken),
        block.timestamp + duration, address(0)
      );

      uint256 tokenId = collection.mint(config);
      assertEq(collection.lotteryStatus(tokenId), 0);

      uint256 sharesToBuy1 = 10000;
      payToken.mint(ticketPrice * sharesToBuy1);
      payToken.approve(address(collection), ticketPrice * sharesToBuy1);

      vm.expectEmit();
      emit ILotteryERC721.TicketsBought(tokenId, address(this), sharesToBuy1);
      collection.buyTickets(tokenId, sharesToBuy1);

      // Not yet ended
      vm.expectRevert();
      collection.beginProcessLottery(tokenId, callbackGasLimit);

      // Not yet begun
      vm.expectRevert();
      collection.finishProcessLottery(tokenId);

      vm.warp(block.timestamp + duration + 3);
      collection.beginProcessLottery(tokenId, callbackGasLimit);
      assertEq(collection.lotteryStatus(tokenId), 1);

      // Cannot cancel after begin processing
      vm.expectRevert();
      collection.cancelLottery(tokenId);

      // Not yet fulfilled
      vm.expectRevert();
      collection.finishProcessLottery(tokenId);

      // Cannot cancel after finishing processing
      vm.expectRevert();
      collection.cancelLottery(tokenId);

      randomSource.pushValue(1, 0x7777777777777777);
      vm.expectEmit();
      emit ILotteryERC721.LotteryEnded(tokenId);
      collection.finishProcessLottery(tokenId);
      assertEq(collection.lotteryStatus(tokenId), 2);

      assertEq(payToken.balanceOf(address(this)), ticketPrice * sharesToBuy1 * 4/5);
      assertEq(payToken.balanceOf(address(1000)), ticketPrice * sharesToBuy1 * 1/5);
      assertEq(payToken.balanceOf(address(collection)), 0);
    }

    function testManyBuyers(uint64 randomValue, uint256 buyerCount, uint64 shareToCause) public {
      buyerCount = bound(buyerCount, 1, 90);

      ILotteryERC721.PotShareEntry[] memory shares = new ILotteryERC721.PotShareEntry[](2);
      shares[0].recipient = address(0);
      shares[0].share = 0xffffffffffffffff - shareToCause;
      shares[1].recipient = address(1000);
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
      collection.beginProcessLottery(tokenId, callbackGasLimit);

      randomSource.pushValue(1, randomValue);
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
      assertEq(payToken.balanceOf(address(1000)), ticketPrice * totalSharesBought * shareToCause / 0xffffffffffffffff);
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
      collection.beginProcessLottery(tokenId, callbackGasLimit);

      randomSource.pushValue(1, 0x7777777777777777);
      collection.finishProcessLottery(tokenId);

      assertEq(payToken.balanceOf(address(this)), ticketPrice * minimumPurchase);
      assertEq(payToken.balanceOf(address(collection)), 0);
    }

    function testOneTicketPerPerson() public {
      MockVerification verifications = new MockVerification();
      OneTicketPerPerson validator = new OneTicketPerPerson(address(verifications));
      ILotteryERC721.PotShareEntry[] memory shares = new ILotteryERC721.PotShareEntry[](1);
      shares[0].recipient = address(0);
      shares[0].share = 0xffffffffffffffff;

      uint256 ticketPrice = 1000;
      uint256 duration = 100;

      ILotteryERC721.LotteryConfig memory config = ILotteryERC721.LotteryConfig(
        'Test Lottery', 'Winner take all?', shares, ticketPrice, address(payToken),
        block.timestamp + duration, address(validator)
      );

      uint256 tokenId = collection.mint(config);

      // Mint double the ticket price because we try buying 2 tickets,
      //  even though it fails, it must fail for the other reason
      payToken.mint(ticketPrice * 2);
      payToken.approve(address(collection), ticketPrice * 2);

      // Hasn't verified yet
      vm.expectRevert();
      collection.buyTickets(tokenId, 1);

      verifications.setStatus(address(this), 0);

      // Can't buy more than one
      vm.expectRevert();
      collection.buyTickets(tokenId, 2);

      // This is the success
      collection.buyTickets(tokenId, 1);

      // Can't buy again
      vm.expectRevert();
      collection.buyTickets(tokenId, 1);
    }

    function testFourWinners() public {
      ILotteryERC721.PotShareEntry[] memory shares = new ILotteryERC721.PotShareEntry[](4);
      shares[0].recipient = address(0);
      shares[0].share = 0x1111111111111111;
      shares[1].recipient = address(1);
      shares[1].share = 0x2222222222222222;
      shares[2].recipient = address(2);
      shares[2].share = 0x3333333333333333;
      shares[3].recipient = address(3);
      shares[3].share = 0x9999999999999999;

      uint256 ticketPrice = 1000;
      uint256 duration = 100;

      ILotteryERC721.LotteryConfig memory config = ILotteryERC721.LotteryConfig(
        'Test Lottery', 'Winner take all?', shares, ticketPrice, address(payToken),
        block.timestamp + duration, address(0)
      );

      uint256 tokenId = collection.mint(config);

      uint160 addressOffset = 1000;
      uint256 sharesToBuy1 = 10000;
      for(uint160 i = 0; i < shares.length; i++) {
        vm.startPrank(address(addressOffset + i));
        payToken.mint(ticketPrice * sharesToBuy1);
        payToken.approve(address(collection), ticketPrice * sharesToBuy1);
        collection.buyTickets(tokenId, sharesToBuy1);
        vm.stopPrank();
      }

      vm.warp(block.timestamp + duration + 3);
      collection.beginProcessLottery(tokenId, callbackGasLimit);
      randomSource.pushValue(1, 0xffffffffffffffff999999999999999966666666666666660000000000000000);
      collection.finishProcessLottery(tokenId);

      assertEq(collection.lotteryRecipients(tokenId, 0), address(addressOffset));
      assertEq(collection.lotteryRecipients(tokenId, 1), address(addressOffset + 1));
      assertEq(collection.lotteryRecipients(tokenId, 2), address(addressOffset + 2));
      assertEq(collection.lotteryRecipients(tokenId, 3), address(addressOffset + 3));
      uint256 totalPot = ticketPrice * sharesToBuy1 * shares.length;
      for(uint160 i = 0; i < shares.length; i++) {
        assertEq(collection.lotteryRecipientAmounts(tokenId, i), totalPot * shares[i].share / 0xffffffffffffffff);
      }
    }

    function testFiveWinners() public {
      ILotteryERC721.PotShareEntry[] memory shares = new ILotteryERC721.PotShareEntry[](5);
      shares[0].recipient = address(0);
      shares[0].share = 0x1111111111111111;
      shares[1].recipient = address(1);
      shares[1].share = 0x2222222222222222;
      shares[2].recipient = address(2);
      shares[2].share = 0x3333333333333333;
      shares[3].recipient = address(3);
      shares[3].share = 0x4444444444444444;
      shares[4].recipient = address(4);
      shares[4].share = 0x5555555555555555;

      uint256 ticketPrice = 1000;
      uint256 duration = 100;

      ILotteryERC721.LotteryConfig memory config = ILotteryERC721.LotteryConfig(
        'Test Lottery', 'Winner take all?', shares, ticketPrice, address(payToken),
        block.timestamp + duration, address(0)
      );

      uint256 tokenId = collection.mint(config);

      uint160 addressOffset = 1000;
      uint256 sharesToBuy1 = 10000;
      for(uint160 i = 0; i < shares.length; i++) {
        vm.startPrank(address(addressOffset + i));
        payToken.mint(ticketPrice * sharesToBuy1);
        payToken.approve(address(collection), ticketPrice * sharesToBuy1);
        collection.buyTickets(tokenId, sharesToBuy1);
        vm.stopPrank();
      }

      vm.warp(block.timestamp + duration + 3);
      collection.beginProcessLottery(tokenId, callbackGasLimit);
      randomSource.pushValue(1, 0xffffffffffffffff999999999999999966666666666666660000000000000000);
      randomSource.pushValue(1, 0x0000000000000000);
      collection.finishProcessLottery(tokenId);

      assertEq(collection.lotteryRecipients(tokenId, 0), address(addressOffset));
      assertEq(collection.lotteryRecipients(tokenId, 1), address(addressOffset + 1));
      assertEq(collection.lotteryRecipients(tokenId, 2), address(addressOffset + 2));
      assertEq(collection.lotteryRecipients(tokenId, 3), address(addressOffset + 4));
      assertEq(collection.lotteryRecipients(tokenId, 4), address(addressOffset));
      uint256 totalPot = ticketPrice * sharesToBuy1 * shares.length;
      for(uint160 i = 0; i < shares.length; i++) {
        assertEq(collection.lotteryRecipientAmounts(tokenId, i), totalPot * shares[i].share / 0xffffffffffffffff);
      }
    }

    function testRefund() public {
      ILotteryERC721.PotShareEntry[] memory shares = new ILotteryERC721.PotShareEntry[](2);
      shares[0].recipient = address(0);
      shares[0].share = 0xffffffffffffffff;

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
      assertEq(payToken.balanceOf(address(this)), 0);

      // Cannot refund before canceling
      vm.expectRevert();
      collection.refundTickets(tokenId);

      // Only owner can cancel
      vm.prank(address(1));
      vm.expectRevert();
      collection.cancelLottery(tokenId);

      collection.cancelLottery(tokenId);
      assertEq(collection.lotteryStatus(tokenId), 3);

      collection.refundTickets(tokenId);
      assertEq(payToken.balanceOf(address(this)), ticketPrice * sharesToBuy1);

      // Cannot refund twice
      vm.expectRevert();
      collection.refundTickets(tokenId);
    }
}

