// frontend/src/hooks/usePlayer.js
// Fetches player state from blockchain and exposes player actions.
// Returns: playerData (NFT balance, GOLD balance, stats), loading, error, actions (mintNFT, claimFaucet)

import { useState, useEffect, useCallback } from "react";

export function usePlayer(account, contracts) {
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch player state from chain
  const fetchPlayerData = useCallback(async () => {
    if (!account || !contracts) {
      setPlayerData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if player has NFT
      const nftBalance = await contracts.playerNFT.balanceOf(account);
      const hasNFT = nftBalance > 0n;

      // Fetch GOLD balance
      const goldBalance = await contracts.goldToken.balanceOf(account);

      // Fetch stats if NFT owned
      let stats = null;
      if (hasNFT) {
        stats = await contracts.playerNFT.getStats(account);
      }

      setPlayerData({
        account,
        hasNFT,
        nftBalance: nftBalance.toString(),
        goldBalance: goldBalance.toString(),
        stats: stats
          ? {
              name: stats.name,
              level: stats.level.toString(),
              totalWins: stats.totalWins.toString(),
              lifetimeEarned: stats.lifetimeEarned.toString(),
            }
          : null,
      });
    } catch (err) {
      setError(err.message);
      setPlayerData(null);
    } finally {
      setLoading(false);
    }
  }, [account, contracts]);

  // Fetch on mount and when account/contracts change
  useEffect(() => {
    fetchPlayerData();
  }, [fetchPlayerData]);

  // Action: Mint player NFT
  const mintNFT = useCallback(async (name) => {
    if (!contracts) throw new Error("Contracts not initialized");

    try {
      setLoading(true);
      const tx = await contracts.playerNFT.mint(name);
      await tx.wait();
      setError(null);
      await fetchPlayerData(); // Refresh after mint
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contracts, fetchPlayerData]);

  // Action: Claim daily GOLD faucet
  const claimFaucet = useCallback(async () => {
    if (!contracts || !account) throw new Error("Not connected");

    try {
      setLoading(true);
      const tx = await contracts.goldToken.dailyClaim(account);
      await tx.wait();
      setError(null);
      await fetchPlayerData(); // Refresh after claim
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contracts, account, fetchPlayerData]);

  return {
    playerData,
    loading,
    error,
    actions: {
      mintNFT,
      claimFaucet,
      refetch: fetchPlayerData,
    },
  };
}
