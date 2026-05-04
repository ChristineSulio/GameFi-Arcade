// frontend/src/pages/ConnectFour.js
// Connect Four — 7×6 grid, player (🔴) vs AI (🟡)
// Contract flow: startGame() → play → submitResult(true/false)

import { useState, useEffect } from 'react';
import QuitModal from '../components/QuitModal';
import RewardPanel from '../components/RewardPanel';

const C4_REWARDS = [
  { label: 'Win the game', reward: '10 GOLD', threshold: 1 },
];

const ROWS = 6, COLS = 7, EMPTY = 0, PLAYER = 1, AI = 2;

const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));

function dropPiece(board, col, player) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === EMPTY) {
      const b = board.map(row => [...row]);
      b[r][col] = player;
      return b;
    }
  }
  return null;
}

function checkWin(board, p) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if (board[r][c]===p&&board[r][c+1]===p&&board[r][c+2]===p&&board[r][c+3]===p) return true;
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c]===p&&board[r+1][c]===p&&board[r+2][c]===p&&board[r+3][c]===p) return true;
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      if (board[r][c]===p&&board[r-1][c+1]===p&&board[r-2][c+2]===p&&board[r-3][c+3]===p) return true;
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS - 3; c++)
      if (board[r][c]===p&&board[r+1][c+1]===p&&board[r+2][c+2]===p&&board[r+3][c+3]===p) return true;
  return false;
}

const isFull = (board) => board[0].every(c => c !== EMPTY);
const validCols = (board) => Array.from({ length: COLS }, (_, c) => c).filter(c => board[0][c] === EMPTY);

function getAIMove(board) {
  const valid = validCols(board);
  if (valid.length === 0) return -1;
  for (const col of valid) { const b = dropPiece(board, col, AI); if (b && checkWin(b, AI)) return col; }
  for (const col of valid) { const b = dropPiece(board, col, PLAYER); if (b && checkWin(b, PLAYER)) return col; }
  if (valid.includes(3)) return 3;
  return valid[Math.floor(Math.random() * valid.length)];
}

function ConnectFour({ account, contracts, goldBalance, refresh, formatGold, setPage }) {
  const [phase,      setPhase]     = useState('start');
  const [board,      setBoard]     = useState(emptyBoard());
  const [turn,       setTurn]      = useState(PLAYER);
  const [winner,     setWinner]    = useState(null);
  const [hoverCol,   setHoverCol]  = useState(null);
  const [aiThinking, setAiThinking]= useState(false);
  const [reward,     setReward]    = useState(0);
  const [txMsg,      setTxMsg]     = useState('');
  const [showQuit,   setShowQuit]  = useState(false);

  // ── AI turn ──
  useEffect(() => {
    if (phase !== 'playing' || turn !== AI || winner) return;
    setAiThinking(true);
    const timer = setTimeout(() => {
      setBoard(prev => {
        const col = getAIMove(prev);
        if (col === -1) return prev;
        const newBoard = dropPiece(prev, col, AI);
        if (!newBoard) return prev;
        if (checkWin(newBoard, AI)) setWinner(AI);
        else if (isFull(newBoard)) setWinner('draw');
        else setTurn(PLAYER);
        setAiThinking(false);
        return newBoard;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [phase, turn, winner]);

  // ── Submit once winner decided ──
  // Only call the contract on a WIN — losses and draws cost no gas
  useEffect(() => {
    if (!winner || phase !== 'playing') return;
    if (winner !== PLAYER) {
      // Loss or draw — no reward, no gas cost; auto-forfeit handles cleanup on next startGame
      setReward(0);
      setPhase('result');
      return;
    }
    const doSubmit = async () => {
      setPhase('submitting');
      setTxMsg('Submitting result on-chain...');
      try {
        const tx = await contracts.connectFour.submitResult(true);
        await tx.wait();
        await refresh();
        setReward(10);
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

  const handleStart = async () => {
    setTxMsg('Paying 1 GOLD entry fee...');
    try {
      const tx = await contracts.connectFour.startGame();
      await tx.wait();
      setBoard(emptyBoard()); setTurn(PLAYER); setWinner(null);
      setHoverCol(null); setAiThinking(false);
      setTxMsg(''); setPhase('playing');
    } catch (err) {
      setTxMsg('❌ ' + (err.reason || err.shortMessage || err.message || '').slice(0, 80));
    }
  };

  const handleColumnClick = (col) => {
    if (phase !== 'playing' || turn !== PLAYER || winner || aiThinking) return;
    const newBoard = dropPiece(board, col, PLAYER);
    if (!newBoard) return;
    if (checkWin(newBoard, PLAYER)) { setBoard(newBoard); setWinner(PLAYER); }
    else if (isFull(newBoard))      { setBoard(newBoard); setWinner('draw'); }
    else                            { setBoard(newBoard); setTurn(AI); }
  };

  const playAgain = () => {
    setPhase('start'); setBoard(emptyBoard()); setTurn(PLAYER);
    setWinner(null); setReward(0); setTxMsg('');
  };

  const cellColor = (val) => {
    if (val === PLAYER) return '#ef4444';
    if (val === AI)     return '#f6c453';
    return 'var(--white)';
  };

  return (
    <div className="page" style={{ maxWidth: 860, paddingTop: 20 }}>
      {showQuit && (
        <QuitModal
          onConfirm={() => { setShowQuit(false); setPage('home'); }}
          onCancel={() => setShowQuit(false)}
        />
      )}
      <button className="btn-pixel" onClick={() => {
        if (phase === 'playing' && !winner) setShowQuit(true);
        else setPage('home');
      }} style={{ marginBottom: 16, fontSize: 'var(--font-base)', padding: '12px 24px' }}>
        ← Back
      </button>
      <h1 className="page-title">🔴 Connect Four</h1>

      {/* ── Start screen ── */}
      {phase === 'start' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>🔴</div>
          <h2>Connect 4 in a row to win!</h2>
          <p>You are 🔴 Red. The AI plays 🟡 Yellow.</p>
          <p style={{ marginBottom: 20 }}>
            Drop pieces by clicking a column. Get 4 in a row — horizontal, vertical, or diagonal.
          </p>
          <div>
            <button className="btn-pixel green" onClick={handleStart} style={{ fontSize: 'var(--font-base)', padding: '12px 28px' }}>
              ▶ Pay 1 GOLD &amp; Start
            </button>
          </div>
          {txMsg && <p className="tx-msg">{txMsg}</p>}
        </div>
      )}

      {/* ── Game board ── */}
      {(phase === 'playing' || phase === 'submitting') && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 12, fontFamily: 'var(--pixel-font)', fontSize: 'var(--font-base)' }}>
            {aiThinking ? '🟡 AI is thinking...' : turn === PLAYER ? '🔴 Your turn!' : ''}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${COLS}, 56px)`, gap: 4 }}>
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
                >▼</div>
              ))}

              {Array.from({ length: ROWS }, (_, r) =>
                Array.from({ length: COLS }, (_, c) => (
                  <div key={`${r}-${c}`} style={{
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
                        width: 42, height: 42, borderRadius: '50%',
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
            <p className="game-status">{txMsg || '⏳ Confirming on-chain...'}</p>
          )}
          </div>
          <RewardPanel tiers={C4_REWARDS} current={winner === PLAYER ? 1 : 0} higherIsBetter={true} />
        </div>
      )}

      {/* ── Result screen ── */}
      {phase === 'result' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>
            {winner === PLAYER ? '🏆' : winner === 'draw' ? '🤝' : '😔'}
          </div>
          <h2>{winner === PLAYER ? 'You Won!' : winner === 'draw' ? 'Draw!' : 'AI Wins!'}</h2>
          {reward > 0
            ? <p className="reward-text">+{reward} GOLD earned!</p>
            : <p>Better luck next time!</p>
          }
          <p>Balance: 🪙 {formatGold(goldBalance)} GOLD</p>
          {txMsg && <p className="tx-error">{txMsg}</p>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
            <button className="btn-pixel green large" onClick={playAgain}>Play Again</button>
            <button className="btn-pixel large" onClick={() => setPage('home')}>Home</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectFour;
