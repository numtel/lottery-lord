// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/interfaces/IERC4906.sol";
import "openzeppelin-contracts/contracts/interfaces/IERC165.sol";
import "./IRandom.sol";

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
  mapping(uint256 => uint8) public lotteryStatus;
  mapping(uint256 => uint256) public lotteryRandomRequests;

  IRandom public randomSource;

  constructor(
    string memory name,
    string memory symbol,
    IRandom _randomSource
  ) ERC721(name, symbol) {
    randomSource = _randomSource;
  }

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

  function beginProcessLottery(uint256 tokenId) external {
    _requireOwned(tokenId);
    require(configs[tokenId].endTime < block.timestamp, "Lottery Not Yet Ended");
    require(ticketsSold[tokenId] > 0);
    require(lotteryStatus[tokenId] == 0);
    lotteryStatus[tokenId] = 1;
    require(lotteryRandomRequests[tokenId] == 0);

    lotteryRandomRequests[tokenId] = randomSource.requestRandomUint64();
  }

  function finishProcessLottery(uint256 tokenId) external {
    _requireOwned(tokenId);
    require(lotteryStatus[tokenId] == 1);
    lotteryStatus[tokenId] = 2;

    (bool fulfilled, uint64 randomValue) = randomSource.getRequestStatus(lotteryRandomRequests[tokenId]);

    require(fulfilled);

    // TODO Test with 0 to make sure first ticket can win
    uint256 winningTicket = ticketsSold[tokenId] * randomValue / 0xffffffffffffffff;

    uint256 curPos;
    address winner;
    for(uint i = 0; i < ticketPurchases[tokenId].length; i++) {
      curPos += ticketPurchases[tokenId][i].count;
      if(curPos >= winningTicket) {
        winner = ticketPurchases[tokenId][i].buyer;
        break;
      }
    }
    require(winner != address(0));

    for(uint i = 0; i < configs[tokenId].shares.length; i++) {
      address shareRecipient = configs[tokenId].shares[i].recipient;
      uint256 shareAmount =
        (configs[tokenId].shares[i].share *
          ticketsSold[tokenId] *
          configs[tokenId].ticketAmount)
        / 0xffffffffffffffff;
      // TODO allow more than one winner?
      if(shareRecipient == address(0)) shareRecipient = winner;
      IERC20(configs[tokenId].ticketToken).transfer(shareRecipient, shareAmount);
    }

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

