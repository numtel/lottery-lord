// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/interfaces/IERC4906.sol";
import "openzeppelin-contracts/contracts/interfaces/IERC165.sol";

contract LotteryERC721 is ERC721Enumerable, IERC4906 {
  uint256 public tokenCount;

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

  mapping(uint256 => LotteryConfig) public configs;
  mapping(uint256 => TicketPurchase[]) public ticketPurchases;
  mapping(uint256 => uint256) public ticketsSold;
  mapping(uint256 => mapping(address => uint256)) public ticketsBought;
  mapping(uint256 => address[]) public ticketBuyers;
  mapping(uint256 => bool) public lotteryProcessed;

  constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Enumerable, IERC165) returns (bool) {
    return interfaceId == bytes4(0x49064906) || super.supportsInterface(interfaceId);
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    _requireOwned(tokenId);
    return "hello";
  }

  function mint(LotteryConfig calldata newConfig) external returns (uint256) {
    uint256 newTokenId = ++tokenCount;
    _mint(msg.sender, newTokenId);
    configs[newTokenId] = newConfig;
    return newTokenId;
  }

  function processLottery(uint256 tokenId) external {
    _requireOwned(tokenId);
    require(configs[tokenId].endTime < block.timestamp, "Lottery Not Yet Ended");
    require(ticketsSold[tokenId] > 0);
    require(!lotteryProcessed[tokenId]);
    lotteryProcessed[tokenId] = true;

    // TODO connect to actual randomness
    uint256 randomWord =
      0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f;

    uint64 croppedRandom = uint64(randomWord);
    uint256 winningTicket = ticketsSold[tokenId] * croppedRandom / 0xffffffffffffffff;

  }

  function buyTickets(uint256 tokenId, uint256 ticketCount) external {
    _requireOwned(tokenId);
    require(configs[tokenId].endTime > block.timestamp, "Lottery Ended");
    require(ticketCount > 0);
    // TODO callback to validator if specified
    uint256 saleAmount = ticketCount * configs[tokenId].ticketAmount;
    IERC20(configs[tokenId].ticketToken).transferFrom(msg.sender, address(this), saleAmount);

    ticketPurchases[tokenId].push(TicketPurchase(msg.sender, ticketCount));
    ticketsSold[tokenId] += ticketCount;
    if(ticketsBought[tokenId][msg.sender] == 0) {
      ticketBuyers[tokenId].push(msg.sender);
    }
    ticketsBought[tokenId][msg.sender] += ticketCount;
  }
}

