// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
    Leaderboard
    - Records player wins submitted by authorized game contracts
    - Stores a list of all players who have won at least one game
    - Stats are read directly from PlayerNFT (no duplication)
    - Frontend fetches player list and sorts/displays leaderboard
*/

import {PlayerNFT} from "./PlayerNFT.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Leaderboard is Ownable {

    // ======== State Variables ========

    // Reference to PlayerNFT for reading player stats
    PlayerNFT public playerNFT;

    // List of all players tracked on the leaderboard
    // Used for iteration (mappings are not iterable)
    address[] public players;

    // Prevents duplicate entries in the players array
    mapping(address => bool) public isTracked;

    // Game contracts authorized to call recordWin()
    mapping(address => bool) public authorizedContracts;

    // ======== Events ========
    event WinRecorded(address indexed player);

    // ======== Constructor ========
    constructor(address playerNFTAddress) Ownable(msg.sender) {
        playerNFT = PlayerNFT(playerNFTAddress);
    }

    // ======== Modifier ========
    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender], "Not authorized");
        _;
    }

    // ======== Core Functions ========

    // Called by game contracts after every win, adds player to leaderboard if new
    function recordWin(address player) external onlyAuthorized {
        if (!isTracked[player]) {
            isTracked[player] = true;
            players.push(player);
        }
        emit WinRecorded(player);
    }

    // ======== View Functions ========

    // Returns total number of players on the leaderboard
    function getPlayerCount() external view returns (uint256) {
        return players.length;
    }

    // Returns a slice of the players array, used on frontend to fetch players in chunks
    // offset: starting index, limit: max number of players to return
    function getPlayers(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 total = players.length;
        if (offset >= total) return new address[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;

        address[] memory result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = players[i];
        }
        return result;
    }

    // Returns stats for a single player, reads directly from PlayerNFT
    function getStats(address player) external view returns (
        string memory name,
        uint256 level,
        uint256 totalWins,
        uint256 lifetimeEarned
    ) {
        return playerNFT.getStats(player);
    }

    // ======== Authorization ========

    function authorizeContract(address contractAddress) external onlyOwner {
        authorizedContracts[contractAddress] = true;
    }

    function deauthorizeContract(address contractAddress) external onlyOwner {
        authorizedContracts[contractAddress] = false;
    }
}