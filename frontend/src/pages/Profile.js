// frontend/src/pages/Profile.js
// Shows player NFT stats, GOLD balance, mint form, and faucet claim button.

import { useState } from "react";
import { ethers } from "ethers";

function Profile({
  account,
  contracts,
  hasNFT,
  goldBalance,
  stats,
  loading,
  refresh,
  mintNFT,
  claimFaucet,
  formatGold,
}) {
  const [mintName, setMintName] = useState("");
  const [txStatus, setTxStatus] = useState(null);
  const [txMessage, setTxMessage] = useState("");

  const handleMint = async () => {
    if (!mintName.trim()) return;
    setTxStatus("pending");
    setTxMessage("Minting your Player NFT...");
    try {
      await mintNFT(mintName.trim());
      setTxStatus("success");
      setTxMessage("Player NFT minted! Welcome to Pixel Grove 🌿 You received 10 GOLD!");
      setMintName("");
    } catch (err) {
      setTxStatus("error");
      setTxMessage(err.message || "Mint failed. Please try again.");
    }
  };

  const handleFaucet = async () => {
    setTxStatus("pending");
    setTxMessage("Claiming daily GOLD...");
    try {
      await claimFaucet();
      setTxStatus("success");
      setTxMessage("Claimed 10 GOLD! Come back in 24 hours for more.");
    } catch (err) {
      setTxStatus("error");
      if (err.message?.includes("24 hours")) {
        setTxMessage("Already claimed today. Come back in 24 hours!");
      } else {
        setTxMessage(err.message || "Claim failed.");
      }
    }
  };

  if (!account) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center' }}>
          <p>Connect your wallet to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">PLAYER PROFILE</h1>

      {/* ── Wallet info ── */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '12px' }}>Wallet</h2>
        <p style={{ fontFamily: 'var(--pixel-font)', fontSize: 'var(--font-sm)' }}>{account}</p>
      </div>

      {/* ── No NFT — mint form ── */}
      {!hasNFT && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '16px' }}>Mint Your Player NFT</h2>
          <p style={{ marginBottom: '16px' }}>
            One NFT per wallet. Choose a unique name. You'll receive 10 GOLD as a welcome bonus!
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Enter your player name..."
              value={mintName}
              onChange={(e) => setMintName(e.target.value)}
              maxLength={32}
              style={{
                padding: '10px 14px',
                border: 'var(--border)',
                borderRadius: '8px',
                fontFamily: 'var(--body-font)',
                fontSize: 'var(--font-base)',
                flex: 1,
                background: 'var(--cream)',
              }}
            />
            <button className="btn-pixel green" onClick={handleMint} disabled={loading || !mintName.trim()}>
              {loading ? 'Minting...' : 'Mint NFT'}
            </button>
          </div>
        </div>
      )}

      {/* ── Has NFT — identity + stats in one card ── */}
      {hasNFT && stats && (
        <div className="card" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '32px' }}>
          {/* Left: avatar + name + level */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '56px', marginBottom: '8px' }}>🧑‍🌾</div>
            <h2 style={{ marginBottom: '12px' }}>{stats.name}</h2>
            <div style={{
              display: 'inline-block',
              background: 'var(--green-light)',
              border: 'var(--border)',
              borderRadius: '8px',
              padding: '6px 16px',
              fontFamily: 'var(--pixel-font)',
              fontSize: 'var(--font-sm)',
            }}>
              Level {stats.level.toString()}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: '2px', alignSelf: 'stretch', background: '#C9A87C', borderRadius: 2 }} />

          {/* Right: stats stacked */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="stat-box">
              <div className="stat-box-label">GOLD Balance</div>
              <div className="stat-box-value">🪙 {formatGold(goldBalance)}</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-label">Total Wins</div>
              <div className="stat-box-value">🏆 {stats.totalWins.toString()}</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-label">Lifetime Earned</div>
              <div className="stat-box-value">💰 {formatGold(stats.lifetimeEarned)}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Daily faucet ── */}
      {hasNFT && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '12px' }}>Daily Faucet</h2>
          <p style={{ marginBottom: '16px' }}>
            Claim 10 free GOLD once every 24 hours.
          </p>
          <button className="btn-pixel gold" onClick={handleFaucet} disabled={loading}>
            {loading ? 'Claiming...' : '🪙 Claim 10 GOLD'}
          </button>
        </div>
      )}

      {txStatus === 'pending' && <div className="success-msg">⏳ {txMessage}</div>}
      {txStatus === 'success' && <div className="success-msg">✅ {txMessage}</div>}
      {txStatus === 'error'   && <div className="error-msg">❌ {txMessage}</div>}
    </div>
  );
}

export default Profile;
