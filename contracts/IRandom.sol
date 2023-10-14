// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRandom {
  function requestRandomUint64() external returns(uint256 requestId);
  function getRequestStatus(uint256 _requestId) external view returns (bool fulfilled, uint64 randomValue);
}
