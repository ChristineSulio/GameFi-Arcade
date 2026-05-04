// frontend/src/App.js
// Main app shell — header, navigation, and page routing.
// Pages: Home, Profile, Leaderboard (games slot in later)

import { useState } from "react";
import { useWallet } from "./hooks/useWallet";
import { useContracts } from "./hooks/useContracts";
import { usePlayer } from "./hooks/usePlayer";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import WordGuess from "./pages/WordGuess";
import MemoryMatch from "./pages/MemoryMatch";
import ConnectFour from "./pages/ConnectFour";
import Snake from "./pages/Snake";
import BrickBreaker from "./pages/BrickBreaker";
import "./App.css";

function App() {
  const [page, setPage] = useState("home"); // current page state

  // Wallet + contract layer
  const { account, chainId, signer, error, connect } = useWallet();
  const contracts = useContracts(signer, chainId);
  const {
    hasNFT,
    goldBalance,
    stats,
    dailyEarned,
    lastDailyClaim,
    loading,
    refresh,
    mintNFT,
    claimFaucet,
    formatGold,
  } = usePlayer(contracts, account);

  // Shared props passed down to every page
  const sharedProps = {
    account,
    contracts,
    hasNFT,
    goldBalance,
    stats,
    dailyEarned,
    lastDailyClaim,
    loading,
    refresh,
    mintNFT,
    claimFaucet,
    formatGold,
    connect,
  };

  return (
    <div>
      {/* ── Header ────────────────────────────────────────── */}
      <header className="header">
        {/* Logo */}
        <div
          className="header-logo"
          onClick={() => setPage("home")}
          style={{ cursor: "pointer" }}
        >
          <img src="/assets/logo.png" alt="Pixel Grove" style={{ height: 48, imageRendering: 'pixelated' }} />
          <span>
            <span className="logo-pixel">PIXEL </span>
            <span className="logo-grove">GROVE</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="nav">
          <button
            className={`nav-btn ${page === "home" ? "active" : ""}`}
            onClick={() => setPage("home")}
          >
            Home
          </button>
          <button
            className={`nav-btn ${page === "profile" ? "active" : ""}`}
            onClick={() => setPage("profile")}
          >
            Profile
          </button>
          <button
            className={`nav-btn ${page === "leaderboard" ? "active" : ""}`}
            onClick={() => setPage("leaderboard")}
          >
            Leaderboard
          </button>
        </nav>

        {/* Wallet bar */}
        <div className="wallet-bar">
          {account && (
            <>
              {/* GOLD balance badge */}
              <div className="gold-badge">
                🪙 {formatGold(goldBalance)} GOLD
              </div>
              {/* Shortened wallet address */}
              <span className="wallet-address">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            </>
          )}
          {!account && (
            <button className="btn-connect" onClick={connect}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* ── Error banner ──────────────────────────────────── */}
      {error && (
        <div className="error-msg" style={{ margin: "0 32px" }}>
          {error}
        </div>
      )}

      {/* ── Page content ──────────────────────────────────── */}
      <main>
        {page === "home"        && <Home        {...sharedProps} setPage={setPage} />}
        {page === "profile"     && <Profile     {...sharedProps} />}
        {page === "leaderboard" && <Leaderboard {...sharedProps} />}
        {page === "wordguess"   && <WordGuess   {...sharedProps} setPage={setPage} />}
        {page === "memorymatch" && <MemoryMatch {...sharedProps} setPage={setPage} />}
        {page === "connectfour" && <ConnectFour {...sharedProps} setPage={setPage} />}
        {page === "snake"       && <Snake       {...sharedProps} setPage={setPage} />}
        {page === "brickbreaker"&& <BrickBreaker{...sharedProps} setPage={setPage} />}
      </main>
    </div>
  );
}

export default App;
