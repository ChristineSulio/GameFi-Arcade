// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
    BrickBreaker: Players pay 1 GOLD entry fee to play
    Game logic runs off-chain in the frontend
    Player submits final score when game ends
    Reward is based on the highest score milestone reached (not stacking)
    Milestones: 1000 pts = 2 GOLD, 5000 pts = 7 GOLD, 10000 pts = 15 GOLD
*/

import {GOLDToken} from "./GOLDToken.sol";
import {PlayerNFT} from "./PlayerNFT.sol";

contract BrickBreaker {

    // ======== State Variables ========

    // Reference to deployed GOLDToken contract for entry fees and rewards
    GOLDToken public goldToken;

    // Reference to deployed PlayerNFT contract for player validation and stat tracking
    PlayerNFT public playerNFT;

    // Maps score milestone to reward amount in GOLD
    mapping(uint256 => uint256) public rewards;

    // Tracks whether a player has an active game in progress
    mapping(address => bool) public activeGame;

    // ======== Events ========

    // Emitted when a player starts a new game and pays entry fee
    event GameStarted(address indexed player);

    // Emitted when a player submits their final score
    // reward will be 0 if no milestone was reached
    event GameCompleted(address indexed player, uint256 score, uint256 reward);

    // Emitted when a player ends their session early
    event GameForfeited(address indexed player);

    // ======== Constructor ========

    // Accepts deployed contract addresses and populates milestone reward table
    constructor(address goldTokenAddress, address playerNFTAddress) {
        // Initialize contract references
        goldToken = GOLDToken(goldTokenAddress);
        playerNFT = PlayerNFT(playerNFTAddress);

        // Populate milestone rewards: score => GOLD reward
        // Only the highest milestone reached pays out (not stacking)
        rewards[1000] = 2 * 10**18;
        rewards[5000] = 7 * 10**18;
        rewards[10000] = 15 * 10**18;
    }

    // ======== Game Functions ========

    // Called by player to start a new game — deducts 1 GOLD entry fee
    // Player must have a Player NFT and no game already in progress
    function startGame() external {
        require(playerNFT.hasMinted(msg.sender), "Must have a Player NFT to play");
        require(!activeGame[msg.sender], "Active game already in progress");

        activeGame[msg.sender] = true;
        goldToken.deductEntryFee(msg.sender); // Deduct 1 GOLD entry fee (burned)

        emit GameStarted(msg.sender);
    }

    // Called by player when game ends, frontend passes final score
    // Finds highest milestone reached and pays reward from treasury
    // If score is below 1000, no reward is paid
    function submitResult(uint256 score) external {
        // Require player has an active game
        require(activeGame[msg.sender], "No active game exists");

        activeGame[msg.sender] = false;

        // Find highest milestone reached, checking from highest to lowest
        uint256 reward;
        if (score >= 10000) { reward = rewards[10000]; }
        else if (score >= 5000) { reward = rewards[5000]; }
        else if (score >= 1000) { reward = rewards[1000]; }
        // If score below 1000, reward stays 0 — no payout

        // Only pay reward and update stats if a milestone was reached
        if (reward > 0) {
            // Transfer reward amount from treasury to player
            goldToken.transferFromTreasury(msg.sender, reward);

            // Update player wins and lifetime earned in PlayerNFT
            playerNFT.updateStats(msg.sender, reward);
        }

        emit GameCompleted(msg.sender, score, reward);
    }

    // Called by player to end session early; no reward, no refund
    function forfeit() external {
        // Require player has an active game
        require(activeGame[msg.sender], "No active game exists");
        activeGame[msg.sender] = false;
        emit GameForfeited(msg.sender);
    }
}