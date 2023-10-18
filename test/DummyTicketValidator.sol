// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../contracts/ITicketValidator.sol";

contract DummyTicketValidator is ITicketValidator {
  uint256 public minimumPurchase;
  address public approvedBuyer;

  constructor(uint256 _minimumPurchase, address _buyer) {
    minimumPurchase = _minimumPurchase;
    approvedBuyer = _buyer;
  }

  function validate(
    uint256 /*tokenId*/,
    ILotteryERC721.LotteryConfig memory /*config*/,
    address buyer,
    uint256 count
  ) external view {
    require(count >= minimumPurchase);
    require(buyer == approvedBuyer);
  }
}
