// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/* 
    WordGuesser: Each player pays 1 GOLD token as entry fee to play
    Rewards are paid from the treasury based on how many guesses used
    All word selection and validation happens off-chain, in the frontend
*/

import {GOLDToken} from "./GOLDToken.sol";
import {PlayerNFT} from "./PlayerNFT.sol";

contract WordGuesser {
    // State variables
    GOLDToken public goldToken; // referenced to deployed GOLDToken contract for game entry fees and rewards
    PlayerNFT public playerNFT; // reference to deployed player NFT contract to check player registration and updating stats

    mapping(uint256 => uint256) public rewards; // to map guess count to reward amount
    mapping(address => bool) public activeGame; // track if player has an active game in progress

    // Events
    event GameStarted(address indexed player); // emitted when a player starts a game and pays entry fee
    event GameCompleted(address indexed player, uint8 guessesUsed, uint256 reward);
    event GameForfeited(address indexed player); // emit when a player fails to guess the word in 6 tries

    // Constructor
    constructor(address goldTokenAddress, address playerNFTAddress) {
        // Stores references to GOLDToken and PlayerNFT contracts
        goldToken = GOLDToken(goldTokenAddress); // Treat this address as a deployed GOLDToken contract
        playerNFT = PlayerNFT(playerNFTAddress);

        // Populate rewards mapping: guessCount => reward amount
        rewards[1] = 20 * 10**18;
        rewards[2] = 15 * 10**18;
        rewards[3] = 10 * 10**18;
        rewards[4] = 7  * 10**18;
        rewards[5] = 4  * 10**18;
        rewards[6] = 2  * 10**18;
    }

    // Game functions

    // Called by player, starts a new game and deducts 1 GOLD entry fee
    // Player must have a player NFT and no other game in progress
    function startGame() external { 
        require(playerNFT.hasMinted(msg.sender), "Must have a Player NFT to play"); // using auto generated getter for playerNFT
        require(!activeGame[msg.sender], "Active game already in progress");
        activeGame[msg.sender] = true;
        goldToken.deductEntryFee(msg.sender);
        emit GameStarted(msg.sender);
    }

    // Called by player on win, frontned passes how many guesses were used
    // Pays reward from treasury and updates player stats
    function submitResult(uint8 guessesUsed) external { 
        require(activeGame[msg.sender], "No active game exists");
        require(guessesUsed >= 1 && guessesUsed <=6, "Invalid guess count");
        activeGame[msg.sender] = false;
        goldToken.transferFromTreasury(msg.sender, rewards[guessesUsed]);
        playerNFT.updateStats(msg.sender, rewards[guessesUsed]);
        emit GameCompleted(msg.sender, guessesUsed, rewards[guessesUsed]);
    }

    // Called by player on loss, closes session
    // Entry fee is already burned, no refund
    function forfeit() external { 
        require(activeGame[msg.sender], "No active game to forfeit");
        activeGame[msg.sender] = false;
        emit GameForfeited(msg.sender);
    }
}