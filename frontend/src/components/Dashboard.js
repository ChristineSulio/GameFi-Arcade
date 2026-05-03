// frontend/src/components/Dashboard.js
import { useState } from "react";

export default function Dashboard({ playerData, loading, error, actions }) {
  const [playerName, setPlayerName] = useState("");
  const [minting, setMinting] = useState(false);

  const handleMint = async () => {
    if (!playerName.trim()) {
      alert("Please enter a player name");
      return;
    }
    try {
      setMinting(true);
      await actions.mintNFT(playerName);
      setPlayerName("");
    } catch (err) {
      alert("Mint failed: " + err.message);
    } finally {
      setMinting(false);
    }
  };

  const handleClaim = async () => {
    try {
      await actions.claimFaucet();
    } catch (err) {
      alert("Claim failed: " + err.message);
    }
  };

  if (loading) return <div className="dashboard"><p>Loading...</p></div>;
  if (error) return <div className="dashboard"><p>Error: {error}</p></div>;

  return (
    <div className="dashboard">
      <h2>Player Dashboard</h2>
      {playerData ? (
        <>
          <div className="player-info">
            <p><strong>Name:</strong> {playerData.stats?.name || "No NFT"}</p>
<p><strong>GOLD Balance:</strong> {(Number(playerData.goldBalance) / (10 ** 18)).toFixed(2)}</p>            {playerData.hasNFT && (
              <>
                <p><strong>Level:</strong> {playerData.stats.level}</p>
                <p><strong>Total Wins:</strong> {playerData.stats.totalWins}</p>
<p><strong>Lifetime Earned:</strong> {(Number(playerData.stats.lifetimeEarned) / (10 ** 18)).toFixed(2)} GOLD</p>              </>
            )}
          </div>

          {!playerData.hasNFT ? (
            <div className="mint-section">
              <h3>Create Your Player NFT</h3>
              <input
                type="text"
                placeholder="Enter player name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength="32"
              />
              <button onClick={handleMint} disabled={minting}>
                {minting ? "Minting..." : "Mint NFT"}
              </button>
            </div>
          ) : (
            <button onClick={handleClaim} className="claim-btn">
              Claim Daily GOLD
            </button>
          )}
        </>
      ) : (
        <p>Loading player data...</p>
      )}
    </div>
  );
}