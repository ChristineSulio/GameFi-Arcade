// frontend/src/pages/MemoryMatch.js
// Mind Match — 4×4 memory card flip game
// Contract flow: startGame() → match all 8 pairs → submitResult(attempts)
// Fewer attempts = higher reward: ≤10=20, ≤14=15, ≤18=10, ≤24=5, ≤32=2 GOLD

import { useState, useEffect, useRef } from 'react';

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
  const [flipped,  setFlipped] = useState([]);   // indices of face-up unmatched cards
  const [attempts, setAttempts]= useState(0);
  const [matched,  setMatched] = useState(0);
  const [locked,   setLocked]  = useState(false);
  const [reward,   setReward]  = useState(0);
  const [txMsg,    setTxMsg]   = useState('');

  // Use a ref for attempts so the async submit always reads the final value
  const attemptsRef = useRef(0);

  // ── Check for leftover active game ──
  const [activeFound, setActiveFound] = useState(false);
  useEffect(() => {
    if (!contracts || !account) return;
    contracts.memoryMatch.activeGame(account)
      .then(a => { if (a) setActiveFound(true); })
      .catch(() => {});
  }, [contracts, account]);

  // ── Start game ──────────────────────────────────────────────────────────────
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
      const msg = err.reason || err.shortMessage || err.message || '';
      if (msg.includes('Active game already in progress')) {
        setActiveFound(true); setPhase('start'); // MemoryMatch uses activeFound flag
      } else {
        setTxMsg('❌ ' + msg.slice(0, 80));
      }
    }
  };

  // ── Forfeit leftover game ──
  const handleForfeitExisting = async () => {
    setTxMsg('Forfeiting...');
    try {
      const tx = await contracts.memoryMatch.forfeit();
      await tx.wait();
      await refresh();
      setActiveFound(false); setTxMsg('');
    } catch (err) {
      setTxMsg('❌ ' + (err.reason || err.shortMessage || err.message || 'Failed').slice(0, 80));
    }
  };

  // ── Card flip logic ─────────────────────────────────────────────────────────
  const handleCardClick = (idx) => {
    if (locked || cards[idx].flipped || cards[idx].matched) return;

    // Flip this card
    const newCards = cards.map((c, i) => i === idx ? { ...c, flipped: true } : c);
    const newFlipped = [...flipped, idx];

    if (newFlipped.length === 2) {
      // Second card flipped — increment attempt, check for match
      attemptsRef.current += 1;
      const newAttempts = attemptsRef.current;
      setAttempts(newAttempts);
      setLocked(true);

      const [i1, i2] = newFlipped;
      if (newCards[i1].emoji === newCards[i2].emoji) {
        // Match!
        newCards[i1] = { ...newCards[i1], matched: true };
        newCards[i2] = { ...newCards[i2], matched: true };
        const newMatched = matched + 1;
        setCards(newCards);
        setFlipped([]);
        setLocked(false);
        setMatched(newMatched);

        if (newMatched === 8) {
          // All pairs matched — submit result
          submitResult(newAttempts);
        }
      } else {
        // No match — show for 900ms then flip back
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
      // First card flipped
      setCards(newCards);
      setFlipped(newFlipped);
    }
  };

  // ── Submit result to contract ──────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page" style={{ maxWidth: 560, paddingTop: 20 }}>
      <button className="btn-pixel" onClick={() => {
        if (phase === 'playing') {
          if (window.confirm('Quit? Your 1 GOLD entry fee is non-refundable.')) {
            contracts.memoryMatch.forfeit().then(tx => tx.wait()).then(() => { refresh(); setPage('home'); }).catch(() => setPage('home'));
          }
        } else { setPage('home'); }
      }} style={{ marginBottom: 16, fontSize: 12, padding: '8px 14px' }}>
        ← Back
      </button>
      <h1 className="page-title">🧠 Mind Match</h1>

      {/* ── Leftover active game ── */}
      {activeFound && phase === 'start' && (
        <div className="card" style={{ textAlign: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 14, color: 'var(--brown)', marginBottom: 12 }}>⚠️ Unfinished game found. Forfeit to start fresh.</p>
          <button className="btn-pixel" onClick={handleForfeitExisting}>Forfeit &amp; Start New</button>
          {txMsg && <p style={{ marginTop: 10, fontSize: 13 }}>{txMsg}</p>}
        </div>
      )}

      {/* ── Start screen ── */}
      {phase === 'start' && !activeFound && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🧠</div>
          <h2 style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, marginBottom: 10 }}>Match all 8 pairs to win!</h2>
          <p style={{ fontSize: 14, color: 'var(--brown)', marginBottom: 16 }}>
            Flip two cards at a time. Find matching emojis!
          </p>
          <div style={{ background: 'var(--cream)', border: '2px solid var(--navy)', borderRadius: 8, padding: '10px 20px', marginBottom: 20, display: 'inline-block' }}>
            <p style={{ fontFamily: 'var(--pixel-font)', fontSize: 8, lineHeight: 2 }}>
              ≤10 attempts = 20 GOLD &nbsp;|&nbsp; ≤14 = 15<br />
              ≤18 = 10 GOLD &nbsp;|&nbsp; ≤24 = 5 &nbsp;|&nbsp; ≤32 = 2 GOLD
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
          {/* Attempt counter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
            <span style={{ fontFamily: 'var(--pixel-font)', fontSize: 11 }}>
              Attempts: {attempts}
            </span>
            <span style={{ fontFamily: 'var(--pixel-font)', fontSize: 11 }}>
              Pairs: {matched}/8
            </span>
          </div>

          {/* 4×4 card grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {cards.map((card, idx) => (
              <div
                key={card.id}
                onClick={() => phase === 'playing' && handleCardClick(idx)}
                style={{
                  aspectRatio: '1',
                  background: card.matched
                    ? 'var(--mint)'
                    : card.flipped
                    ? 'var(--peach)'
                    : 'var(--navy)',
                  border: '3px solid var(--navy)',
                  borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 36,
                  cursor: card.matched || card.flipped || locked ? 'default' : 'pointer',
                  boxShadow: card.matched ? 'none' : '3px 3px 0 var(--navy)',
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
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--brown)' }}>
              {txMsg || '⏳ Confirming on-chain...'}
            </p>
          )}
        </div>
      )}

      {/* ── Result screen ── */}
      {phase === 'result' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
          <h2 style={{ fontFamily: 'var(--pixel-font)', fontSize: 13, marginBottom: 12 }}>
            You matched them all!
          </h2>
          <p style={{ fontSize: 15, color: 'var(--brown)', marginBottom: 8 }}>
            Completed in <strong>{attempts}</strong> attempts
          </p>
          {reward > 0
            ? <p style={{ fontSize: 16, color: 'var(--gold-dark)', fontWeight: 'bold', marginBottom: 8 }}>+{reward} GOLD earned!</p>
            : <p style={{ fontSize: 14, color: 'var(--brown)', marginBottom: 8 }}>No reward (over 32 attempts)</p>
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

export default MemoryMatch;
