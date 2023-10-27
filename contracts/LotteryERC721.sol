// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/interfaces/IERC4906.sol";
import "openzeppelin-contracts/contracts/interfaces/IERC165.sol";
import "openzeppelin-contracts/contracts/utils/Strings.sol";
import "./IRandom.sol";
import "./ITicketValidator.sol";
import "./ILotteryERC721.sol";

contract LotteryERC721 is ILotteryERC721, ERC721Enumerable, IERC4906 {
  uint256 public tokenCount;
  string public urlPrefix;

  // This is generally limited by the cost of getting random words from Chainlink
  uint256 constant public maxWinners = 100;

  mapping(uint256 => LotteryConfig) public configs;
  mapping(uint256 => TicketPurchase[]) public ticketPurchases;
  mapping(uint256 => uint256) public ticketsSold;
  mapping(uint256 => mapping(address => uint256)) public ticketsBought;
  mapping(address => uint256[]) public ticketsByAccount;
  mapping(uint256 => address[]) public ticketBuyers;
  mapping(uint256 => uint8) public lotteryStatus;
  mapping(uint256 => uint256) public lotteryRandomRequests;
  mapping(uint256 => address[]) public lotteryRecipients;
  mapping(uint256 => uint256[]) public lotteryRecipientAmounts;
  mapping(uint256 => mapping(address => bool)) public refundClaimed;

  IRandom public randomSource;

  constructor(
    string memory name,
    string memory symbol,
    IRandom _randomSource,
    string memory _urlPrefix
  ) ERC721(name, symbol) {
    randomSource = _randomSource;
    urlPrefix = _urlPrefix;
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Enumerable, IERC165) returns (bool) {
    return interfaceId == bytes4(0x49064906) || super.supportsInterface(interfaceId);
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    _requireOwned(tokenId);
    return string(abi.encodePacked(urlPrefix, Strings.toHexString(address(this)), '/', Strings.toString(tokenId)));
  }

  function mint(LotteryConfig calldata newConfig) external returns (uint256) {
    uint256 newTokenId = ++tokenCount;
    _mint(msg.sender, newTokenId);
    configs[newTokenId] = newConfig;
    uint64 shareTotal;
    for(uint256 i = 0; i < newConfig.shares.length; i++) {
      shareTotal += newConfig.shares[i].share;
    }
    require(shareTotal == 0xffffffffffffffff);
    return newTokenId;
  }

  function lotteryShares(uint256 tokenId) public view returns (PotShareEntry[] memory out) {
    return configs[tokenId].shares;
  }

  function numberOfWinners(uint256 tokenId) public view returns (uint256, uint32) {
    uint256 count;
    for(uint i = 0; i < configs[tokenId].shares.length; i++) {
      address shareRecipient = configs[tokenId].shares[i].recipient;
      // Winners are denoted by addresses that are very low numbered
      if(uint160(shareRecipient) < maxWinners) {
        count++;
      }
    }
    uint32 numWords = uint32(count / 4);
    if(count % 4 > 0) numWords++;
    return (count, numWords);
  }

  function cancelLottery(uint256 tokenId) external {
    require(msg.sender == ownerOf(tokenId));
    require(lotteryStatus[tokenId] == 0);
    lotteryStatus[tokenId] = 2;
  }

  function refundTickets(uint256 tokenId) external {
    require(lotteryStatus[tokenId] == 2);
    require(refundClaimed[tokenId][msg.sender] == false);
    uint256 refundAmount = ticketsBought[tokenId][msg.sender] * configs[tokenId].ticketAmount;
    refundClaimed[tokenId][msg.sender] = true;
    IERC20(configs[tokenId].ticketToken).transfer(msg.sender, refundAmount);
  }

  function beginProcessLottery(uint256 tokenId, uint32 callbackGasLimit) external {
    _requireOwned(tokenId);
    require(configs[tokenId].endTime < block.timestamp, "Lottery Not Yet Ended");
    require(ticketsSold[tokenId] > 0);
    require(lotteryStatus[tokenId] == 0);
    lotteryStatus[tokenId] = 1;
    require(lotteryRandomRequests[tokenId] == 0);

    (, uint32 numWords) = numberOfWinners(tokenId);

    lotteryRandomRequests[tokenId] = randomSource.requestRandomWords(numWords, callbackGasLimit);
  }

  function finishProcessLottery(uint256 tokenId) external {
    _requireOwned(tokenId);
    require(lotteryStatus[tokenId] == 1);

    emit LotteryEnded(tokenId);
    lotteryStatus[tokenId] = 2;

    (bool fulfilled, uint256[] memory randomWords) = randomSource.getRequestStatus(lotteryRandomRequests[tokenId]);
    require(fulfilled);

    uint256 curWinnerIndex;
    for(uint256 i = 0; i < configs[tokenId].shares.length; i++) {
      address shareRecipient = configs[tokenId].shares[i].recipient;
      uint256 shareAmount =
        (configs[tokenId].shares[i].share *
          ticketsSold[tokenId] *
          configs[tokenId].ticketAmount)
        / 0xffffffffffffffff;

      if(uint160(shareRecipient) < maxWinners) {
        uint256 randomValue = uint64(randomWords[curWinnerIndex / 4] >> (64 * (curWinnerIndex % 4)));
        curWinnerIndex++;
        uint256 winningTicket = ticketsSold[tokenId] * randomValue / 0xffffffffffffffff;

        uint256 curPos;
        for(uint256 j = 0; j < ticketPurchases[tokenId].length; j++) {
          curPos += ticketPurchases[tokenId][j].count;
          if(curPos >= winningTicket) {
            shareRecipient = ticketPurchases[tokenId][j].buyer;
            break;
          }
        }
      }
      lotteryRecipients[tokenId].push(shareRecipient);
      lotteryRecipientAmounts[tokenId].push(shareAmount);
      IERC20(configs[tokenId].ticketToken).transfer(shareRecipient, shareAmount);
    }

  }

  function buyTickets(uint256 tokenId, uint256 ticketCount) external {
    emit TicketsBought(tokenId, msg.sender, ticketCount);
    _requireOwned(tokenId);
    require(lotteryStatus[tokenId] == 0);
    require(configs[tokenId].endTime > block.timestamp, "Lottery Ended");
    require(ticketCount > 0);
    uint256 saleAmount = ticketCount * configs[tokenId].ticketAmount;
    IERC20(configs[tokenId].ticketToken).transferFrom(msg.sender, address(this), saleAmount);

    // callback to validator if specified
    if(configs[tokenId].ticketValidator != address(0)) {
      ITicketValidator(configs[tokenId].ticketValidator).validate(
        tokenId,
        configs[tokenId],
        msg.sender,
        ticketCount
      );
    }

    ticketPurchases[tokenId].push(TicketPurchase(msg.sender, ticketCount));
    ticketsSold[tokenId] += ticketCount;
    if(ticketsBought[tokenId][msg.sender] == 0) {
      ticketBuyers[tokenId].push(msg.sender);
      ticketsByAccount[msg.sender].push(tokenId);
    }
    ticketsBought[tokenId][msg.sender] += ticketCount;
  }
}

