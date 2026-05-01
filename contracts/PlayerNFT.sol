// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Each player wallet mints exactly one token
// Tracks a player's profile on-chain with their wins, lifetime earnings, and level
// Welcome bonus upon sign up is 10 GOLD

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {GOLDToken} from "./GOLDToken.sol"; 

contract PlayerNFT is ERC721, Ownable {
    
    // ======== State Variables ========

    // Reference to deployed GOLDToken contract so we can call it directly
    GOLDToken public goldToken;

    // Auto-incrementing token ID counter (each mint gets the next ID)
    uint256 private _nextTokenId;

    // One-time welcome bonus sent to new players on first mint
    uint256 public constant WELCOME_BONUS = 10 * 10**18;

    // Enforces one player NFT per wallet
    mapping(address => bool) public hasMinted;

    // Enforces name uniqueness
    mapping(string => bool) public nameTaken;

    // Game contracts authorized to call updateStats() after a win
    mapping(address => bool) public authorizedContracts;

    struct PlayerStats {
        uint256 tokenId;
        string name;
        uint256 totalWins;
        uint256 lifetimeEarned;
    }

    mapping(address => PlayerStats) public playerStats;

    // ======== Events ========
    event PlayerMinted(address indexed player, uint256 tokenId);
    event StatsUpdated(address indexed player, uint256 totalWins, uint256 lifetimeEarned);
    event PlayerNamed(address indexed player, string name);

    // ======== Constructor ========
    
    // goldTokenAddress: the deployed GOLDToken contract address (passed at deploy time)
    constructor(address goldTokenAddress) ERC721("BlockCade Player", "BPLAYER") Ownable(msg.sender)
    {
        goldToken = GOLDToken(goldTokenAddress); // Treat this address as a deployed GOLDToken contract
    }

    // ======== Modifier ========
    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender], "Not authorized");
        _;
    }

    // ======== Mint ========
    function mint(string calldata name) external {
        require(!hasMinted[msg.sender], "Already minted a Player NFT");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(name).length <= 32, "Name too long");
        require(!nameTaken[name], "Name already taken");

        hasMinted[msg.sender] = true;
        nameTaken[name] = true;
        uint256 tokenId = _nextTokenId++;

        // Initialize player stats at zero
        playerStats[msg.sender] = PlayerStats({
            tokenId: tokenId,
            name: name,
            totalWins: 0,
            lifetimeEarned: 0
        });

        // Checks recipient can handle ERC721 tokens (prevents tokens getting stuck)
        _safeMint(msg.sender, tokenId);
        // Send welcome bonus (10 GOLD) to new minted player NFT
        goldToken.transferFromTreasury(msg.sender, WELCOME_BONUS);

        emit PlayerMinted(msg.sender, tokenId);
    }

    // ======== Player Name ========
    function setPlayerName(string calldata name) external {
        require(hasMinted[msg.sender], "Must mint a Player NFT first");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(name).length <= 32, "Name too long");
        require(!nameTaken[name], "Name already taken");

        // Free up old name so someone else can claim it
        nameTaken[playerStats[msg.sender].name] = false;
        nameTaken[name] = true;
        playerStats[msg.sender].name = name;

        emit PlayerNamed(msg.sender, name);
    }

    // ======== Stats ========

    // Called by game contracts (after every win) to record the result
    function updateStats(address player, uint256 rewardAmount) external onlyAuthorized {
        PlayerStats storage stats = playerStats[player]; // storage (reference to on-chain data), changes persist
        stats.totalWins += 1;
        stats.lifetimeEarned += rewardAmount;
        emit StatsUpdated(player, stats.totalWins, stats.lifetimeEarned);
    }

    // Returns all player stats in one call (for frontend)
    function getStats(address player) external view returns (string memory name, uint256 level, uint256 totalWins, uint256 lifetimeEarned) {
        PlayerStats memory stats = playerStats[player];
        return (stats.name, getLevel(player), stats.totalWins, stats.lifetimeEarned);
    }

    // ======== Level ========

    // Level is derived dynamically from wins (not stored)
    // Formula: sqrt(totalWins/10) + 1
    // Results in diminishing results: Level 2 = 10 wins, Level 3 = 40 wins, Level 4 = 90 wins
    function getLevel(address player) public view returns (uint256) {
        uint256 wins = playerStats[player].totalWins;
        return Math.sqrt(wins / 10) + 1;
    }

    // ======== Authorization ========
    
    // Only the contract owner (deployer) can authorize game contracts
    function authorizeContract(address contractAddress) external onlyOwner {
        authorizedContracts[contractAddress] = true;
    }

    function deauthorizeContract(address contractAddress) external onlyOwner {
        authorizedContracts[contractAddress] = false;
    }
    
}