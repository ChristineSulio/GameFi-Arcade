// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
    Snake
    - Entry fee: 1 GOLD (burned on game start)
    - Game logic runs off-chain in the frontend 
    - Player submits total apples eaten on game over
    - Reward Milestones: 10 apples = 2 GOLD, 25 = 5 GOLD, 50 = 10 GOLD, 100 = 25 GOLD

*/

import {Game} from "./Game.sol";

contract Snake is Game {
    // ======== State Variables ======== 
    mapping(uint256 => uint256) public rewards;

    // ======== Events ========

    // applesEaten: total number of apples submitted by pkayer
    // reward: amount paid out (0 if under 10 apples)
    event GameCompleted(address indexed player, uint256 applesEaten, uint256 reward);

    // ======== Constructor ========
    constructor(address goldTokenAddress, address playerNFTAddress)
        Game(goldTokenAddress, playerNFTAddress) {

        rewards[10] = 2 * 10**18;
        rewards[25] = 5 * 10**18;
        rewards[50] = 10 * 10**18;
        rewards[100] = 25 * 10**18;
    }
    

    // ======== Game Functions ========


    // Called by frontend when game ends; pays reward based on highest milestone reached
    function submitResult(uint256 applesEaten) external {
        require(activeGame[msg.sender], "No active game exists");
        activeGame[msg.sender] = false;

        uint256 reward;
        if (applesEaten >= 100) { reward = rewards[100]; }
        else if (applesEaten >= 50) { reward = rewards[50]; }
        else if (applesEaten >= 25) { reward = rewards[25]; }
        else if (applesEaten >= 10) { reward = rewards[10]; }

        if (reward > 0) {
            goldToken.transferFromTreasury(msg.sender, reward);
            playerNFT.updateStats(msg.sender, reward);
        }

        emit GameCompleted(msg.sender, applesEaten, reward);
    }

}