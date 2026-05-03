// frontend/src/App.js
// Temporary test render — confirms wallet connection and contract layer work.
// We will replace this with the full UI once everything is verified.

import { useWallet }    from './hooks/useWallet';
import { useContracts } from './hooks/useContracts';
import { usePlayer }    from './hooks/usePlayer';

function App() {
  const { account, chainId, signer, error, connect } = useWallet();
  const contracts = useContracts(signer, chainId);
  const { hasNFT, goldBalance, stats, loading, formatGold } = usePlayer(contracts, account);

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>BlockCade</h1>

      {/* Wallet connection */}
      {!account ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <p>✓ Connected: {account}</p>
      )}

      {/* Network info */}
      {account && <p>Chain ID: {chainId}</p>}

      {/* Player state */}
      {loading && <p>Loading...</p>}
      {account && !loading && (
        <>
          <p>GOLD Balance: {formatGold(goldBalance)}</p>
          <p>Has NFT: {hasNFT ? "Yes" : "No"}</p>
          {stats && (
            <>
              <p>Name: {stats.name}</p>
              <p>Level: {stats.level.toString()}</p>
              <p>Total Wins: {stats.totalWins.toString()}</p>
            </>
          )}
        </>
      )}

      {/* Errors */}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default App;