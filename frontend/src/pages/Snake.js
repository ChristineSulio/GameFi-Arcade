// frontend/src/pages/Snake.js
// Snake Harvest — classic snake game on a canvas
// Contract flow: startGame() → eat apples → submitResult(applesEaten) on game over
// Milestones: 10=2 GOLD, 25=5, 50=10, 100=25 GOLD

import { useState, useEffect, useRef, useCallback } from 'react';
import QuitModal from '../components/QuitModal';
import RewardPanel from '../components/RewardPanel';

const SNAKE_REWARDS = [
  { label: '10 apples', reward: '2 GOLD',  threshold: 10  },
  { label: '25 apples', reward: '5 GOLD',  threshold: 25  },
  { label: '50 apples', reward: '10 GOLD', threshold: 50  },
  { label: '100 apples',reward: '25 GOLD', threshold: 100 },
];

const GRID   = 20;         // cells in each direction
const CELL   = 28;         // pixels per cell
const W      = GRID * CELL; // canvas width  (560px)
const H      = GRID * CELL; // canvas height (560px)
const TICK   = 140;        // ms between moves

const DIR = { UP: {x:0,y:-1}, DOWN: {x:0,y:1}, LEFT: {x:-1,y:0}, RIGHT: {x:1,y:0} };

function randomPos(snake) {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}

function getReward(apples) {
  if (apples >= 100) return 25;
  if (apples >= 50)  return 10;
  if (apples >= 25)  return 5;
  if (apples >= 10)  return 2;
  return 0;
}

function Snake({ account, contracts, goldBalance, refresh, formatGold, setPage }) {
  const [phase,     setPhase]    = useState('start');
  const [apples,    setApples]   = useState(0);
  const [reward,    setReward]   = useState(0);
  const [txMsg,     setTxMsg]    = useState('');
  const [showQuit,  setShowQuit] = useState(false);

  const canvasRef = useRef(null);

  // All game state in refs so the loop always reads fresh values
  const snakeRef = useRef([]);
  const dirRef   = useRef(DIR.RIGHT);
  const nextDir  = useRef(DIR.RIGHT); // queued direction change
  const appleRef = useRef({ x: 5, y: 5 });
  const applesRef = useRef(0);
  const activeRef = useRef(false);  // is game loop running?
  const frameRef  = useRef(null);
  const lastTick  = useRef(0);
  const phaseRef  = useRef('start');

  // Keep phaseRef in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Draw the canvas ──────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.fillStyle = '#E8D4A0';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(107,79,58,0.12)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke();
    }

    // Apple 🍎
    const ap = appleRef.current;
    ctx.font = `${CELL + 2}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍎', ap.x * CELL + CELL / 2, ap.y * CELL + CELL / 2);

    // Snake body
    snakeRef.current.forEach((seg, i) => {
      const shade = i === 0 ? '#5C8C4A' : '#6DBE57';
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 4);
      ctx.fill();
      // Eyes on head
      if (i === 0) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(seg.x*CELL + CELL*0.35, seg.y*CELL + CELL*0.35, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(seg.x*CELL + CELL*0.65, seg.y*CELL + CELL*0.35, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(seg.x*CELL + CELL*0.35, seg.y*CELL + CELL*0.35, 1.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(seg.x*CELL + CELL*0.65, seg.y*CELL + CELL*0.35, 1.5, 0, Math.PI*2); ctx.fill();
      }
    });
  }, []);

  // ── Game tick (movement + collision) ────────────────────────────────────
  const tick = useCallback(() => {
    dirRef.current = nextDir.current;
    const head = snakeRef.current[0];
    const newHead = {
      x: head.x + dirRef.current.x,
      y: head.y + dirRef.current.y,
    };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
      activeRef.current = false;
      setPhase('gameover');
      return;
    }
    // Self collision
    if (snakeRef.current.some(s => s.x === newHead.x && s.y === newHead.y)) {
      activeRef.current = false;
      setPhase('gameover');
      return;
    }

    const ate = newHead.x === appleRef.current.x && newHead.y === appleRef.current.y;
    const newSnake = [newHead, ...snakeRef.current];
    if (!ate) newSnake.pop(); // remove tail if no apple eaten

    snakeRef.current = newSnake;

    if (ate) {
      applesRef.current += 1;
      setApples(applesRef.current);
      appleRef.current = randomPos(newSnake);
    }
  }, []);

  // ── Animation loop ───────────────────────────────────────────────────────
  const loop = useCallback((timestamp) => {
    if (!activeRef.current) return;
    if (timestamp - lastTick.current >= TICK) {
      lastTick.current = timestamp;
      tick();
    }
    draw();
    frameRef.current = requestAnimationFrame(loop);
  }, [tick, draw]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // ── Keyboard controls ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const handle = (e) => {
      const map = {
        ArrowUp: DIR.UP, ArrowDown: DIR.DOWN,
        ArrowLeft: DIR.LEFT, ArrowRight: DIR.RIGHT,
        w: DIR.UP, s: DIR.DOWN, a: DIR.LEFT, d: DIR.RIGHT,
      };
      const newDir = map[e.key];
      if (!newDir) return;
      e.preventDefault();
      // Prevent 180° reversal
      const cur = dirRef.current;
      if (newDir.x === -cur.x && newDir.y === -cur.y) return;
      nextDir.current = newDir;
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [phase]);

  // ── Start game over sequence ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'gameover') return;
    // Draw final frame with "Game Over" overlay
    const canvas = canvasRef.current;
    if (canvas) {
      draw();
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 16);
      ctx.font = '16px monospace';
      ctx.fillText(`Apples: ${applesRef.current}`, W / 2, H / 2 + 16);
    }
    // Only submit on-chain if the player earned a reward — losses cost no gas
    if (applesRef.current < 10) {
      setReward(0);
      setPhase('result');
      return;
    }
    const doSubmit = async () => {
      setTxMsg('Submitting result on-chain...');
      try {
        const tx = await contracts.snake.submitResult(applesRef.current);
        await tx.wait();
        await refresh();
        setReward(getReward(applesRef.current));
        setTxMsg('');
        setPhase('result');
      } catch (err) {
        setTxMsg('❌ ' + (err.reason || err.shortMessage || err.message || 'Failed').slice(0, 80));
        setReward(0);
        setPhase('result');
      }
    };
    doSubmit();
  }, [phase, contracts, refresh, draw]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleStart = async () => {
    setTxMsg('Paying 1 GOLD entry fee...');
    try {
      const tx = await contracts.snake.startGame();
      await tx.wait();

      // Init snake in the middle, moving right
      snakeRef.current = [
        { x: 12, y: 10 }, { x: 11, y: 10 }, { x: 10, y: 10 },
      ];
      dirRef.current  = DIR.RIGHT;
      nextDir.current = DIR.RIGHT;
      appleRef.current = randomPos(snakeRef.current);
      applesRef.current = 0;
      setApples(0); setTxMsg('');
      activeRef.current = true;
      lastTick.current = 0;
      setPhase('playing');
      frameRef.current = requestAnimationFrame(loop);
    } catch (err) {
      const msg = err.reason || err.shortMessage || err.message || '';
      setTxMsg('❌ ' + msg.slice(0, 80));
    }
  };

  const playAgain = () => {
    activeRef.current = false;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    setPhase('start'); setApples(0); setReward(0); setTxMsg('');
    applesRef.current = 0;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page" style={{ maxWidth: 860, paddingTop: 20 }}>
      {showQuit && (
        <QuitModal
          onConfirm={() => {
            activeRef.current = false;
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
            setShowQuit(false);
            setPage('home');
          }}
          onCancel={() => setShowQuit(false)}
        />
      )}
      <button className="btn-pixel" onClick={() => {
        if (phase === 'playing') setShowQuit(true);
        else setPage('home');
      }} style={{ marginBottom: 16 }}>
        ← Back
      </button>
      <h1 className="page-title">Snake Harvest</h1>

      {/* ── Start screen ── */}
      {phase === 'start' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <img src="/assets/icon-snake.png" alt="" style={{ width: 120, height: 'auto', imageRendering: 'pixelated', marginBottom: 12 }} />
          <h2>Eat apples, grow longer!</h2>
          <p>
            Use arrow keys (or WASD) to control the snake.
            Hit a wall or yourself = game over.
          </p>
          <div>
            <button className="btn-pixel green" onClick={handleStart}>
              ▶ Pay 1 GOLD &amp; Start
            </button>
          </div>
          {txMsg && <p className="tx-msg">{txMsg}</p>}
        </div>
      )}

      {/* ── Canvas (shown while playing or on game over) ── */}
      {(phase === 'playing' || phase === 'gameover' || phase === 'submitting') && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Game canvas + HUD */}
          <div style={{ flex: 1 }}>
            <div className="game-hud">
              <span>🍎 Apples: {apples}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                style={{
                  border: 'var(--border)',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow)',
                  display: 'block',
                  imageRendering: 'pixelated',
                }}
              />
            </div>
            <p className="game-status">Arrow keys or WASD to move</p>
            {(txMsg || phase === 'submitting') && (
              <p className="game-status">{txMsg || '⏳ Confirming on-chain...'}</p>
            )}
          </div>
          {/* Rewards sidebar */}
          <RewardPanel tiers={SNAKE_REWARDS} current={apples} higherIsBetter={true} />
        </div>
      )}

      {/* ── Result screen ── */}
      {phase === 'result' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>{reward > 0 ? '🏆' : '🍎'}</div>
          <h2>Game Over!</h2>
          <p>You ate <strong>{apples}</strong> apple{apples !== 1 ? 's' : ''}</p>
          {reward > 0
            ? <p className="reward-text">+{reward} GOLD earned!</p>
            : <p>Eat 10+ apples to earn GOLD!</p>
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

export default Snake;
