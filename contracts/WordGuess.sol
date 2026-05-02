// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/* 
    WordGuess
    - Entry fee: 1 GOLD (burned on game start)
    - Game logic and word validation runs off-chain in the frontend
    - Player submits number of guesses used on win
    - Reward paid from treasury is based on guess count (Fewer guesses = higher reward)
    - Guess Rewards: 1 = 20 GOLD, 2 = 15 GOLD, 3 = 10 GOLD, 4 = 7 GOLD, 5 = 4 GOLD, 6 = 2 GOLD
*/

import {Game} from "./Game.sol";

contract WordGuess is Game {
    // ======== State Variables ========
    mapping(uint256 => uint256) public rewards;

    // ======== Events ========

    // guessesUsed: number of guesses submitted by player (1-6)
    // reward: amount paid out from treasury
    event GameCompleted(address indexed player, uint8 guessesUsed, uint256 reward);

    // ======== Constructor ========
    constructor(address goldTokenAddress, address playerNFTAddress, address leaderboardAddress) 
        Game(goldTokenAddress, playerNFTAddress, leaderboardAddress) {
        rewards[1] = 20 * 10**18;
        rewards[2] = 15 * 10**18;
        rewards[3] = 10 * 10**18;
        rewards[4] = 7 * 10**18;
        rewards[5] = 4 * 10**18;
        rewards[6] = 2 * 10**18;
    }

    // ======== Game Functions ========

    // Called by frontend on win; pays reward based on number of guesses used
    function submitResult(uint8 guessesUsed) external { 
        require(activeGame[msg.sender], "No active game exists");
        require(guessesUsed >= 1 && guessesUsed <=6, "Invalid guess count");
        activeGame[msg.sender] = false;

        goldToken.transferFromTreasury(msg.sender, rewards[guessesUsed]);
        playerNFT.updateStats(msg.sender, rewards[guessesUsed]);
        leaderboard.recordWin(msg.sender);

        emit GameCompleted(msg.sender, guessesUsed, rewards[guessesUsed]);
    }

}