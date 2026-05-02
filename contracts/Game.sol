
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {GOLDToken} from "./GOLDToken.sol";
import {PlayerNFT} from "./PlayerNFT.sol";

/* Parent Game contract with base game functionality for all games */
abstract contract Game {
    GOLDToken public goldToken;
    PlayerNFT public playerNFT;

    mapping(address => bool) public activeGame;
    event GameStarted(address indexed player);
    event GameForfeited(address indexed player);

    constructor(address goldTokenAddress, address playerNFTAddress) {
        goldToken = GOLDToken(goldTokenAddress);
        playerNFT = PlayerNFT(playerNFTAddress);
    }

    function startGame() external virtual {
        require(playerNFT.hasMinted(msg.sender), "Must have a Player NFT to play");
        require(!activeGame[msg.sender], "Active game already in progress");
        activeGame[msg.sender] = true;
        goldToken.deductEntryFee(msg.sender);
        emit GameStarted(msg.sender);
    }

    function forfeit() external virtual {
        require(activeGame[msg.sender], "No active game exists");
        activeGame[msg.sender] = false;
        emit GameForfeited(msg.sender);
    }
}
