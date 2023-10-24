// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ITicketValidator.sol";
import "./IVerification.sol";

contract OneTicketPerPerson {
  IVerification public verifications;

  constructor(address _verifications) {
    verifications = IVerification(_verifications);
  }

  function validate(
    uint256 tokenId,
    ILotteryERC721.LotteryConfig memory,
    address buyer,
    uint256 count
  ) external view {
    ILotteryERC721 origin = ILotteryERC721(msg.sender);
    require(verifications.addressActive(buyer));
    require(origin.ticketsBought(tokenId, buyer) == 0);
    require(count == 1);
  }
}
