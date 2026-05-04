// frontend/src/pages/BrickBreaker.js
// Brick Breaker — canvas-based arcade game
// Contract flow: startGame() → play → submitResult(score) on game over
// Milestones: 1000=2 GOLD, 5000=7, 10000=15 GOLD

import { useState, useEffect, useRef, useCallback } from 'react';
import QuitModal from '../components/QuitModal';
import RewardPanel from '../components/RewardPanel';

const BRICK_REWARDS = [
  { label: '1,000 pts',  reward: '2 GOLD',  threshold: 1000  },
  { label: '5,000 pts',  reward: '7 GOLD',  threshold: 5000  },
  { label: '10,000 pts', reward: '15 GOLD', threshold: 10000 },
];

// ── Canvas dimensions ─────────────────────────────────────────────────────────
const CW = 580;   // canvas width
const CH = 460;   // canvas height

// ── Brick grid ────────────────────────────────────────────────────────────────
const BRICK_ROWS   = 5;
const BRICK_COLS   = 12;
const BRICK_W      = 43;   // brick width
const BRICK_H      = 20;   // brick height
const BRICK_GAP    = 4;    // gap between bricks
const BRICK_OFF_X  = (CW - (BRICK_COLS * (BRICK_W + BRICK_GAP) - BRICK_GAP)) / 2;
const BRICK_OFF_Y  = 40;   // top offset
const POINTS_EACH  = 167;  // points per brick (60 bricks × 167 ≈ 10000 max)

// Row colors (top to bottom) — design system breaker palette
const ROW_COLORS = ['#FF6B6B', '#F7B267', '#FFE066', '#7BD389', '#4D96FF'];

// ── Paddle ────────────────────────────────────────────────────────────────────
const PADDLE_W   = 90;
const PADDLE_H   = 12;
const PADDLE_Y   = CH - 30;
const PADDLE_SPD = 8;

// ── Ball ──────────────────────────────────────────────────────────────────────
const BALL_R   = 7;
const BALL_SPD = 5;

function getReward(score) {
  if (score >= 10000) return 15;
  if (score >= 5000)  return 7;
  if (score >= 1000)  return 2;
  return 0;
}

function BrickBreaker({ account, contracts, goldBalance, refresh, formatGold, setPage }) {
  const [phase,  setPhase]  = useState('start');
  const [score,  setScore]  = useState(0);
  const [lives,  setLives]  = useState(3);
  const [reward,   setReward]  = useState(0);
  const [txMsg,    setTxMsg]   = useState('');
  const [showQuit, setShowQuit]= useState(false);

  const canvasRef  = useRef(null);
  const frameRef   = useRef(null);
  const activeRef  = useRef(false);

  // ── Game state in refs ────────────────────────────────────────────────────
  const paddleRef = useRef({ x: CW / 2 - PADDLE_W / 2 });
  const ballRef   = useRef({ x: CW / 2, y: PADDLE_Y - BALL_R - 2, vx: BALL_SPD * 0.7, vy: -BALL_SPD });
  const bricksRef = useRef([]);
  const scoreRef  = useRef(0);
  const livesRef  = useRef(3);
  const keysRef   = useRef({});  // held keys
  const gameOverRef = useRef(false);

  // Init bricks
  function initBricks() {
    const arr = [];
    for (let r = 0; r < BRICK_ROWS; r++)
      for (let c = 0; c < BRICK_COLS; c++)
        arr.push({ r, c, alive: true, color: ROW_COLORS[r] });
    bricksRef.current = arr;
  }

  // Reset ball above paddle
  function resetBall() {
    ballRef.current = {
      x: paddleRef.current.x + PADDLE_W / 2,
      y: PADDLE_Y - BALL_R - 2,
      vx: BALL_SPD * (Math.random() > 0.5 ? 0.7 : -0.7),
      vy: -BALL_SPD,
    };
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CW, CH);

    // Bricks
    bricksRef.current.forEach(b => {
      if (!b.alive) return;
      const x = BRICK_OFF_X + b.c * (BRICK_W + BRICK_GAP);
      const y = BRICK_OFF_Y + b.r * (BRICK_H + BRICK_GAP);
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(x, y, BRICK_W, BRICK_H, 3);
      ctx.fill();
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, BRICK_W - 4, 4, 2);
      ctx.fill();
    });

    // Paddle
    const px = paddleRef.current.x;
    const grad = ctx.createLinearGradient(px, PADDLE_Y, px, PADDLE_Y + PADDLE_H);
    grad.addColorStop(0, '#A7D28D');
    grad.addColorStop(1, '#5C8C4A');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(px, PADDLE_Y, PADDLE_W, PADDLE_H, 6);
    ctx.fill();

    // Ball
    const ball = ballRef.current;
    ctx.fillStyle = '#F7B37A';
    ctx.shadowColor = '#F7B37A';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // HUD: score & lives
    ctx.fillStyle = '#fff';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${scoreRef.current}`, 10, 18);
    ctx.textAlign = 'right';
    ctx.fillText(`Lives: ${'❤️'.repeat(livesRef.current)}`, CW - 10, 18);
  }, []);

  // ── Physics tick ──────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    if (gameOverRef.current) return;

    // Paddle movement from arrow keys
    const p = paddleRef.current;
    if (keysRef.current['ArrowLeft'] || keysRef.current['a'])  p.x = Math.max(0, p.x - PADDLE_SPD);
    if (keysRef.current['ArrowRight'] || keysRef.current['d']) p.x = Math.min(CW - PADDLE_W, p.x + PADDLE_SPD);

    // Ball movement
    const ball = ballRef.current;
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall bounces (left/right/top)
    if (ball.x - BALL_R <= 0)       { ball.x = BALL_R;      ball.vx *= -1; }
    if (ball.x + BALL_R >= CW)      { ball.x = CW - BALL_R; ball.vx *= -1; }
    if (ball.y - BALL_R <= 0)       { ball.y = BALL_R;      ball.vy *= -1; }

    // Paddle collision
    if (
      ball.vy > 0 &&
      ball.y + BALL_R >= PADDLE_Y &&
      ball.y - BALL_R <= PADDLE_Y + PADDLE_H &&
      ball.x >= p.x && ball.x <= p.x + PADDLE_W
    ) {
      ball.y = PADDLE_Y - BALL_R;
      ball.vy *= -1;
      // Angle based on hit position on paddle
      const offset = (ball.x - (p.x + PADDLE_W / 2)) / (PADDLE_W / 2);
      ball.vx = BALL_SPD * offset * 1.5;
      // Ensure minimum vertical speed
      if (Math.abs(ball.vy) < 2) ball.vy = -2;
    }

    // Ball falls below paddle — lose a life
    if (ball.y - BALL_R > CH) {
      livesRef.current -= 1;
      setLives(livesRef.current);
      if (livesRef.current <= 0) {
        gameOverRef.current = true;
        activeRef.current = false;
        setPhase('gameover');
        return;
      }
      resetBall();
    }

    // Brick collisions
    let bricksLeft = 0;
    bricksRef.current.forEach(b => {
      if (!b.alive) return;
      bricksLeft++;
      const bx = BRICK_OFF_X + b.c * (BRICK_W + BRICK_GAP);
      const by = BRICK_OFF_Y + b.r * (BRICK_H + BRICK_GAP);

      if (
        ball.x + BALL_R > bx &&
        ball.x - BALL_R < bx + BRICK_W &&
        ball.y + BALL_R > by &&
        ball.y - BALL_R < by + BRICK_H
      ) {
        b.alive = false;
        scoreRef.current += POINTS_EACH;
        setScore(scoreRef.current);

        // Determine bounce direction
        const overlapLeft   = ball.x + BALL_R - bx;
        const overlapRight  = bx + BRICK_W - (ball.x - BALL_R);
        const overlapTop    = ball.y + BALL_R - by;
        const overlapBottom = by + BRICK_H - (ball.y - BALL_R);
        const minH = Math.min(overlapLeft, overlapRight);
        const minV = Math.min(overlapTop, overlapBottom);
        if (minH < minV) ball.vx *= -1;
        else             ball.vy *= -1;
      }
    });

    // All bricks cleared — win!
    if (bricksLeft === 0) {
      gameOverRef.current = true;
      activeRef.current = false;
      setPhase('gameover');
    }
  }, []);

  // ── Game loop ─────────────────────────────────────────────────────────────
  const loop = useCallback(() => {
    if (!activeRef.current) return;
    tick();
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

  // ── Mouse move → move paddle ──────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      paddleRef.current.x = Math.max(0, Math.min(CW - PADDLE_W, mouseX - PADDLE_W / 2));
    };
    canvas.addEventListener('mousemove', handleMouse);
    return () => canvas.removeEventListener('mousemove', handleMouse);
  }, [phase]);

  // ── Arrow key controls ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const onDown = (e) => {
      keysRef.current[e.key] = true;
      if (['ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
    };
    const onUp = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [phase]);

  // ── Submit result after game over ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'gameover') return;
    // Draw game over overlay
    const canvas = canvasRef.current;
    if (canvas) {
      draw();
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(scoreRef.current >= 10000 ? 'YOU WIN! 🎉' : 'GAME OVER', CW / 2, CH / 2 - 20);
      ctx.font = '16px monospace';
      ctx.fillText(`Score: ${scoreRef.current}`, CW / 2, CH / 2 + 16);
    }
    // Only submit on-chain if the player earned a reward — no gas cost for low scores
    if (scoreRef.current < 1000) {
      setReward(0);
      setPhase('result');
      return;
    }
    const doSubmit = async () => {
      setTxMsg('Submitting result on-chain...');
      try {
        const tx = await contracts.brickBreaker.submitResult(scoreRef.current);
        await tx.wait();
        await refresh();
        setReward(getReward(scoreRef.current));
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
      const tx = await contracts.brickBreaker.startGame();
      await tx.wait();
      initBricks();
      paddleRef.current = { x: CW / 2 - PADDLE_W / 2 };
      scoreRef.current  = 0;
      livesRef.current  = 3;
      gameOverRef.current = false;
      setScore(0); setLives(3);
      resetBall();
      setTxMsg('');
      activeRef.current = true;
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
    setPhase('start'); setScore(0); setLives(3); setReward(0); setTxMsg('');
    scoreRef.current = 0; livesRef.current = 3; gameOverRef.current = false;
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
      <h1 className="page-title">Brick Breaker</h1>

      {/* ── Start screen ── */}
      {phase === 'start' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <img src="/assets/icon-brickbreaker.png" alt="" style={{ width: 120, height: 'auto', imageRendering: 'pixelated', marginBottom: 12 }} />
          <h2>Break all the bricks!</h2>
          <p>
            Move the paddle with your mouse or arrow keys.
            3 lives — don't let the ball fall!
          </p>
          <div>
            <button className="btn-pixel green" onClick={handleStart}>
              ▶ Pay 1 GOLD &amp; Start
            </button>
          </div>
          {txMsg && <p className="tx-msg">{txMsg}</p>}
        </div>
      )}

      {/* ── Canvas ── */}
      {(phase === 'playing' || phase === 'gameover' || phase === 'submitting') && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <canvas
                ref={canvasRef}
                width={CW}
                height={CH}
                style={{
                  border: 'var(--border)',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow)',
                  display: 'block',
                  cursor: 'none',
                }}
              />
            </div>
            <p className="game-status">Mouse or ← → arrow keys to move paddle</p>
            {(txMsg || phase === 'submitting') && (
              <p className="game-status">{txMsg || '⏳ Confirming on-chain...'}</p>
            )}
          </div>
          <RewardPanel tiers={BRICK_REWARDS} current={score} higherIsBetter={true} />
        </div>
      )}

      {/* ── Result screen ── */}
      {phase === 'result' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>{reward > 0 ? '🏆' : '🧱'}</div>
          <h2>{score >= 10000 ? 'All Bricks Cleared!' : 'Game Over!'}</h2>
          <p>Final score: <strong>{score.toLocaleString()}</strong> pts</p>
          {reward > 0
            ? <p className="reward-text">+{reward} GOLD earned!</p>
            : <p>Score 1,000+ to earn GOLD!</p>
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

export default BrickBreaker;
