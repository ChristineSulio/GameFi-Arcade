// frontend/src/pages/Snake.js
// Snake Harvest — classic snake game on a canvas
// Contract flow: startGame() → eat apples → submitResult(applesEaten) on game over
// Milestones: 10=2 GOLD, 25=5, 50=10, 100=25 GOLD

import { useState, useEffect, useRef, useCallback } from 'react';

const GRID   = 20;         // cells in each direction
const CELL   = 20;         // pixels per cell
const W      = GRID * CELL; // canvas width  (400px)
const H      = GRID * CELL; // canvas height (400px)
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
  const [phase,  setPhase]  = useState('start');
  const [apples, setApples] = useState(0);
  const [reward, setReward] = useState(0);
  const [txMsg,  setTxMsg]  = useState('');

  // ── Detect leftover active game from a previous session ──────────────────
  useEffect(() => {
    if (!contracts || !account) return;
    contracts.snake.activeGame(account)
      .then(active => { if (active) setPhase('active_found'); })
      .catch(() => {});
  }, [contracts, account]);

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
    ctx.fillStyle = '#d8f0c0';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
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
      const shade = i === 0 ? '#2c5e2c' : '#4a9e6b';
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
    // Submit result
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
      if (msg.includes('Active game already in progress')) {
        setPhase('active_found'); // jump straight to the forfeit screen
      } else {
        setTxMsg('❌ ' + msg.slice(0, 80));
      }
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
    <div className="page" style={{ maxWidth: 560, paddingTop: 20 }}>
      <button className="btn-pixel" onClick={() => {
        if (phase === 'playing') {
          if (window.confirm('Quit? Your 1 GOLD entry fee is non-refundable.')) {
            activeRef.current = false;
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
            contracts.snake.forfeit().then(tx => tx.wait()).then(() => { refresh(); setPage('home'); }).catch(() => setPage('home'));
          }
        } else { setPage('home'); }
      }} style={{ marginBottom: 16, fontSize: 12, padding: '8px 14px' }}>
        ← Back
      </button>
      <h1 className="page-title">🐍 Snake Harvest</h1>

      {/* ── Leftover active game ── */}
      {phase === 'active_found' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, marginBottom: 12 }}>Unfinished Game Found</h2>
          <p style={{ fontSize: 14, color: 'var(--brown)', marginBottom: 20 }}>
            You left a Snake game in progress. Forfeit it to start a new one (entry fee already spent).
          </p>
          <button className="btn-pixel" onClick={async () => {
            setTxMsg('Forfeiting...');
            try {
              const tx = await contracts.snake.forfeit();
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
          <div style={{ fontSize: 56, marginBottom: 12 }}>🐍</div>
          <h2 style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, marginBottom: 10 }}>Eat apples, grow longer!</h2>
          <p style={{ fontSize: 14, color: 'var(--brown)', marginBottom: 8 }}>
            Use arrow keys (or WASD) to control the snake.
            Hit a wall or yourself = game over.
          </p>
          <div style={{ background: 'var(--cream)', border: '2px solid var(--navy)', borderRadius: 8, padding: '10px 20px', marginBottom: 20, display: 'inline-block' }}>
            <p style={{ fontFamily: 'var(--pixel-font)', fontSize: 8, lineHeight: 2 }}>
              10 apples = 2 GOLD &nbsp;|&nbsp; 25 = 5<br />
              50 apples = 10 GOLD &nbsp;|&nbsp; 100 = 25 GOLD
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

      {/* ── Canvas (shown while playing or on game over) ── */}
      {(phase === 'playing' || phase === 'gameover' || phase === 'submitting') && (
        <div>
          {/* HUD */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, padding: '0 4px' }}>
            <span style={{ fontFamily: 'var(--pixel-font)', fontSize: 11 }}>🍎 Apples: {apples}</span>
            <span style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, color: 'var(--gold-dark)' }}>
              Reward: {getReward(apples) > 0 ? `${getReward(apples)} GOLD` : '—'}
            </span>
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
          <p style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: 'var(--brown)' }}>
            Arrow keys or WASD to move
          </p>
          {(txMsg || phase === 'submitting') && (
            <p style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: 'var(--brown)' }}>
              {txMsg || '⏳ Confirming on-chain...'}
            </p>
          )}
        </div>
      )}

      {/* ── Result screen ── */}
      {phase === 'result' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{reward > 0 ? '🏆' : '🍎'}</div>
          <h2 style={{ fontFamily: 'var(--pixel-font)', fontSize: 13, marginBottom: 12 }}>Game Over!</h2>
          <p style={{ fontSize: 15, color: 'var(--brown)', marginBottom: 8 }}>
            You ate <strong>{apples}</strong> apple{apples !== 1 ? 's' : ''}
          </p>
          {reward > 0
            ? <p style={{ fontSize: 16, color: 'var(--gold-dark)', fontWeight: 'bold', marginBottom: 8 }}>+{reward} GOLD earned!</p>
            : <p style={{ fontSize: 14, color: 'var(--brown)', marginBottom: 8 }}>Eat 10+ apples to earn GOLD!</p>
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

export default Snake;
