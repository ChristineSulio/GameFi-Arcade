
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {GOLDToken} from "./GOLDToken.sol";
import {PlayerNFT} from "./PlayerNFT.sol";
import {Leaderboard} from "./Leaderboard.sol";

/* Parent Game contract with base game functionality for all games */
abstract contract Game {
    // ======== State Variables ========
    GOLDToken public goldToken;
    PlayerNFT public playerNFT;
    Leaderboard public leaderboard;
    mapping(address => bool) public activeGame;

    // ======== Events ========
    event GameStarted(address indexed player);
    event GameForfeited(address indexed player);

    constructor(address goldTokenAddress, address playerNFTAddress, address leaderboardAddress) {
        // Initialize deployed contract references
        goldToken = GOLDToken(goldTokenAddress);
        playerNFT = PlayerNFT(playerNFTAddress);
        leaderboard = Leaderboard(leaderboardAddress);
    }

    function startGame() external virtual {
        require(playerNFT.hasMinted(msg.sender), "Must have a Player NFT to play");
        if (activeGame[msg.sender]) {
            emit GameForfeited(msg.sender);
        }
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
