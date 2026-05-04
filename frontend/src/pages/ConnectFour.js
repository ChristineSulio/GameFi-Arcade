// frontend/src/pages/ConnectFour.js
// Connect Four — 7×6 grid, player (🔴) vs AI (🟡)
// Contract flow: startGame() → play → submitResult(true/false)
// Win = 10 GOLD reward, Loss = 0

import { useState, useEffect } from 'react';

const ROWS = 6;
const COLS = 7;
const EMPTY = 0, PLAYER = 1, AI = 2;

// Create an empty board
const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));

// Drop a piece into a column; returns new board or null if column is full
function dropPiece(board, col, player) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === EMPTY) {
      const b = board.map(row => [...row]);
      b[r][col] = player;
      return b;
    }
  }
  return null; // full
}

// Check if a player has won
function checkWin(board, p) {
  // Horizontal
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if (board[r][c]===p&&board[r][c+1]===p&&board[r][c+2]===p&&board[r][c+3]===p) return true;
  // Vertical
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c]===p&&board[r+1][c]===p&&board[r+2][c]===p&&board[r+3][c]===p) return true;
  // Diagonal ↗
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if (board[r][c]===p&&board[r-1][c+1]===p&&board[r-2][c+2]===p&&board[r-3][c+3]===p) return true;
  // Diagonal ↘
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS - 3; c++)
      if (board[r][c]===p&&board[r+1][c+1]===p&&board[r+2][c+2]===p&&board[r+3][c+3]===p) return true;
  return false;
}

// Check if board is full (draw)
const isFull = (board) => board[0].every(c => c !== EMPTY);

// Valid columns (not full)
const validCols = (board) => Array.from({ length: COLS }, (_, c) => c).filter(c => board[0][c] === EMPTY);

// AI move: win if possible → block player → random
function getAIMove(board) {
  const valid = validCols(board);
  if (valid.length === 0) return -1;

  // Try to win
  for (const col of valid) {
    const b = dropPiece(board, col, AI);
    if (b && checkWin(b, AI)) return col;
  }
  // Block player win
  for (const col of valid) {
    const b = dropPiece(board, col, PLAYER);
    if (b && checkWin(b, PLAYER)) return col;
  }
  // Prefer center column
  if (valid.includes(3)) return 3;
  // Random
  return valid[Math.floor(Math.random() * valid.length)];
}

function ConnectFour({ account, contracts, goldBalance, refresh, formatGold, setPage }) {
  const [phase,      setPhase]     = useState('start');
  const [board,      setBoard]     = useState(emptyBoard());
  const [turn,       setTurn]      = useState(PLAYER);   // whose turn it is
  const [winner,     setWinner]    = useState(null);     // PLAYER | AI | 'draw' | null
  const [hoverCol,   setHoverCol]  = useState(null);
  const [aiThinking, setAiThinking]= useState(false);
  const [reward,     setReward]    = useState(0);
  const [txMsg,      setTxMsg]     = useState('');

  // ── Detect leftover active game from a previous session ──────────────────
  useEffect(() => {
    if (!contracts || !account) return;
    contracts.connectFour.activeGame(account)
      .then(active => { if (active) setPhase('active_found'); })
      .catch(() => {});
  }, [contracts, account]);

  // ── AI takes its turn after a short delay ──────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || turn !== AI || winner) return;
    setAiThinking(true);
    const timer = setTimeout(() => {
      setBoard(prev => {
        const col = getAIMove(prev);
        if (col === -1) return prev;
        const newBoard = dropPiece(prev, col, AI);
        if (!newBoard) return prev;
        if (checkWin(newBoard, AI)) {
          setWinner(AI);
        } else if (isFull(newBoard)) {
          setWinner('draw');
        } else {
          setTurn(PLAYER);
        }
        setAiThinking(false);
        return newBoard;
      });
    }, 500); // 500ms delay so it feels like the AI "thinks"
    return () => clearTimeout(timer);
  }, [phase, turn, winner]);

  // ── Submit once a winner is decided ───────────────────────────────────────
  useEffect(() => {
    if (!winner || phase !== 'playing') return;
    const doSubmit = async () => {
      setPhase('submitting');
      setTxMsg('Submitting result on-chain...');
      try {
        const playerWon = winner === PLAYER;
        const tx = await contracts.connectFour.submitResult(playerWon);
        await tx.wait();
        await refresh();
        setReward(playerWon ? 10 : 0);
        setTxMsg('');
        setPhase('result');
      } catch (err) {
        setTxMsg('❌ ' + (err.reason || err.shortMessage || err.message || 'Failed').slice(0, 80));
        setReward(0);
        setPhase('result');
      }
    };
    doSubmit();
  }, [winner, phase, contracts, refresh]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStart = async () => {
    setTxMsg('Paying 1 GOLD entry fee...');
    try {
      const tx = await contracts.connectFour.startGame();
      await tx.wait();
      setBoard(emptyBoard()); setTurn(PLAYER); setWinner(null);
      setHoverCol(null); setAiThinking(false);
      setTxMsg(''); setPhase('playing');
    } catch (err) {
      const msg = err.reason || err.shortMessage || err.message || '';
      if (msg.includes('Active game already in progress')) {
        setPhase('active_found');
      } else {
        setTxMsg('❌ ' + msg.slice(0, 80));
      }
    }
  };

  const handleColumnClick = (col) => {
    if (phase !== 'playing' || turn !== PLAYER || winner || aiThinking) return;
    const newBoard = dropPiece(board, col, PLAYER);
    if (!newBoard) return; // full column

    if (checkWin(newBoard, PLAYER)) {
      setBoard(newBoard);
      setWinner(PLAYER);
    } else if (isFull(newBoard)) {
      setBoard(newBoard);
      setWinner('draw');
    } else {
      setBoard(newBoard);
      setTurn(AI);
    }
  };

  const playAgain = () => {
    setPhase('start'); setBoard(emptyBoard()); setTurn(PLAYER);
    setWinner(null); setReward(0); setTxMsg('');
  };

  // Cell color
  const cellColor = (val) => {
    if (val === PLAYER) return '#ef4444';
    if (val === AI)     return '#f6c453';
    return 'var(--white)';
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page" style={{ maxWidth: 520, paddingTop: 20 }}>
      <button className="btn-pixel" onClick={() => {
        if (phase === 'playing' && !winner) {
          if (window.confirm('Quit? Your 1 GOLD entry fee is non-refundable.')) {
            contracts.connectFour.forfeit().then(tx => tx.wait()).then(() => { refresh(); setPage('home'); }).catch(() => setPage('home'));
          }
        } else { setPage('home'); }
      }} style={{ marginBottom: 16, fontSize: 12, padding: '8px 14px' }}>
        ← Back
      </button>
      <h1 className="page-title">🔴 Connect Four</h1>

      {/* ── Leftover active game ── */}
      {phase === 'active_found' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, marginBottom: 12 }}>Unfinished Game Found</h2>
          <p style={{ fontSize: 14, color: 'var(--brown)', marginBottom: 20 }}>
            You left a Connect Four game in progress. Forfeit it to start a new one (entry fee already spent).
          </p>
          <button className="btn-pixel" onClick={async () => {
            setTxMsg('Forfeiting...');
            try {
              const tx = await contracts.connectFour.forfeit();
              await tx.wait();
              await refresh();
              setTxMsg('');
              setPhase('start');
            } catch (err) {
              setTxMsg('❌ ' + (err.reason || err.shortMessage || err.message || 'Failed').slice(0, 80));
            }
          }}>
            Forfeit &amp; Start New
          </button>
          {txMsg && <p style={{ marginTop: 12, fontSize: 13 }}>{txMsg}</p>}
        </div>
      )}

      {/* ── Start screen ── */}
      {phase === 'start' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🔴</div>
          <h2 style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, marginBottom: 10 }}>Connect 4 in a row to win!</h2>
          <p style={{ fontSize: 14, color: 'var(--brown)', marginBottom: 8 }}>
            You are 🔴 Red. The AI plays 🟡 Yellow.
          </p>
          <p style={{ fontSize: 13, color: 'var(--brown)', marginBottom: 20 }}>
            Drop pieces by clicking a column. Get 4 in a row — horizontal, vertical, or diagonal.
          </p>
          <div style={{ background: 'var(--cream)', border: '2px solid var(--navy)', borderRadius: 8, padding: '10px 20px', marginBottom: 20, display: 'inline-block' }}>
            <p style={{ fontFamily: 'var(--pixel-font)', fontSize: 8, lineHeight: 2 }}>
              Win = 10 GOLD reward &nbsp;|&nbsp; Loss = no reward
            </p>
          </div>
          <div>
            <button className="btn-pixel green" onClick={handleStart} style={{ fontSize: 14, padding: '12px 28px' }}>
              ▶ Pay 1 GOLD &amp; Start
            </button>
          </div>
          {txMsg && <p style={{ marginTop: 12, fontSize: 13 }}>{txMsg}</p>}
        </div>
      )}

      {/* ── Game board ── */}
      {(phase === 'playing' || phase === 'submitting') && (
        <div>
          {/* Turn indicator */}
          <div style={{ textAlign: 'center', marginBottom: 12, fontFamily: 'var(--pixel-font)', fontSize: 11 }}>
            {aiThinking ? '🟡 AI is thinking...' : turn === PLAYER ? '🔴 Your turn!' : ''}
          </div>

          {/* Column click targets (above board) */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${COLS}, 56px)`, gap: 4 }}>
              {/* Hover arrows */}
              {Array.from({ length: COLS }, (_, c) => (
                <div key={c} style={{
                  height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: phase === 'playing' && turn === PLAYER && !aiThinking ? 'pointer' : 'default',
                  fontSize: 14,
                  color: hoverCol === c ? 'var(--navy)' : 'transparent',
                }}
                  onMouseEnter={() => setHoverCol(c)}
                  onMouseLeave={() => setHoverCol(null)}
                  onClick={() => handleColumnClick(c)}
                >
                  ▼
                </div>
              ))}

              {/* Board cells */}
              {Array.from({ length: ROWS }, (_, r) =>
                Array.from({ length: COLS }, (_, c) => (
                  <div key={`${r}-${c}`}
                    style={{
                      width: 56, height: 52,
                      background: hoverCol === c && turn === PLAYER && !aiThinking && board[r][c] === EMPTY
                        ? 'var(--cream)' : 'var(--navy)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 8,
                      cursor: phase === 'playing' && turn === PLAYER && !aiThinking ? 'pointer' : 'default',
                    }}
                    onMouseEnter={() => setHoverCol(c)}
                    onMouseLeave={() => setHoverCol(null)}
                    onClick={() => handleColumnClick(c)}
                  >
                    {board[r][c] !== EMPTY && (
                      <div style={{
                        width: 42, height: 42,
                        borderRadius: '50%',
                        background: cellColor(board[r][c]),
                        border: '3px solid rgba(0,0,0,0.2)',
                        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)',
                      }} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {(txMsg || phase === 'submitting') && (
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--brown)' }}>
              {txMsg || '⏳ Confirming on-chain...'}
            </p>
          )}
        </div>
      )}

      {/* ── Result screen ── */}
      {phase === 'result' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>
            {winner === PLAYER ? '🏆' : winner === 'draw' ? '🤝' : '😔'}
          </div>
          <h2 style={{ fontFamily: 'var(--pixel-font)', fontSize: 13, marginBottom: 12 }}>
            {winner === PLAYER ? 'You Won!' : winner === 'draw' ? 'Draw!' : 'AI Wins!'}
          </h2>
          {reward > 0
            ? <p style={{ fontSize: 16, color: 'var(--gold-dark)', fontWeight: 'bold', marginBottom: 8 }}>+{reward} GOLD earned!</p>
            : <p style={{ fontSize: 14, color: 'var(--brown)', marginBottom: 8 }}>Better luck next time!</p>
          }
          <p style={{ fontSize: 13, color: 'var(--brown)', marginBottom: 4 }}>Balance: 🪙 {formatGold(goldBalance)} GOLD</p>
          {txMsg && <p style={{ fontSize: 12, color: '#c00', marginBottom: 8 }}>{txMsg}</p>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
            <button className="btn-pixel green" onClick={playAgain}>Play Again</button>
            <button className="btn-pixel" onClick={() => setPage('home')}>Home</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectFour;
