// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../contracts/IRandom.sol";

contract MockRandom is IRandom {
  uint64[] public values;
  uint256 public curReqId;

  constructor() {
    values.push(0);
  }

  function pushValue(uint64 newValue) external {
    values.push(newValue);
  }

  function requestRandomUint64() external returns(uint256 requestId) {
    return ++curReqId;
  }

  function getRequestStatus(uint256 _requestId) external view returns (bool fulfilled, uint64 randomValue) {
    return (values.length > _requestId, values[_requestId]);
  }
}
