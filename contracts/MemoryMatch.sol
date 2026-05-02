// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
    MemoryCard: Players pay 1 GOLD entry fee to play
    Game logic runs off-chain in the frontend (4x4 grid, 8 pairs)
    Player submits total attempts used when all pairs are matched
    Fewer attempts = higher reward
*/

import {GOLDToken} from "./GOLDToken.sol";
import {PlayerNFT} from "./PlayerNFT.sol";

contract MemoryMatch {

    // ======== State Variables ========

    // Reference to deployed GOLDToken contract for entry fees and rewards
    GOLDToken public goldToken;

    // Reference to deployed PlayerNFT contract for player validation and stat tracking
    PlayerNFT public playerNFT;

    // Maps attempt count threshold to reward amount in GOLD
    // Lower attempts = higher reward
    mapping(uint256 => uint256) public rewards;

    // Tracks whether a player has an active game in progress
    mapping(address => bool) public activeGame;

    // ======== Events ========

    // Emitted when a player starts a new game and pays entry fee
    event GameStarted(address indexed player);

    // Emitted when a player completes the board and collects reward
    event GameCompleted(address indexed player, uint256 attempts, uint256 reward);

    // Emitted when a player abandons their session
    event GameForfeited(address indexed player);

    // ======== Constructor ========

    // Accepts deployed contract addresses and populates reward tiers
    constructor(address goldTokenAddress, address playerNFTAddress) {
        // Initialize contract references
        goldToken = GOLDToken(goldTokenAddress);
        playerNFT = PlayerNFT(playerNFTAddress);

        // Populate reward tiers by attempt threshold
        // Attempts are checked from lowest (best) to highest (worst) in submitResult
        // ≤10 attempts = 20 GOLD, ≤14 = 15 GOLD, ≤18 = 10 GOLD, ≤24 = 5 GOLD, ≤32 = 2 GOLD
        rewards[10] = 20 * 10**18;
        rewards[14] = 15 * 10**18;
        rewards[18] = 10 * 10**18;
        rewards[24] = 5 * 10**18;
        rewards[32] = 2 * 10**18;
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

    // Called by player when all pairs are matched — frontend passes total attempts used
    // Pays reward based on attempt tier, lower attempts = better reward
    function submitResult(uint256 attempts) external {
        require(activeGame[msg.sender], "No active game exists");

        // Require at least 8 attempts (minimum possible for 8 pairs)
        // This prevents submitting impossible results       
        require(attempts >= 8, "Must have at least 8 attempts to win");

        activeGame[msg.sender] = false;

        // Find reward tier based on attempts, checking from lowest to highest
        uint256 reward;
        if (attempts <= 10) { reward = rewards[10]; }
        else if (attempts <= 14) { reward = rewards[14]; }
        else if (attempts <= 18) { reward = rewards[18]; }
        else if (attempts <= 24) { reward = rewards[24]; }
        else if (attempts <= 32) { reward = rewards[32]; }
        // More than 32 attempts = no reward

        // Only pay reward and update stats if a reward tier was reached
        if (reward > 0) {
            goldToken.transferFromTreasury(msg.sender, reward);
            playerNFT.updateStats(msg.sender, reward);
        }

        emit GameCompleted(msg.sender, attempts, reward);
    }

    // Called by player to abandon game session; no reward, no refund
    function forfeit() external {
        require(activeGame[msg.sender], "No active game exists");
        activeGame[msg.sender] = false;

        emit GameForfeited(msg.sender);
    }
}