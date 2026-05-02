// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
    MemoryMatch
    - Entry fee: 1 GOLD (burned on game start)
    - Game logic runs off-chain in the frontend (4x4 grid, 8 pairs)
    - Reward paid from treasury based on lowest attempt tier reached
    - Attempt tiers: ≤10 = 20 GOLD, ≤14 = 15 GOLD, ≤18 = 10 GOLD, ≤24 = 5 GOLD, ≤32 = 2 GOLD
*/

import {Game} from "./Game.sol";

contract MemoryMatch is Game {

    // ======== State Variables ========

    // Maps attempt count threshold to GOLD reward amount
    mapping(uint256 => uint256) public rewards;

    // ======== Events ========

    // attempts: total attempts submitted by player
    // reward: amount paid out (0 if over 32 attempts)
    event GameCompleted(address indexed player, uint256 attempts, uint256 reward);


    // ======== Constructor ========
    constructor(address goldTokenAddress, address playerNFTAddress, address leaderboardAddress) 
        Game(goldTokenAddress, playerNFTAddress, leaderboardAddress) {
        rewards[10] = 20 * 10**18;
        rewards[14] = 15 * 10**18;
        rewards[18] = 10 * 10**18;
        rewards[24] = 5 * 10**18;
        rewards[32] = 2 * 10**18;
    }

    // ======== Game Functions ========

    // Called by frontend when all pairs are matched; fewer attempts = higher reward
    function submitResult(uint256 attempts) external {
        require(activeGame[msg.sender], "No active game exists");     
        require(attempts >= 8, "Invalid attempt count"); 
        activeGame[msg.sender] = false;

        uint256 reward;
        if (attempts <= 10) { reward = rewards[10]; }
        else if (attempts <= 14) { reward = rewards[14]; }
        else if (attempts <= 18) { reward = rewards[18]; }
        else if (attempts <= 24) { reward = rewards[24]; }
        else if (attempts <= 32) { reward = rewards[32]; }
        
        if (reward > 0) {
            goldToken.transferFromTreasury(msg.sender, reward);
            playerNFT.updateStats(msg.sender, reward);
            leaderboard.recordWin(msg.sender);
        }

        emit GameCompleted(msg.sender, attempts, reward);
    }

}