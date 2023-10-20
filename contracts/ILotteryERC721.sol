// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILotteryERC721 {
  struct PotShareEntry {
    address recipient;
    uint64 share;
  }

  struct LotteryConfig {
    string name;
    string description;
    PotShareEntry[] shares;
    uint256 ticketAmount;
    address ticketToken;
    uint256 endTime;
    address ticketValidator;
  }

  struct TicketPurchase {
    address buyer;
    uint256 count;
  }

  event TicketsBought(uint256 indexed tokenId, address indexed buyer, uint256 ticketCount);
  event LotteryEnded(uint256 indexed tokenId);
}
