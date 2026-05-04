// frontend/src/pages/Leaderboard.js

import { useState, useEffect } from "react";

function Leaderboard({ contracts, formatGold }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!contracts) return;
    fetchLeaderboard();
  }, [contracts]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const count = await contracts.leaderboard.getPlayerCount();
      if (count === 0n) { setPlayers([]); return; }
      const addresses = await contracts.leaderboard.getPlayers(0, count);
      const playerData = await Promise.all(
        addresses.map(async (addr) => {
          const stats = await contracts.leaderboard.getStats(addr);
          return { address: addr, name: stats.name, level: stats.level, totalWins: stats.totalWins, lifetimeEarned: stats.lifetimeEarned };
        })
      );
      playerData.sort((a, b) => (b.lifetimeEarned > a.lifetimeEarned ? 1 : -1));
      setPlayers(playerData);
    } catch (err) {
      setError("Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  };

  // Left accent color for top 3
  const rankAccent = (i) => {
    if (i === 0) return '#F2C94C';
    if (i === 1) return '#C8C8C8';
    if (i === 2) return '#D4956A';
    return 'rgba(255,255,255,0.4)';
  };

  const medal = (i) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return <span style={{ fontFamily: 'var(--pixel-font)', fontSize: 'var(--font-sm)', color: 'var(--navy)' }}>#{i + 1}</span>;
  };


  return (
    <div className="page">
      <h1 className="page-title">LEADERBOARD</h1>

      <button className="btn-pixel small" onClick={fetchLeaderboard} disabled={loading} style={{ marginBottom: '24px', background: '#A7D3E8', border: '2px solid #7AB8D4', color: 'var(--navy)' }}>
        {loading ? 'Loading...' : 'Refresh'}
      </button>

      {error && <div className="error-msg">{error}</div>}

      {!loading && players.length === 0 && !error && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p>
            No players yet. Be the first to win a game! 🌿
          </p>
        </div>
      )}

      {players.length > 0 && (
        <div className="card">

          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '70px 1fr 120px 120px 160px',
            padding: '0 8px 16px 8px',
            fontFamily: 'var(--pixel-font)',
            fontSize: 'var(--font-base)',
            color: 'var(--brown)',
            borderBottom: '2px solid #C9A87C',
            marginBottom: 10,
          }}>
            <span>Rank</span>
            <span>Player</span>
            <span style={{ textAlign: 'center' }}>Level</span>
            <span style={{ textAlign: 'center' }}>Wins</span>
            <span style={{ textAlign: 'center' }}>Earned</span>
          </div>

          {/* Player rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map((player, i) => (
              <div key={player.address} style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr 120px 120px 160px',
                alignItems: 'center',
                padding: '12px 8px',
                background: 'rgba(255, 246, 232, 0.65)',
                borderRadius: 12,
                borderLeft: `4px solid ${rankAccent(i)}`,
                gap: 8,
              }}>
                {/* Rank */}
                <div style={{ fontSize: 26, textAlign: 'center', lineHeight: 1 }}>
                  {medal(i)}
                </div>

                {/* Name + address */}
                <div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 'var(--font-base)', color: 'var(--navy)' }}>
                    {player.name}
                  </div>
                  <div style={{ fontSize: 'var(--font-sm)', color: 'var(--brown)', fontFamily: 'var(--pixel-font)', marginTop: 2 }}>
                    {player.address.slice(0, 6)}…{player.address.slice(-4)}
                  </div>
                </div>

                {/* Level */}
                <div style={{ textAlign: 'center', fontFamily: 'var(--pixel-font)', fontSize: 'var(--font-base)', color: 'var(--navy)' }}>
                  ⭐ {player.level.toString()}
                </div>

                {/* Wins */}
                <div style={{ textAlign: 'center', fontFamily: 'var(--pixel-font)', fontSize: 'var(--font-base)', color: 'var(--navy)' }}>
                  🏆 {player.totalWins.toString()}
                </div>

                {/* Lifetime earned */}
                <div style={{ textAlign: 'center', fontFamily: 'var(--pixel-font)', fontSize: 'var(--font-base)', color: '#D4A72C' }}>
                  🪙 {formatGold(player.lifetimeEarned)}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}

export default Leaderboard;
