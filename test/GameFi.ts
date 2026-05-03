import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

const GOLD = (n: number): bigint => BigInt(n) * 10n ** 18n;

async function advanceOneDay() {
  await ethers.provider.send("evm_increaseTime", [86401]);
  await ethers.provider.send("evm_mine", []);
}

async function deployAll() {
  const [owner, player1, player2, player3] = await ethers.getSigners();

  const goldToken = await ethers.deployContract("GOLDToken");
  const playerNFT = await ethers.deployContract("PlayerNFT", [
    await goldToken.getAddress(),
  ]);
  const leaderboard = await ethers.deployContract("Leaderboard", [
    await playerNFT.getAddress(),
  ]);
  const wordGuess = await ethers.deployContract("WordGuess", [
    await goldToken.getAddress(),
    await playerNFT.getAddress(),
    await leaderboard.getAddress(),
  ]);
  const snake = await ethers.deployContract("Snake", [
    await goldToken.getAddress(),
    await playerNFT.getAddress(),
    await leaderboard.getAddress(),
  ]);
  const brickBreaker = await ethers.deployContract("BrickBreaker", [
    await goldToken.getAddress(),
    await playerNFT.getAddress(),
    await leaderboard.getAddress(),
  ]);
  const memoryMatch = await ethers.deployContract("MemoryMatch", [
    await goldToken.getAddress(),
    await playerNFT.getAddress(),
    await leaderboard.getAddress(),
  ]);
  const connectFour = await ethers.deployContract("ConnectFour", [
    await goldToken.getAddress(),
    await playerNFT.getAddress(),
    await leaderboard.getAddress(),
  ]);

  // Authorize PlayerNFT on GOLDToken so mint() can pay the welcome bonus
  await goldToken.authorizeContract(await playerNFT.getAddress());

  // Authorize every game contract on GOLDToken, PlayerNFT, and Leaderboard
  for (const game of [wordGuess, snake, brickBreaker, memoryMatch, connectFour]) {
    await goldToken.authorizeContract(await game.getAddress());
    await playerNFT.authorizeContract(await game.getAddress());
    await leaderboard.authorizeContract(await game.getAddress());
  }

  return {
    owner,
    player1,
    player2,
    player3,
    goldToken,
    playerNFT,
    leaderboard,
    wordGuess,
    snake,
    brickBreaker,
    memoryMatch,
    connectFour,
  };
}

// GOLDToken -----------------------------------------------------------------------

describe("GOLDToken", function () {
  it("mints 1,000,000 GOLD to treasury on deploy", async function () {
    const { goldToken } = await deployAll();
    expect(await goldToken.balanceOf(await goldToken.getAddress())).to.equal(
      GOLD(1_000_000),
    );
  });

  it("dailyClaim transfers 10 GOLD to caller", async function () {
    const { goldToken, player1 } = await deployAll();
    await goldToken.connect(player1).dailyClaim();
    expect(await goldToken.balanceOf(player1.address)).to.equal(GOLD(10));
  });

  it("dailyClaim emits DailyClaimed event", async function () {
    const { goldToken, player1 } = await deployAll();
    await expect(goldToken.connect(player1).dailyClaim()).to.emit(
      goldToken,
      "DailyClaimed",
    );
  });

  it("dailyClaim reverts if called again within 24 hours", async function () {
    const { goldToken, player1 } = await deployAll();
    await goldToken.connect(player1).dailyClaim();
    await expect(goldToken.connect(player1).dailyClaim()).to.be.revertedWith(
      "Must wait 24 hours between daily faucet claims",
    );
  });

  it("dailyClaim succeeds after 24 hours have passed", async function () {
    const { goldToken, player1 } = await deployAll();
    await goldToken.connect(player1).dailyClaim();
    await advanceOneDay();
    await goldToken.connect(player1).dailyClaim();
    expect(await goldToken.balanceOf(player1.address)).to.equal(GOLD(20));
  });

  it("deductEntryFee burns 1 GOLD from player", async function () {
    const { goldToken, player1 } = await deployAll();
    await goldToken.connect(player1).dailyClaim();
    // Authorize player1's address directly so we can call the function in tests
    await goldToken.authorizeContract(player1.address);
    const before = await goldToken.balanceOf(player1.address);
    await goldToken.connect(player1).deductEntryFee(player1.address);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before - GOLD(1));
  });

  it("deductEntryFee reverts if caller is not authorized", async function () {
    const { goldToken, player1, player2 } = await deployAll();
    await goldToken.connect(player1).dailyClaim();
    await expect(
      goldToken.connect(player2).deductEntryFee(player1.address),
    ).to.be.revertedWith("Not authorized");
  });

  it("deductEntryFee reverts if player has insufficient GOLD", async function () {
    const { goldToken, player1 } = await deployAll();
    await goldToken.authorizeContract(player1.address);
    await expect(
      goldToken.connect(player1).deductEntryFee(player1.address),
    ).to.be.revertedWith("Insufficient GOLD for entry fee");
  });

  it("transferFromTreasury enforces the 50 GOLD daily earning cap", async function () {
    const { goldToken, owner, player1 } = await deployAll();
    await goldToken.authorizeContract(owner.address);
    await goldToken.connect(owner).transferFromTreasury(player1.address, GOLD(50));
    await expect(
      goldToken.connect(owner).transferFromTreasury(player1.address, GOLD(1)),
    ).to.be.revertedWith("Daily earning cap (50 GOLD) reached");
  });

  it("daily earning cap resets after 24 hours", async function () {
    const { goldToken, owner, player1 } = await deployAll();
    await goldToken.authorizeContract(owner.address);
    await goldToken.connect(owner).transferFromTreasury(player1.address, GOLD(50));
    await advanceOneDay();
    await goldToken.connect(owner).transferFromTreasury(player1.address, GOLD(10));
    expect(await goldToken.balanceOf(player1.address)).to.equal(GOLD(60));
  });

  it("authorizeContract reverts if caller is not owner", async function () {
    const { goldToken, player1 } = await deployAll();
    await expect(
      goldToken.connect(player1).authorizeContract(player1.address),
    ).to.be.revertedWithCustomError(goldToken, "OwnableUnauthorizedAccount");
  });
});

// PlayerNFT -----------------------------------------------------------------------

describe("PlayerNFT", function () {
  it("mint gives player 1 NFT and 10 GOLD welcome bonus", async function () {
    const { goldToken, playerNFT, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    expect(await playerNFT.balanceOf(player1.address)).to.equal(1n);
    expect(await goldToken.balanceOf(player1.address)).to.equal(GOLD(10));
  });

  it("mint emits PlayerMinted event", async function () {
    const { playerNFT, player1 } = await deployAll();
    await expect(playerNFT.connect(player1).mint("Alice")).to.emit(
      playerNFT,
      "PlayerMinted",
    );
  });

  it("mint reverts on a second attempt from the same wallet", async function () {
    const { playerNFT, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await expect(playerNFT.connect(player1).mint("AliceTwo")).to.be.revertedWith(
      "Already minted a Player NFT",
    );
  });

  it("mint reverts when the chosen name is already taken", async function () {
    const { playerNFT, player1, player2 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await expect(playerNFT.connect(player2).mint("Alice")).to.be.revertedWith(
      "Name already taken",
    );
  });

  it("mint reverts when name is empty", async function () {
    const { playerNFT, player1 } = await deployAll();
    await expect(playerNFT.connect(player1).mint("")).to.be.revertedWith(
      "Name cannot be empty",
    );
  });

  it("setPlayerName changes name and frees the old name for others", async function () {
    const { playerNFT, player1, player2 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await playerNFT.connect(player1).setPlayerName("AliceNew");
    // Old name "Alice" should now be claimable by another player
    await playerNFT.connect(player2).mint("Alice");
    const stats = await playerNFT.getStats(player2.address);
    expect(stats.name).to.equal("Alice");
  });

  it("getLevel returns 1 for a brand-new player", async function () {
    const { playerNFT, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    expect(await playerNFT.getLevel(player1.address)).to.equal(1n);
  });

  it("getLevel returns 2 after 10 wins", async function () {
    const { playerNFT, owner, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await playerNFT.authorizeContract(owner.address);
    for (let i = 0; i < 10; i++) {
      await playerNFT.connect(owner).updateStats(player1.address, GOLD(1));
    }
    expect(await playerNFT.getLevel(player1.address)).to.equal(2n);
  });

  it("updateStats increments totalWins and lifetimeEarned", async function () {
    const { playerNFT, owner, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await playerNFT.authorizeContract(owner.address);
    await playerNFT.connect(owner).updateStats(player1.address, GOLD(20));
    const stats = await playerNFT.getStats(player1.address);
    expect(stats.totalWins).to.equal(1n);
    expect(stats.lifetimeEarned).to.equal(GOLD(20));
  });

  it("updateStats reverts if caller is not authorized", async function () {
    const { playerNFT, player1, player2 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await expect(
      playerNFT.connect(player2).updateStats(player1.address, GOLD(10)),
    ).to.be.revertedWith("Not authorized");
  });
});

// WordGuess -----------------------------------------------------------------------

describe("WordGuess", function () {
  it("startGame deducts 1 GOLD and marks game as active", async function () {
    const { goldToken, playerNFT, wordGuess, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice"); // welcome bonus: 10 GOLD
    const before = await goldToken.balanceOf(player1.address);
    await wordGuess.connect(player1).startGame();
    expect(await goldToken.balanceOf(player1.address)).to.equal(before - GOLD(1));
    expect(await wordGuess.activeGame(player1.address)).to.equal(true);
  });

  it("startGame reverts if player has no NFT", async function () {
    const { wordGuess, player1 } = await deployAll();
    await expect(wordGuess.connect(player1).startGame()).to.be.revertedWith(
      "Must have a Player NFT to play",
    );
  });

  it("startGame reverts if a game is already active", async function () {
    const { playerNFT, wordGuess, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await wordGuess.connect(player1).startGame();
    await expect(wordGuess.connect(player1).startGame()).to.be.revertedWith(
      "Active game already in progress",
    );
  });

  it("submitResult(1) pays 20 GOLD, records win and leaderboard entry", async function () {
    const { goldToken, playerNFT, leaderboard, wordGuess, player1 } =
      await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await wordGuess.connect(player1).startGame();
    const before = await goldToken.balanceOf(player1.address);
    await wordGuess.connect(player1).submitResult(1);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before + GOLD(20));
    expect((await playerNFT.getStats(player1.address)).totalWins).to.equal(1n);
    expect(await leaderboard.isTracked(player1.address)).to.equal(true);
  });

  it("submitResult(6) pays 2 GOLD", async function () {
    const { goldToken, playerNFT, wordGuess, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await wordGuess.connect(player1).startGame();
    const before = await goldToken.balanceOf(player1.address);
    await wordGuess.connect(player1).submitResult(6);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before + GOLD(2));
  });

  it("submitResult reverts if there is no active game", async function () {
    const { playerNFT, wordGuess, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await expect(wordGuess.connect(player1).submitResult(3)).to.be.revertedWith(
      "No active game exists",
    );
  });

  it("submitResult reverts with an invalid guess count", async function () {
    const { playerNFT, wordGuess, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await wordGuess.connect(player1).startGame();
    await expect(wordGuess.connect(player1).submitResult(7)).to.be.revertedWith(
      "Invalid guess count",
    );
  });

  it("forfeit clears the active game", async function () {
    const { playerNFT, wordGuess, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await wordGuess.connect(player1).startGame();
    await wordGuess.connect(player1).forfeit();
    expect(await wordGuess.activeGame(player1.address)).to.equal(false);
  });
});

// Snake -----------------------------------------------------------------------

describe("Snake", function () {
  it("submitResult with 9 apples pays no reward", async function () {
    const { goldToken, playerNFT, snake, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await snake.connect(player1).startGame();
    const before = await goldToken.balanceOf(player1.address);
    await snake.connect(player1).submitResult(9);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before);
  });

  it("submitResult with 10 apples pays 2 GOLD", async function () {
    const { goldToken, playerNFT, snake, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await snake.connect(player1).startGame();
    const before = await goldToken.balanceOf(player1.address);
    await snake.connect(player1).submitResult(10);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before + GOLD(2));
  });

  it("submitResult with 50 apples pays 10 GOLD", async function () {
    const { goldToken, playerNFT, snake, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await snake.connect(player1).startGame();
    const before = await goldToken.balanceOf(player1.address);
    await snake.connect(player1).submitResult(50);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before + GOLD(10));
  });

  it("submitResult with 100 apples pays 25 GOLD", async function () {
    const { goldToken, playerNFT, snake, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await snake.connect(player1).startGame();
    const before = await goldToken.balanceOf(player1.address);
    await snake.connect(player1).submitResult(100);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before + GOLD(25));
  });

  it("submitResult with a winning score records a leaderboard entry", async function () {
    const { playerNFT, leaderboard, snake, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await snake.connect(player1).startGame();
    await snake.connect(player1).submitResult(100);
    expect(await leaderboard.isTracked(player1.address)).to.equal(true);
  });

  it("submitResult below threshold does not record a leaderboard entry", async function () {
    const { playerNFT, leaderboard, snake, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await snake.connect(player1).startGame();
    await snake.connect(player1).submitResult(9);
    expect(await leaderboard.isTracked(player1.address)).to.equal(false);
  });
});

// BrickBreaker -----------------------------------------------------------------------

describe("BrickBreaker", function () {
  it("submitResult with score 999 pays no reward", async function () {
    const { goldToken, playerNFT, brickBreaker, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await brickBreaker.connect(player1).startGame();
    const before = await goldToken.balanceOf(player1.address);
    await brickBreaker.connect(player1).submitResult(999);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before);
  });

  it("submitResult with score 1000 pays 2 GOLD", async function () {
    const { goldToken, playerNFT, brickBreaker, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await brickBreaker.connect(player1).startGame();
    const before = await goldToken.balanceOf(player1.address);
    await brickBreaker.connect(player1).submitResult(1000);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before + GOLD(2));
  });

  it("submitResult with score 5000 pays 7 GOLD", async function () {
    const { goldToken, playerNFT, brickBreaker, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await brickBreaker.connect(player1).startGame();
    const before = await goldToken.balanceOf(player1.address);
    await brickBreaker.connect(player1).submitResult(5000);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before + GOLD(7));
  });

  it("submitResult with score 10000 pays 15 GOLD", async function () {
    const { goldToken, playerNFT, brickBreaker, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await brickBreaker.connect(player1).startGame();
    const before = await goldToken.balanceOf(player1.address);
    await brickBreaker.connect(player1).submitResult(10000);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before + GOLD(15));
  });
});

// MemoryMatch -----------------------------------------------------------------------

describe("MemoryMatch", function () {
  it("submitResult with 10 attempts pays 20 GOLD", async function () {
    const { goldToken, playerNFT, memoryMatch, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await memoryMatch.connect(player1).startGame();
    const before = await goldToken.balanceOf(player1.address);
    await memoryMatch.connect(player1).submitResult(10);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before + GOLD(20));
  });

  it("submitResult with 14 attempts pays 15 GOLD", async function () {
    const { goldToken, playerNFT, memoryMatch, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await memoryMatch.connect(player1).startGame();
    const before = await goldToken.balanceOf(player1.address);
    await memoryMatch.connect(player1).submitResult(14);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before + GOLD(15));
  });

  it("submitResult with 32 attempts pays 2 GOLD", async function () {
    const { goldToken, playerNFT, memoryMatch, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await memoryMatch.connect(player1).startGame();
    const before = await goldToken.balanceOf(player1.address);
    await memoryMatch.connect(player1).submitResult(32);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before + GOLD(2));
  });

  it("submitResult with 33 attempts pays no reward", async function () {
    const { goldToken, playerNFT, memoryMatch, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await memoryMatch.connect(player1).startGame();
    const before = await goldToken.balanceOf(player1.address);
    await memoryMatch.connect(player1).submitResult(33);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before);
  });

  it("submitResult reverts with fewer than 8 attempts", async function () {
    const { playerNFT, memoryMatch, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await memoryMatch.connect(player1).startGame();
    await expect(memoryMatch.connect(player1).submitResult(7)).to.be.revertedWith(
      "Invalid attempt count",
    );
  });
});

// ConnectFour -----------------------------------------------------------------------

describe("ConnectFour", function () {
  it("submitResult(true) pays 10 GOLD, records win and leaderboard entry", async function () {
    const { goldToken, playerNFT, leaderboard, connectFour, player1 } =
      await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await connectFour.connect(player1).startGame();
    const before = await goldToken.balanceOf(player1.address);
    await connectFour.connect(player1).submitResult(true);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before + GOLD(10));
    expect((await playerNFT.getStats(player1.address)).totalWins).to.equal(1n);
    expect(await leaderboard.isTracked(player1.address)).to.equal(true);
  });

  it("submitResult(false) pays no GOLD and does not record a win", async function () {
    const { goldToken, playerNFT, leaderboard, connectFour, player1 } =
      await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await connectFour.connect(player1).startGame();
    const before = await goldToken.balanceOf(player1.address);
    await connectFour.connect(player1).submitResult(false);
    expect(await goldToken.balanceOf(player1.address)).to.equal(before);
    expect((await playerNFT.getStats(player1.address)).totalWins).to.equal(0n);
    expect(await leaderboard.isTracked(player1.address)).to.equal(false);
  });

  it("submitResult reverts if there is no active game", async function () {
    const { playerNFT, connectFour, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await expect(connectFour.connect(player1).submitResult(true)).to.be.revertedWith(
      "No active game exists",
    );
  });
});

// Leaderboard -----------------------------------------------------------------------

describe("Leaderboard", function () {
  it("a player who wins twice appears on the leaderboard only once", async function () {
    const { playerNFT, leaderboard, connectFour, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    for (let i = 0; i < 2; i++) {
      await connectFour.connect(player1).startGame();
      await connectFour.connect(player1).submitResult(true);
    }
    expect(await leaderboard.getPlayerCount()).to.equal(1n);
  });

  it("getPlayers returns paginated slices of the player list", async function () {
    const { playerNFT, leaderboard, connectFour, player1, player2, player3 } =
      await deployAll();
    for (const [player, name] of [
      [player1, "Alice"],
      [player2, "Bob"],
      [player3, "Carol"],
    ] as const) {
      await playerNFT.connect(player).mint(name);
      await connectFour.connect(player).startGame();
      await connectFour.connect(player).submitResult(true);
    }
    const page1 = await leaderboard.getPlayers(0, 2);
    expect(page1.length).to.equal(2);
    const page2 = await leaderboard.getPlayers(2, 2);
    expect(page2.length).to.equal(1);
    expect(page2[0]).to.equal(player3.address);
  });

  it("getPlayers returns an empty array when offset exceeds total count", async function () {
    const { leaderboard } = await deployAll();
    const result = await leaderboard.getPlayers(10, 5);
    expect(result.length).to.equal(0);
  });

  it("getStats reads correctly from PlayerNFT", async function () {
    const { playerNFT, leaderboard, connectFour, player1 } = await deployAll();
    await playerNFT.connect(player1).mint("Alice");
    await connectFour.connect(player1).startGame();
    await connectFour.connect(player1).submitResult(true);
    const stats = await leaderboard.getStats(player1.address);
    expect(stats.name).to.equal("Alice");
    expect(stats.totalWins).to.equal(1n);
  });

  it("recordWin reverts if caller is not an authorized game contract", async function () {
    const { leaderboard, player1 } = await deployAll();
    await expect(
      leaderboard.connect(player1).recordWin(player1.address),
    ).to.be.revertedWith("Not authorized");
  });
});
