// frontend/src/pages/Home.js
// Home page — hero section with player card + featured game cards

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const GAMES = [
  { id: 'wordguess',    name: 'Word Quest',    icon: '📜', reward: 'Up to 20 GOLD', description: 'Guess the word in 6 tries', color: '#e4c1f9' },
  { id: 'memorymatch',  name: 'Mind Match',    icon: '🧠', reward: 'Up to 20 GOLD', description: 'Match all pairs to win',    color: '#ffd3b6' },
  { id: 'snake',        name: 'Snake Harvest', icon: '🐍', reward: 'Up to 25 GOLD', description: 'Eat apples, grow longer',   color: '#a8e6cf' },
  { id: 'brickbreaker', name: 'Brick Breaker', icon: '🧱', reward: 'Up to 15 GOLD', description: 'Break all the bricks',     color: '#f6c453' },
  { id: 'connectfour',  name: 'Connect Four',  icon: '🔴', reward: 'Up to 10 GOLD', description: 'Connect 4 to win',          color: '#bdeefe' },
];

function Home({ account, contracts, hasNFT, goldBalance, stats, loading, claimFaucet, formatGold, setPage, connect }) {
  const [topPlayers, setTopPlayers] = useState([]);
  const [faucetMsg,  setFaucetMsg]  = useState(null);

  // Fetch top 3 leaderboard players
  useEffect(() => {
    if (!contracts) return;
    const fetchTop = async () => {
      try {
        const count = await contracts.leaderboard.getPlayerCount();
        if (count === 0n) return;
        const limit = count > 3n ? 3n : count;
        const addresses = await contracts.leaderboard.getPlayers(0, limit);
        const data = await Promise.all(
          addresses.map(async (addr) => {
            const s = await contracts.leaderboard.getStats(addr);
            return { address: addr, name: s.name, lifetimeEarned: s.lifetimeEarned };
          })
        );
        data.sort((a, b) => (b.lifetimeEarned > a.lifetimeEarned ? 1 : -1));
        setTopPlayers(data);
      } catch (e) { /* silently fail */ }
    };
    fetchTop();
  }, [contracts]);

  const handleFaucet = async () => {
    try {
      await claimFaucet();
      setFaucetMsg('✅ Claimed 10 GOLD!');
    } catch (err) {
      setFaucetMsg(err.message?.includes('24') ? '⏳ Already claimed today!' : '❌ Claim failed.');
    }
    setTimeout(() => setFaucetMsg(null), 3000);
  };

  return (
    <div>

      {/* ══════════════════════════════════════════════════════
          HERO — sky background + grass + house + content
      ══════════════════════════════════════════════════════ */}
      <div className="hero">

        {/* Decorative wooden house behind everything */}
        <img
          src="/assets/Wooden House.png"
          alt=""
          className="hero-house"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Left — tagline + CTA buttons */}
        <div className="hero-left">
          <h1 className="hero-title">
            PLAY <span style={{ color: '#4a9e6b' }}>PIXEL</span> GAMES,<br />
            EARN REAL <span style={{ color: '#e07a3a' }}>REWARDS.</span>
          </h1>
          <p className="hero-sub">
            Welcome to Pixel Grove, where fun meets blockchain.<br />
            Pay 1 GOLD to play. Win GOLD from the treasury.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
            {hasNFT && (
              <button className="btn-pixel" style={{ background: '#ff8c69', fontSize: '16px', padding: '12px 24px' }} onClick={() => setPage('wordguess')}>
                ▶ Start Playing
              </button>
            )}
            {!account && (
              <button className="btn-pixel green" style={{ fontSize: '16px', padding: '12px 24px' }} onClick={connect}>
                🔗 Connect Wallet
              </button>
            )}
            {account && !hasNFT && (
              <button className="btn-pixel" style={{ fontSize: '16px', padding: '12px 24px' }} onClick={() => setPage('profile')}>
                🌱 Mint Player NFT
              </button>
            )}
          </div>
        </div>

        {/* Right — player stats card */}
        <div className="hero-right">
          {!account ? (
            <div className="player-card">
              <div style={{ textAlign: 'center', padding: '12px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌿</div>
                <p style={{ fontSize: '15px', color: 'var(--brown)' }}>
                  Connect your wallet to view your player stats
                </p>
              </div>
            </div>
          ) : !hasNFT ? (
            <div className="player-card">
              <div style={{ textAlign: 'center', padding: '12px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌱</div>
                <p style={{ fontSize: '15px', marginBottom: '12px' }}>Mint your Player NFT!</p>
                <p style={{ fontSize: '13px', color: 'var(--brown)', marginBottom: '16px' }}>Includes 10 GOLD welcome bonus 🎁</p>
                <button className="btn-pixel green" onClick={() => setPage('profile')}>Mint NFT</button>
              </div>
            </div>
          ) : (
            <div className="player-card">
              {/* Player greeting */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ fontSize: '36px' }}>🧑‍🌾</div>
                <div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: '15px' }}>
                    Hi, {stats?.name || '...'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--brown)', marginTop: '2px' }}>
                    Level {stats?.level?.toString() || '1'} ⭐
                  </div>
                </div>
              </div>

              {/* Stat chips row */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <div className="stat-chip gold">
                  <div className="stat-chip-icon">🪙</div>
                  <div className="stat-chip-value">{formatGold(goldBalance)}</div>
                  <div className="stat-chip-label">GOLD</div>
                </div>
                <div className="stat-chip mint">
                  <div className="stat-chip-icon">🏆</div>
                  <div className="stat-chip-value">{stats?.totalWins?.toString() || '0'}</div>
                  <div className="stat-chip-label">Wins</div>
                </div>
                <div className="stat-chip peach">
                  <div className="stat-chip-icon">⭐</div>
                  <div className="stat-chip-value">{stats?.level?.toString() || '1'}</div>
                  <div className="stat-chip-label">Level</div>
                </div>
              </div>

              {/* Daily faucet button */}
              <button className="btn-pixel gold" onClick={handleFaucet} disabled={loading} style={{ width: '100%', fontSize: '14px' }}>
                🪙 Claim Daily 10 GOLD
              </button>
              {faucetMsg && <p style={{ fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>{faucetMsg}</p>}
            </div>
          )}
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════
          FEATURED GAMES
      ══════════════════════════════════════════════════════ */}
      <div className="page">

        <h2 className="page-title">🎮 Featured Games</h2>

        {/* Low balance warning */}
        {account && parseFloat(ethers.formatEther(goldBalance)) < 1 && (
          <div className="error-msg" style={{ marginBottom: '16px' }}>
            ⚠️ You need at least 1 GOLD to play. Claim your daily faucet on the Profile page!
          </div>
        )}

        {/* Game cards — two-section design matching reference */}
        <div className="game-grid">
          {GAMES.map((game) => (
            <div key={game.id} className="game-card">

              {/* Colored top section with icon */}
              <div className="game-card-top" style={{ background: game.color }}>
                <div className="game-card-icon">{game.icon}</div>
              </div>

              {/* White bottom section with text + button */}
              <div className="game-card-body">
                <div className="game-card-name">{game.name}</div>
                <div className="game-card-desc">{game.description}</div>
                <div className="game-card-reward">
                  Earn up to <span>{game.reward}</span>
                </div>
                <button
                  className="btn-pixel green"
                  onClick={() => setPage(game.id)}
                  disabled={!hasNFT}
                  title={!hasNFT ? 'Mint a Player NFT first' : ''}
                  style={{ marginTop: '4px', fontSize: '14px' }}
                >
                  ▶ Play
                </button>
              </div>

            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════
            MINI LEADERBOARD PREVIEW
        ══════════════════════════════════════════════════ */}
        {topPlayers.length > 0 && (
          <div style={{ marginTop: '48px', maxWidth: '480px' }}>
            <h2 className="page-title">🏆 Leaderboard</h2>
            <div className="card">
              {topPlayers.map((p, i) => (
                <div key={p.address} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: i < topPlayers.length - 1 ? '2px solid var(--cream)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                    <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{p.name}</span>
                  </div>
                  <span style={{ color: 'var(--gold-dark)', fontWeight: 'bold', fontSize: '15px' }}>
                    🪙 {formatGold(p.lifetimeEarned)}
                  </span>
                </div>
              ))}
              <button className="btn-pixel" onClick={() => setPage('leaderboard')} style={{ marginTop: '16px', width: '100%' }}>
                View Full Leaderboard
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Home;
