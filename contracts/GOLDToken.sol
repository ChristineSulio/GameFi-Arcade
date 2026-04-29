// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract GOLDToken is ERC20, Ownable {
    // ======== State variables ========

    // Track when each player last claimed their daily faucet
    mapping(address => uint256) public lastDailyClaim;

    // List of game contracts authorized to call treasury functions
    mapping(address => bool) public authorizedContracts;

    // Treasury amount is balance of contract --> implicitly balanceOf(address(this))
    uint256 public constant TREASURY_INITIAL = 1_000_000 * 10**18;
    uint256 public constant DAILY_FAUCET_AMOUNT = 10 * 10**18; // 10 GOLD every 24 hours
    uint256 public constant ENTRY_FEE = 1 * 10**18; // 1 GOLD entry fee for games

    // ======== Events ========
    event DailyClaimed(address indexed player, uint256 amount, uint256 timestamp);
    event ContractAuthorized(address indexed contractAddress);
    event ContractDeauthorized(address indexed contractAddress);
    event EntryFeeDeducted(address indexed player, uint256 amount);
    event TreasuryTransferred(address indexed to, uint256 amount);

    // ======== Constructor ========
    constructor() ERC20("GOLD Token", "GOLD") Ownable(msg.sender) {
        // Mint 1,000,000 GOLD for treasury
        _mint(address(this), TREASURY_INITIAL);
    }

    // ======== Daily Faucet ========
    function dailyClaim() external {
        // Check if 24 hours have passed since last claim
        // Revert with descriptive message if user already claimed within last 24 hours
        require(block.timestamp >= lastDailyClaim[msg.sender] + 1 days, "Must wait 24 hours between daily faucet claims");
        lastDailyClaim[msg.sender] = block.timestamp;
        transfer(msg.sender, DAILY_FAUCET_AMOUNT);
        emit DailyClaimed(msg.sender, DAILY_FAUCET_AMOUNT, lastDailyClaim[msg.sender]);
    }

    function getDailyClaimTimestamp(address wallet) external view returns (uint256) {
        // Return timestamp of wallet's last claim (0 if never claimed)
        return lastDailyClaim[wallet];
    }

    // ======== Authorization (Owner-only) ========
    function authorizeContract(address contractAddress) external onlyOwner {
        authorizedContracts[contractAddress] = true; 
        emit ContractAuthorized(contractAddress);
    }


    function deauthorizeContract(address contractAddress) external onlyOwner {
        authorizedContracts[contractAddress] = false;
        emit ContractDeauthorized(contractAddress);
    }

    // ======== Treasury Access (Authorized contracts only) ========
    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender], "Not authorized");
        _;
    }

    // Called by game contracts to pay rewards
    function transferFromTreasury(address to, uint256 amount) external onlyAuthorized {
        // Check treasury has enough balance
        require(balanceOf(address(this)) >= amount, "Not enough balance in treasury");
        transfer(to, amount);
        emit TreasuryTransferred(to, amount);
    }

    function deductEntryFee(address player) external onlyAuthorized {
        // Check player has at least 1 GOLD to pay game entry fee
        require(balanceOf(player) >= ENTRY_FEE, "Insufficient GOLD for entry fee");
        _burn(player, ENTRY_FEE);
        emit EntryFeeDeducted(player, ENTRY_FEE);
    }
}