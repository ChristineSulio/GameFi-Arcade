// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
    BrickBreaker: 
    - Entry fee: 1 GOLD (burned on game start)
    - Game logic runs off-chain in the frontend
    - Player submits final score on game over
    - Reward is paid from treasury, based on the highest score milestone reached
    - Reward Milestones: 1000 pts = 2 GOLD, 5000 pts = 7 GOLD, 10000 pts = 15 GOLD
*/

import {Game} from "./Game.sol";

contract BrickBreaker is Game {

    // ======== State Variables ========

    // Maps score milestone to GOLD reward amount
    mapping(uint256 => uint256) public rewards;

    // ======== Events ========

    // score: final score submitted by player
    // reward: amount paid out to player (0 if no milestone reached)
    event GameCompleted(address indexed player, uint256 score, uint256 reward);

    // ======== Constructor ========

    constructor(address goldTokenAddress, address playerNFTAddress) 
        Game(goldTokenAddress, playerNFTAddress) {
        rewards[1000] = 2 * 10**18;
        rewards[5000] = 7 * 10**18;
        rewards[10000] = 15 * 10**18;
    }

    // ======== Game Functions ========

    // Called by frontend when game ends, pays reward based on highest milestone reached
    function submitResult(uint256 score) external {
        require(activeGame[msg.sender], "No active game exists");
        activeGame[msg.sender] = false;

        uint256 reward;
        if (score >= 10000) { reward = rewards[10000]; }
        else if (score >= 5000) { reward = rewards[5000]; }
        else if (score >= 1000) { reward = rewards[1000]; }

        if (reward > 0) {
            goldToken.transferFromTreasury(msg.sender, reward);
            playerNFT.updateStats(msg.sender, reward);
        }

        emit GameCompleted(msg.sender, score, reward);
    }

}