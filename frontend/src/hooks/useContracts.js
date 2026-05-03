// frontend/src/hooks/useContracts.js
// Combines contract addresses, ABIs, and the connected wallet signer
// into ready-to-use ethers.js Contract objects.
// Returns null if wallet is not connected or network is unsupported.

import { useMemo } from "react";
import { ethers } from "ethers";
import { getAddresses } from "../contracts/addresses";
import ABIS from "../contracts/abis";

export function useContracts(signer, chainId) {
  // useMemo ensures contract objects are only recreated when
  // the signer or chainId actually changes, not on every render
  return useMemo(() => {
    if (!signer || !chainId) return null;

    let addresses;
    try {
      addresses = getAddresses(chainId);
    } catch {
      return null; // user is on an unsupported network
    }

    // Shorthand helper: creates one Contract instance
    const c = (addr, abi) => new ethers.Contract(addr, abi, signer);

    return {
      goldToken: c(addresses.GOLDToken, ABIS.GOLDToken),
      playerNFT: c(addresses.PlayerNFT, ABIS.PlayerNFT),
      leaderboard: c(addresses.Leaderboard, ABIS.Leaderboard),
      wordGuess: c(addresses.WordGuess, ABIS.WordGuess),
      snake: c(addresses.Snake, ABIS.Snake),
      brickBreaker: c(addresses.BrickBreaker, ABIS.BrickBreaker),
      memoryMatch: c(addresses.MemoryMatch, ABIS.MemoryMatch),
      connectFour: c(addresses.ConnectFour, ABIS.ConnectFour),
    };
  }, [signer, chainId]);
}
