// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../contracts/IRandom.sol";

contract MockRandom is IRandom {
  uint256 public curReqId;
  mapping(uint256 => uint256[]) public values;

  function pushValue(uint256 reqId, uint256 newValue) external {
    values[reqId].push(newValue);
  }

  function requestRandomWords(uint32 numWords, uint32 gasLimit) external returns(uint256 requestId) {
    require(gasLimit / numWords > 20000);
    return ++curReqId;
  }

  function getRequestStatus(uint256 _requestId) external view returns (bool fulfilled, uint256[] memory randomWords) {
    return (values[_requestId].length > 0, values[_requestId]);
  }
}
