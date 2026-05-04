// frontend/src/pages/MemoryMatch.js
// Mind Match — 4×4 memory card flip game
// Contract flow: startGame() → match all 8 pairs → submitResult(attempts)
// Fewer attempts = higher reward: ≤10=20, ≤14=15, ≤18=10, ≤24=5, ≤32=2 GOLD

import { useState, useEffect, useRef } from 'react';
import QuitModal from '../components/QuitModal';
import RewardPanel from '../components/RewardPanel';

const MM_REWARDS = [
  { label: '≤10 attempts', reward: '20 GOLD', threshold: 10 },
  { label: '≤14 attempts', reward: '15 GOLD', threshold: 14 },
  { label: '≤18 attempts', reward: '10 GOLD', threshold: 18 },
  { label: '≤24 attempts', reward: '5 GOLD',  threshold: 24 },
  { label: '≤32 attempts', reward: '2 GOLD',  threshold: 32 },
];

const EMOJIS = ['🌿', '🌸', '🍄', '🦋', '🌻', '🍀', '🌈', '⭐'];

function createDeck() {
  const deck = [...EMOJIS, ...EMOJIS].map((emoji, i) => ({
    id: i, emoji, flipped: false, matched: false,
  }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function getReward(attempts) {
  if (attempts <= 10) return 20;
  if (attempts <= 14) return 15;
  if (attempts <= 18) return 10;
  if (attempts <= 24) return 5;
  if (attempts <= 32) return 2;
  return 0;
}

function MemoryMatch({ account, contracts, goldBalance, refresh, formatGold, setPage }) {
  const [phase,    setPhase]   = useState('start');
  const [cards,    setCards]   = useState([]);
  const [flipped,  setFlipped] = useState([]);
  const [attempts, setAttempts]= useState(0);
  const [matched,  setMatched] = useState(0);
  const [locked,   setLocked]  = useState(false);
  const [reward,   setReward]  = useState(0);
  const [txMsg,    setTxMsg]   = useState('');
  const [showQuit, setShowQuit]= useState(false);

  const attemptsRef = useRef(0);

  // ── Start game ──
  const handleStart = async () => {
    setTxMsg('Paying 1 GOLD entry fee...');
    try {
      const tx = await contracts.memoryMatch.startGame();
      await tx.wait();
      attemptsRef.current = 0;
      setCards(createDeck());
      setFlipped([]); setAttempts(0); setMatched(0); setLocked(false);
      setTxMsg(''); setPhase('playing');
    } catch (err) {
      setTxMsg('❌ ' + (err.reason || err.shortMessage || err.message || '').slice(0, 80));
    }
  };

  // ── Card flip logic ──
  const handleCardClick = (idx) => {
    if (locked || cards[idx].flipped || cards[idx].matched) return;

    const newCards = cards.map((c, i) => i === idx ? { ...c, flipped: true } : c);
    const newFlipped = [...flipped, idx];

    if (newFlipped.length === 2) {
      attemptsRef.current += 1;
      const newAttempts = attemptsRef.current;
      setAttempts(newAttempts);
      setLocked(true);

      const [i1, i2] = newFlipped;
      if (newCards[i1].emoji === newCards[i2].emoji) {
        newCards[i1] = { ...newCards[i1], matched: true };
        newCards[i2] = { ...newCards[i2], matched: true };
        const newMatched = matched + 1;
        setCards(newCards);
        setFlipped([]);
        setLocked(false);
        setMatched(newMatched);
        if (newMatched === 8) submitResult(newAttempts);
      } else {
        setCards(newCards);
        setFlipped(newFlipped);
        setTimeout(() => {
          setCards(cs => cs.map((c, i) =>
            newFlipped.includes(i) ? { ...c, flipped: false } : c
          ));
          setFlipped([]);
          setLocked(false);
        }, 900);
      }
    } else {
      setCards(newCards);
      setFlipped(newFlipped);
    }
  };

  // ── Submit result ──
  const submitResult = async (finalAttempts) => {
    setPhase('submitting');
    setTxMsg('Submitting result on-chain...');
    try {
      const tx = await contracts.memoryMatch.submitResult(finalAttempts);
      await tx.wait();
      await refresh();
      setReward(getReward(finalAttempts));
      setTxMsg('');
      setPhase('result');
    } catch (err) {
      setTxMsg('❌ ' + (err.reason || err.shortMessage || err.message || 'Failed').slice(0, 80));
      setReward(0);
      setPhase('result');
    }
  };

  const playAgain = () => {
    setPhase('start'); setCards([]); setFlipped([]);
    setAttempts(0); setMatched(0); setReward(0); setTxMsg('');
    attemptsRef.current = 0;
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
        if (phase === 'playing') setShowQuit(true);
        else setPage('home');
      }} style={{ marginBottom: 16 }}>
        ← Back
      </button>
      <h1 className="page-title">Mind Match</h1>

      {/* ── Start screen ── */}
      {phase === 'start' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <img src="/assets/icon-memorymatch.png" alt="" style={{ width: 120, height: 'auto', imageRendering: 'pixelated', marginBottom: 12 }} />
          <h2>Match all 8 pairs to win!</h2>
          <p style={{ marginBottom: 16 }}>Flip two cards at a time. Find matching emojis!</p>
          <div>
            <button className="btn-pixel green" onClick={handleStart}>
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
          <div className="game-hud">
            <span>Attempts: {attempts}</span>
            <span>Pairs: {matched}/8</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {cards.map((card, idx) => (
              <div
                key={card.id}
                onClick={() => phase === 'playing' && handleCardClick(idx)}
                style={{
                  aspectRatio: '1',
                  background: card.matched ? '#A7D28D' : card.flipped ? '#FFF6E8' : '#E6D8C3',
                  border: '2px solid var(--beige)',
                  borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 36,
                  cursor: card.matched || card.flipped || locked ? 'default' : 'pointer',
                  boxShadow: card.matched ? 'none' : '2px 2px 0 rgba(107,79,58,0.2)',
                  transition: 'background 0.2s, transform 0.15s',
                  transform: card.flipped || card.matched ? 'scale(1.04)' : 'scale(1)',
                  userSelect: 'none',
                }}
              >
                {(card.flipped || card.matched) ? card.emoji : '?'}
              </div>
            ))}
          </div>

          {(txMsg || phase === 'submitting') && (
            <p className="game-status">{txMsg || '⏳ Confirming on-chain...'}</p>
          )}
          </div>
          <RewardPanel tiers={MM_REWARDS} current={attempts} higherIsBetter={false} />
        </div>
      )}

      {/* ── Result screen ── */}
      {phase === 'result' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>🏆</div>
          <h2>You matched them all!</h2>
          <p>Completed in <strong>{attempts}</strong> attempts</p>
          {reward > 0
            ? <p className="reward-text">+{reward} GOLD earned!</p>
            : <p>No reward (over 32 attempts)</p>
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

export default MemoryMatch;
