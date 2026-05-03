import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import PlayerNFTModule from "./PlayerNFT.js";

export default buildModule("Deploy", (m) => {
    const { goldToken, playerNFT } = m.useModule(PlayerNFTModule);

    // Deploy Leaderboard
    const leaderboard = m.contract("Leaderboard", [playerNFT]);

    // Deploy all 5 game contracts
    const wordGuess = m.contract("WordGuess", [goldToken, playerNFT, leaderboard]);
    const snake = m.contract("Snake", [goldToken, playerNFT, leaderboard]);
    const memoryMatch = m.contract("MemoryMatch", [goldToken, playerNFT, leaderboard]);
    const brickBreaker = m.contract("BrickBreaker", [goldToken, playerNFT, leaderboard]);
    const connectFour = m.contract("ConnectFour", [goldToken, playerNFT, leaderboard]);

    // Authorize PlayerNFT to call transferFromTreasury on GOLDToken (welcome bonus)
    m.call(goldToken, "authorizeContract", [playerNFT], { id: "authGOLD_PlayerNFT" });

    // Authorize all game contracts on GOLDToken (entry fees + rewards)
m.call(goldToken, "authorizeContract", [wordGuess], { id: "authGOLD_WordGuess" });
m.call(goldToken, "authorizeContract", [snake], { id: "authGOLD_Snake" });
m.call(goldToken, "authorizeContract", [memoryMatch], { id: "authGOLD_MemoryMatch" });
m.call(goldToken, "authorizeContract", [brickBreaker], { id: "authGOLD_BrickBreaker" });
m.call(goldToken, "authorizeContract", [connectFour], { id: "authGOLD_ConnectFour" });

    // Authorize all game contracts on PlayerNFT (updateStats)
m.call(playerNFT, "authorizeContract", [wordGuess], { id: "authNFT_WordGuess" });
m.call(playerNFT, "authorizeContract", [snake], { id: "authNFT_Snake" });
m.call(playerNFT, "authorizeContract", [memoryMatch], { id: "authNFT_MemoryMatch" });
m.call(playerNFT, "authorizeContract", [brickBreaker], { id: "authNFT_BrickBreaker" });
m.call(playerNFT, "authorizeContract", [connectFour], { id: "authNFT_ConnectFour" });

    // Authorize all game contracts on Leaderboard (recordWin)
    m.call(leaderboard, "authorizeContract", [wordGuess], { id: "authLB_WordGuess" });
    m.call(leaderboard, "authorizeContract", [snake], { id: "authLB_Snake" });
    m.call(leaderboard, "authorizeContract", [memoryMatch], { id: "authLB_MemoryMatch" });
    m.call(leaderboard, "authorizeContract", [brickBreaker], { id: "authLB_BrickBreaker" });
    m.call(leaderboard, "authorizeContract", [connectFour], { id: "authLB_ConnectFour" });

    return { goldToken, playerNFT, leaderboard, wordGuess, snake, memoryMatch, brickBreaker, connectFour };
});