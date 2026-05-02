// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
    ConnectFour: Players pay 1 GOLD entry fee to play against AI
    Game logic runs off-chain in the frontend
    Player submits win or loss result when game ends
    Win = 10 GOLD reward from treasury
    Loss = no reward, entry fee already burned
*/

import {GOLDToken} from "./GOLDToken.sol";
import {PlayerNFT} from "./PlayerNFT.sol";

contract ConnectFour {

    // ======== State Variables ========

    // Reference to deployed GOLDToken contract for entry fees and rewards
    GOLDToken public goldToken;

    // Reference to deployed PlayerNFT contract for player validation and stat tracking
    PlayerNFT public playerNFT;

    // Fixed reward for beating the AI
    uint256 public constant WIN_REWARD = 10 * 10**18;

    // Tracks whether a player has an active game in progress
    mapping(address => bool) public activeGame;

    // ======== Events ========

    // Emitted when a player starts a new game and pays entry fee
    event GameStarted(address indexed player);

    // Emitted when a player wins against the AI and collects reward
    event GameWon(address indexed player, uint256 reward);

    // Emitted when a player loses against the AI
    event GameLost(address indexed player);

    // Emitted when a player abandons their session
    event GameForfeited(address indexed player);

    // ======== Constructor ========

    // Accepts deployed contract addresses
    constructor(address goldTokenAddress, address playerNFTAddress) {
        // Initialize contract references
        goldToken = GOLDToken(goldTokenAddress);
        playerNFT = PlayerNFT(playerNFTAddress);
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

    // Called by player when game ends — frontend passes true for win, false for loss
    // Win pays 10 GOLD from treasury and updates player stats
    // Loss ends session with no reward
    function submitResult(bool won) external {
        // Require player has an active game
        require(activeGame[msg.sender], "No active game exists");

        activeGame[msg.sender] = false;

        // If player won, pay reward and update stats
        if (won) {
            // Transfer WIN_REWARD from treasury to player
            goldToken.transferFromTreasury(msg.sender, WIN_REWARD);

            // Update player wins and lifetime earned in PlayerNFT
            playerNFT.updateStats(msg.sender, WIN_REWARD);

            emit GameWon(msg.sender, WIN_REWARD);

        } else {
            emit GameLost(msg.sender);
        }
    }

    // Called by player to abandon session; no reward, no refund
    function forfeit() external {
        require(activeGame[msg.sender], "No active game exists");
        activeGame[msg.sender] = false;
        emit GameForfeited(msg.sender);
    }
}