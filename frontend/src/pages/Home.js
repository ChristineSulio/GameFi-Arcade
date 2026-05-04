// frontend/src/pages/Home.js
// Home page — hero section with player card + featured game cards

import { useState, useEffect, useCallback } from 'react';
import SpriteButton from '../components/SpriteButton';
import { ethers } from 'ethers';

const GAMES = [
  { id: 'wordguess',    name: 'Word Quest',    icon: '/assets/icon-wordguess.png',    reward: 'Up to 20 GOLD', description: 'Guess the word in 6 tries', color: '#B79AC8' },
  { id: 'memorymatch',  name: 'Mind Match',    icon: '/assets/icon-memorymatch.png',  reward: 'Up to 20 GOLD', description: 'Match all pairs to win',    color: '#F7B37A' },
  { id: 'snake',        name: 'Snake Harvest', icon: '/assets/icon-snake.png',        reward: 'Up to 25 GOLD', description: 'Eat apples, grow longer',   color: '#A7D28D' },
  { id: 'brickbreaker', name: 'Brick Breaker', icon: '/assets/icon-brickbreaker.png', reward: 'Up to 15 GOLD', description: 'Break all the bricks',     color: '#F2C94C' },
  { id: 'connectfour',  name: 'Connect Four',  icon: '/assets/icon-connectfour.png',  reward: 'Up to 10 GOLD', description: 'Connect 4 to win',          color: '#A7D3E8' },
];

function Home({ account, contracts, hasNFT, goldBalance, stats, dailyEarned, lastDailyClaim, loading, claimFaucet, formatGold, setPage, connect }) {
  const [topPlayers, setTopPlayers] = useState([]);
  const [faucetMsg,  setFaucetMsg]  = useState(null);
  const [cooldown,   setCooldown]   = useState('');  // e.g. "5h 23m"

  // Compute faucet cooldown from lastDailyClaim timestamp
  const updateCooldown = useCallback(() => {
    if (!lastDailyClaim || lastDailyClaim === 0n) { setCooldown(''); return; }
    const nextClaim = Number(lastDailyClaim) + 86400; // 24h in seconds
    const remaining = nextClaim - Math.floor(Date.now() / 1000);
    if (remaining <= 0) { setCooldown(''); return; }
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    setCooldown(h > 0 ? `${h}h ${m}m` : `${m}m`);
  }, [lastDailyClaim]);

  // Update cooldown every minute
  useEffect(() => {
    updateCooldown();
    const interval = setInterval(updateCooldown, 60000);
    return () => clearInterval(interval);
  }, [updateCooldown]);

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
          src="/assets/home_logo.png"
          alt=""
          className="hero-house"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Left — tagline + CTA buttons */}
        <div className="hero-left">
          <h1 className="hero-title">
            PLAY <span style={{ color: '#7FB069' }}>MINI</span> GAMES,<br />
            EARN <span style={{ color: '#D4A72C' }}>GOLD</span> TOKENS.
          </h1>
          <p className="hero-sub">
            Welcome to Pixel Grove, where fun meets blockchain.<br />
            Pay 1 GOLD to play. Win GOLD from the treasury.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
            {hasNFT && (
              <button className="btn-pixel" style={{ background: '#EDD9B2', border: '2px solid #C9A87C', color: 'var(--navy)' }} onClick={() => setPage('wordguess')}>
                ▶ Start Playing
              </button>
            )}
            {!account && (
              <button className="btn-pixel" style={{ background: '#EDD9B2', border: '2px solid #C9A87C', color: 'var(--navy)' }} onClick={connect}>
                🔗 Connect Wallet
              </button>
            )}
            {account && !hasNFT && (
              <button className="btn-pixel" onClick={() => setPage('profile')}>
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
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--brown)' }}>
                  Connect your wallet to view your player stats
                </p>
              </div>
            </div>
          ) : !hasNFT ? (
            <div className="player-card">
              <div style={{ textAlign: 'center', padding: '12px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌱</div>
                <p style={{ marginBottom: '12px' }}>Mint your Player NFT!</p>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--brown)', marginBottom: '16px' }}>Includes 10 GOLD welcome bonus 🎁</p>
                <button className="btn-pixel green" onClick={() => setPage('profile')}>Mint NFT</button>
              </div>
            </div>
          ) : (
            <div className="player-card">
              {/* Player greeting */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ fontSize: '40px' }}>🧑‍🌾</div>
                <div>
                  <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 'var(--font-base)', color: 'var(--brown)' }}>
                    Hi, {stats?.name || '...'}
                  </div>
                  <div style={{ fontSize: 'var(--font-sm)', color: 'var(--brown)', opacity: 0.8, marginTop: '2px' }}>
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
                  <div className="stat-chip-icon">📈</div>
                  <div className="stat-chip-value">{formatGold(dailyEarned ?? 0n)}</div>
                  <div className="stat-chip-label">Today</div>
                </div>
              </div>

              {/* Daily faucet button */}
              <button
                className="btn-pixel gold small"
                onClick={handleFaucet}
                disabled={loading || !!cooldown}
                style={{ width: '100%' }}
              >
                {cooldown ? `⏳ Available in ${cooldown}` : '🪙 Claim Daily 10 GOLD'}
              </button>
              {faucetMsg && <p style={{ fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>{faucetMsg}</p>}
            </div>
          )}
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════
          FEATURED GAMES
      ══════════════════════════════════════════════════════ */}
      <div style={{ padding: '32px 64px' }}>

        <h2 className="page-title">FEATURED GAMES</h2>

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
                <img src={game.icon} alt={game.name} className="game-card-icon" />
              </div>

              {/* White bottom section with text + button */}
              <div className="game-card-body">
                <div className="game-card-name">{game.name}</div>
                <div className="game-card-desc">{game.description}</div>
                <div className="game-card-reward">
                  Earn up to <span>{game.reward}</span>
                </div>
                <div style={{ marginTop: '4px' }} title={!hasNFT ? 'Mint a Player NFT first' : ''}>
                  <SpriteButton
                    onClick={() => setPage(game.id)}
                    disabled={!hasNFT}
                  />
                </div>
              </div>

            </div>
          ))}
        </div>


      </div>
    </div>
  );
}

export default Home;
