// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
    Snake: Players pay 1 GOLD entry fee to play
    Game logic runs off-chain in the frontend
    Player submits final apple count on game over
    Reward is based on the highest milestone reached (not stacking)
    Milestones: 10 apples = 2 GOLD, 25 = 5 GOLD, 50 = 10 GOLD, 100 = 25 GOLD
*/

import {GOLDToken} from "./GOLDToken.sol";
import {PlayerNFT} from "./PlayerNFT.sol";

contract Snake {
    // State variables
    GOLDToken public goldToken;
    PlayerNFT public playerNFT;

    mapping(uint256 => uint256) public rewards;
    mapping(address => bool) public activeGame;

    // Events

    // Emitted when a player starts a new game and pays entry fee
    event GameStarted(address indexed player);
    // Emitted when a player submits their final apple count and collects reward
    event GameCompleted(address indexed player, uint256 applesEaten, uint256 reward);
    // Emitted when a player ends their session without reaching any milestone
    event GameForfeited(address indexed player);

    // Constructor
    constructor(address goldTokenAddress, address playerNFTAddress) {
        // Initialize contract references
        goldToken = GOLDToken(goldTokenAddress);
        playerNFT = PlayerNFT(playerNFTAddress);

        // Milestone rewards
        rewards[10]  = 2  * 10**18;
        rewards[25]  = 5  * 10**18;
        rewards[50]  = 10 * 10**18;
        rewards[100] = 25 * 10**18;
    }
    

    // Functions

    // Called by player to start a new game - deducted 1 GOLD for entry fee
    function startGame() external {
        require(playerNFT.hasMinted(msg.sender), "Must have a Player NFT to play");
        require(!activeGame[msg.sender], "Active game already in progress");
        activeGame[msg.sender] = true;
        goldToken.deductEntryFee(msg.sender);
        emit GameStarted(msg.sender);
    }

    // Called by player when game ends, frontend passes total apples eaten
    // Distributes reward amount based on highest milestone reached
    function submitResult(uint256 applesEaten) external {
        require(activeGame[msg.sender], "No active game exists");
        activeGame[msg.sender] = false;

        // FInd highest milestone reached
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

    // Called by player to end session early, no reward/no refund
    function forfeit() external {
        // Require active game
        require(activeGame[msg.sender], "No active game to forfeit");
        activeGame[msg.sender] = false;
        emit GameForfeited(msg.sender);
    }

}