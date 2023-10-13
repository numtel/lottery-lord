// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "openzeppelin-contracts/contracts/interfaces/IERC4906.sol";
import "openzeppelin-contracts/contracts/interfaces/IERC165.sol";

contract LotteryERC721 is ERC721Enumerable, IERC4906 {
  uint256 public tokenCount;

  constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Enumerable, IERC165) returns (bool) {
    return interfaceId == bytes4(0x49064906) || super.supportsInterface(interfaceId);
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    _requireOwned(tokenId);
    return "hello";
  }

  function mint(string memory _tokenURI) external returns (uint256) {
    uint256 newTokenId = ++tokenCount;
    _mint(msg.sender, newTokenId);
    _setTokenURI(newTokenId, _tokenURI);
    return newTokenId;
  }

  function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal {
    _requireOwned(tokenId);
    emit MetadataUpdate(tokenId);
  }

  function setTokenURI(uint256 tokenId, string memory _tokenURI) external {
    require(ownerOf(tokenId) == msg.sender);
    _setTokenURI(tokenId, _tokenURI);
  }
}

