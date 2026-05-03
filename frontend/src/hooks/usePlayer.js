// frontend/src/hooks/usePlayer.js
// Manages all on-chain player state for the connected wallet.
// Exposes: hasNFT, goldBalance, stats, loading, error,
//          refresh(), mintNFT(), claimFaucet(), formatGold()

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

export function usePlayer(contracts, account) {
  const [hasNFT, setHasNFT] = useState(false);
  const [goldBalance, setGoldBalance] = useState(0n); // BigInt in wei
  const [stats, setStats] = useState(null); // { name, level, totalWins, lifetimeEarned }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Read current player state from chain
  const refresh = useCallback(async () => {
    if (!contracts || !account) return;
    setLoading(true);
    setError(null);
    try {
      const _hasNFT = await contracts.playerNFT.hasMinted(account);
      const _balance = await contracts.goldToken.balanceOf(account);
      setHasNFT(_hasNFT);
      setGoldBalance(_balance); // keep as BigInt for ethers.formatEther later

      if (_hasNFT) {
        const [name, level, totalWins, lifetimeEarned] =
          await contracts.playerNFT.getStats(account);
        setStats({ name, level, totalWins, lifetimeEarned }); // keep as BigInt
      } else {
        setStats(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [contracts, account]);

  // Auto-refresh when account or contracts change
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Mint a new Player NFT — refreshes state after confirmation
  const mintNFT = useCallback(
    async (name) => {
      if (!contracts) throw new Error("Contracts not initialized");
      setLoading(true);
      setError(null);
      try {
        const tx = await contracts.playerNFT.mint(name);
        await tx.wait(); // wait for block confirmation
        await refresh();
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [contracts, refresh],
  );

  // Claim 10 GOLD from the daily faucet
  const claimFaucet = useCallback(async () => {
    if (!contracts) throw new Error("Contracts not initialized");
    setLoading(true);
    setError(null);
    try {
      const tx = await contracts.goldToken.dailyClaim(); // no args — uses msg.sender
      await tx.wait();
      await refresh();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contracts, refresh]);

  // Convert BigInt wei to readable GOLD string e.g. 10000000000000000000n → "10.0"
  const formatGold = (wei) => parseFloat(ethers.formatEther(wei)).toFixed(1);

  return {
    hasNFT,
    goldBalance,
    stats,
    loading,
    error,
    refresh,
    mintNFT,
    claimFaucet,
    formatGold,
  };
}
