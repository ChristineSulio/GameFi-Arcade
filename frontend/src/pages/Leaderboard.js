// frontend/src/pages/Leaderboard.js
// Fetches all players from the Leaderboard contract and displays their stats.

import { useState, useEffect } from "react";
import { ethers } from "ethers";

function Leaderboard({ contracts, formatGold }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!contracts) return;
    fetchLeaderboard();
  }, [contracts]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get total player count first
      const count = await contracts.leaderboard.getPlayerCount();

      if (count === 0n) {
        setPlayers([]);
        return;
      }

      // Fetch all player addresses in one call
      const addresses = await contracts.leaderboard.getPlayers(0, count);

      // Fetch stats for each player from PlayerNFT via Leaderboard
      const playerData = await Promise.all(
        addresses.map(async (addr) => {
          const stats = await contracts.leaderboard.getStats(addr);
          return {
            address: addr,
            name: stats.name,
            level: stats.level,
            totalWins: stats.totalWins,
            lifetimeEarned: stats.lifetimeEarned,
          };
        }),
      );

      // Sort by lifetime earned descending
      playerData.sort((a, b) => (b.lifetimeEarned > a.lifetimeEarned ? 1 : -1));

      setPlayers(playerData);
    } catch (err) {
      setError("Failed to load leaderboard.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Medal emojis for top 3
  const medal = (i) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return `#${i + 1}`;
  };

  return (
    <div className="page">
      <h1 className="page-title">🏆 Leaderboard</h1>

      {/* Refresh button */}
      <button
        className="btn-pixel"
        onClick={fetchLeaderboard}
        disabled={loading}
        style={{ marginBottom: "24px" }}
      >
        {loading ? "Loading..." : "🔄 Refresh"}
      </button>

      {/* Error */}
      {error && <div className="error-msg">{error}</div>}

      {/* No players yet */}
      {!loading && players.length === 0 && !error && (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ fontSize: "14px", color: "var(--brown)" }}>
            No players on the leaderboard yet. Be the first to win a game! 🌿
          </p>
        </div>
      )}

      {/* Leaderboard table */}
      {players.length > 0 && (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Level</th>
              <th>Wins</th>
              <th>Lifetime Earned</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, i) => (
              <tr key={player.address}>
                <td
                  style={{
                    fontFamily: "var(--pixel-font)",
                    fontSize: "12px",
                    textAlign: "center",
                  }}
                >
                  {medal(i)}
                </td>
                <td>
                  <div style={{ fontWeight: "bold" }}>{player.name}</div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--brown)",
                      fontFamily: "monospace",
                    }}
                  >
                    {player.address.slice(0, 6)}...{player.address.slice(-4)}
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>
                  ⭐ {player.level.toString()}
                </td>
                <td style={{ textAlign: "center" }}>
                  🏆 {player.totalWins.toString()}
                </td>
                <td style={{ textAlign: "center" }}>
                  🪙 {formatGold(player.lifetimeEarned)} GOLD
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Leaderboard;
