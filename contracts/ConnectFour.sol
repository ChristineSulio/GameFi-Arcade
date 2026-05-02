// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
    ConnectFour
    - Entry fee: 1 GOLD (burned on game start)
    - Game logic runs off-chain in the frontend
    - Player submits win/loss result when game ends
    - Win = 10 GOLD rewarded from treasury
    - Loss = no reward, entry fee burned
*/

import {Game} from "./Game.sol";

contract ConnectFour is Game {

    // ======== State Variables ========
    uint256 public constant WIN_REWARD = 10 * 10**18;

    // ======== Events ========
    event GameWon(address indexed player, uint256 reward);
    event GameLost(address indexed player);

    // ======== Constructor ========

    // Accepts deployed contract addresses
    constructor(address goldTokenAddress, address playerNFTAddress, address leaderboardAddress)
        Game(goldTokenAddress, playerNFTAddress, leaderboardAddress) {}

    // ======== Game Functions ========

    // Called by frontend when game ends; frontend passes true for win, false for loss
    function submitResult(bool won) external {
        require(activeGame[msg.sender], "No active game exists");
        activeGame[msg.sender] = false;

        if (won) {
            goldToken.transferFromTreasury(msg.sender, WIN_REWARD);
            playerNFT.updateStats(msg.sender, WIN_REWARD);
            leaderboard.recordWin(msg.sender);
            emit GameWon(msg.sender, WIN_REWARD);
        } else {
            emit GameLost(msg.sender);
        }
    }

}