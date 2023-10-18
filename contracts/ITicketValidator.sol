// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ILotteryERC721.sol";

interface ITicketValidator {
  function validate(
    uint256 tokenId,
    ILotteryERC721.LotteryConfig memory config,
    address buyer,
    uint256 count
  ) external;
}
