// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract PhotoNFT is ERC721 {
    uint256 private _nextTokenId;
    mapping(uint256 => string) private _tokenURIs;
    
    constructor() ERC721("Camera Photo NFT", "PHOTO") {
        _nextTokenId = 1;
    }
    
    function mint(address to, string memory uri) public {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = uri;
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }
} 