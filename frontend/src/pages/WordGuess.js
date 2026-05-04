// frontend/src/pages/WordGuess.js
// Word Quest — Wordle-style 5-letter guessing game
// Contract flow: startGame() → guess words → submitResult(guessCount) on win, forfeit() on loss

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Word list (targets + valid guesses) ──────────────────────────────────────
const WORDS = [
  'ABOUT','ABOVE','AFTER','AGAIN','AGENT','AGREE','AHEAD','ALARM','ALBUM','ALERT',
  'ALIVE','ALLOW','ALONE','ALONG','ALTER','ANGEL','ANGER','ANGLE','APART','APPLE',
  'APPLY','ARENA','ARGUE','ARISE','ARROW','ASSET','AVOID','AWARE','BADLY','BEACH',
  'BEARD','BEAST','BEGIN','BEING','BELOW','BENCH','BIRTH','BLACK','BLADE','BLAME',
  'BLANK','BLAST','BLEND','BLESS','BLOCK','BLOOD','BLOOM','BOARD','BONUS','BOUND',
  'BRAIN','BRAND','BRAVE','BREAD','BREAK','BREED','BRING','BROAD','BROKE','BROWN',
  'BUILD','BUILT','BUNCH','BURST','CABIN','CANDY','CARRY','CATCH','CAUSE','CHAIN',
  'CHARM','CHASE','CHEAP','CHEER','CHEST','CHIEF','CHILD','CHOSE','CLAIM','CLASS',
  'CLEAN','CLEAR','CLIFF','CLIMB','CLOSE','CLOUD','COAST','CORAL','COUNT','COURT',
  'COVER','CRACK','CRAFT','CRASH','CRAZY','CREAM','CRIME','CROSS','CROWD','CRUSH',
  'CURVE','CYCLE','DANCE','DEPTH','DODGE','DOUBT','DRAFT','DRAIN','DRAMA','DREAM',
  'DRINK','DRIVE','EARTH','EIGHT','ELITE','EMPTY','ENEMY','ENJOY','ENTER','EQUAL',
  'EVENT','EXACT','EXTRA','FAINT','FAIRY','FAITH','FANCY','FEAST','FENCE','FEVER',
  'FIELD','FIGHT','FINAL','FIRST','FIXED','FLAME','FLASH','FLEET','FLOAT','FLOOD',
  'FLOOR','FLOUR','FLUTE','FOCUS','FORCE','FORGE','FORTH','FOUND','FRAME','FRESH',
  'FRONT','FROST','FRUIT','FULLY','FUNNY','GIANT','GIVEN','GLASS','GLOBE','GLORY',
  'GRACE','GRADE','GRAIN','GRAND','GRANT','GRASP','GRASS','GRAVE','GREAT','GREED',
  'GREEN','GRIEF','GROUP','GROVE','GROWN','GUARD','GUIDE','GUILD','HABIT','HAPPY',
  'HARSH','HEART','HEAVY','HONEY','HONOR','HORSE','HOTEL','HOUSE','HURRY','IMAGE',
  'INNER','ISSUE','JOINT','JUDGE','JUICE','JUICY','JUMBO','KNIFE','KNOCK','KNOWN',
  'LARGE','LASER','LATER','LAUGH','LAYER','LEARN','LEAVE','LEGAL','LEVEL','LIGHT',
  'LIMIT','LOCAL','LOOSE','LOWER','LUCKY','LUNCH','MAGIC','MAJOR','MAKER','MARCH',
  'MATCH','MAYOR','MERCY','MERIT','METAL','MIGHT','MINOR','MIXED','MODEL','MONEY',
  'MONTH','MORAL','MOTOR','MOUNT','MOUSE','MOUTH','MUSIC','NAKED','NERVE','NEVER',
  'NIGHT','NOBLE','NOISE','NORTH','NOVEL','NURSE','OCEAN','OFFER','OFTEN','OLIVE',
  'PAINT','PAPER','PARTY','PASTA','PEACE','PEARL','PENNY','PHASE','PHONE','PIANO',
  'PIECE','PILOT','PIZZA','PLACE','PLAIN','PLANE','PLANT','PLATE','PLEAD','POINT',
  'POUND','POWER','PRESS','PRICE','PRIDE','PRIME','PRINT','PRIOR','PRIZE','PROOF',
  'PROSE','PROUD','PROVE','PULSE','QUEEN','QUEST','QUICK','QUIET','QUOTA','QUOTE',
  'RADAR','RADIO','RAISE','RALLY','RANGE','RAPID','RATIO','REACH','READY','REALM',
  'REBEL','REFER','REIGN','RELAX','RENEW','REPLY','RIDER','RIDGE','RIGHT','RIGID',
  'RISKY','RIVAL','RIVER','ROBOT','ROCKY','ROUND','ROYAL','RURAL','SAINT','SALAD',
  'SAUCE','SCALE','SCENE','SCOPE','SCORE','SCOUT','SEIZE','SENSE','SERVE','SETUP',
  'SEVEN','SHADE','SHAKE','SHALL','SHAME','SHARE','SHARK','SHARP','SHELF','SHELL',
  'SHIFT','SHIRT','SHOCK','SHOOT','SHORT','SHOUT','SIGHT','SILLY','SINCE','SKILL',
  'SKULL','SLATE','SLAVE','SLEEP','SLICE','SLIDE','SLOPE','SMALL','SMART','SMELL',
  'SMILE','SMOKE','SNAKE','SOLAR','SOLVE','SORRY','SOUTH','SPACE','SPARE','SPARK',
  'SPEED','SPEND','SPINE','SPLIT','SPOKE','SPORT','SPRAY','STACK','STAGE','STAKE',
  'STAND','STARK','START','STATE','STEAK','STEAL','STEEL','STEEP','STICK','STIFF',
  'STILL','STOCK','STONE','STORE','STORM','STORY','STRAW','STRIP','STUDY','STUFF',
  'STYLE','SUGAR','SUPER','SURGE','SWAMP','SWEAR','SWEEP','SWEET','SWIFT','SWING',
  'SWORD','TABLE','TASTE','TEACH','TENSE','THICK','THING','THINK','THIRD','THREE',
  'THROW','TIGER','TIGHT','TIRED','TITLE','TODAY','TOKEN','TOPIC','TOTAL','TOUCH',
  'TOUGH','TOWER','TRACK','TRADE','TRAIL','TRAIN','TRAIT','TREAD','TREAT','TREND',
  'TRIAL','TRIBE','TRICK','TROOP','TRUCK','TRUNK','TRUST','TRUTH','TWICE','TWIST',
  'ULTRA','UNDER','UNION','UNTIL','UPPER','UPSET','URBAN','USAGE','USUAL','VALID',
  'VALUE','VERSE','VIDEO','VIGOR','VIRAL','VISIT','VITAL','VIVID','VOCAL','VOICE',
  'VOTER','WAGON','WASTE','WATCH','WATER','WEAVE','WEIRD','WHALE','WHEAT','WITCH',
  'WOMAN','WOMEN','WORLD','WORRY','WORSE','WOULD','WRITE','YACHT','YIELD','YOUNG',
  'YOURS','YOUTH','ZEBRA',
];

const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

// Compute tile colors for a completed guess (handles duplicate letters correctly)
function getColors(guess, target) {
  const colors = Array(5).fill('absent');
  const tArr   = [...target];
  guess.split('').forEach((l, i) => {
    if (l === tArr[i]) { colors[i] = 'correct'; tArr[i] = null; }
  });
  guess.split('').forEach((l, i) => {
    if (colors[i] === 'correct') return;
    const idx = tArr.indexOf(l);
    if (idx !== -1) { colors[i] = 'present'; tArr[idx] = null; }
  });
  return colors;
}

// Best status per letter for keyboard coloring (correct > present > absent)
function getLetterStatus(guesses, target) {
  const rank = { correct: 3, present: 2, absent: 1 };
  const map  = {};
  guesses.forEach(g => {
    getColors(g, target).forEach((c, i) => {
      const l = g[i];
      if (!map[l] || rank[c] > rank[map[l]]) map[l] = c;
    });
  });
  return map;
}

const TILE_COLOR = { correct: '#a8e6cf', present: '#f6c453', absent: '#bbb' };
const KEY_COLOR  = { correct: '#a8e6cf', present: '#f6c453', absent: '#999' };
const REWARD_MAP = [20, 15, 10, 7, 4, 2]; // index = guessCount - 1

function WordGuess({ account, contracts, goldBalance, refresh, formatGold, setPage }) {
  const [phase,    setPhase]   = useState('start'); // start | active_found | playing | submitting | result
  const [target,   setTarget]  = useState('');
  const [guesses,  setGuesses] = useState([]);
  const [current,  setCurrent] = useState('');
  const [gameOver, setGameOver]= useState(false);
  const [won,      setWon]     = useState(false);
  const [reward,   setReward]  = useState(0);
  const [txMsg,    setTxMsg]   = useState('');
  const [shake,    setShake]   = useState(false);

  // Stores win/loss result synchronously so the async submit effect always reads fresh data
  const resultRef     = useRef(null);
  const submitDoneRef = useRef(false);

  // ── Check for leftover active game on mount ──
  useEffect(() => {
    if (!contracts || !account) return;
    contracts.wordGuess.activeGame(account)
      .then(active => { if (active) setPhase('active_found'); })
      .catch(() => {});
  }, [contracts, account]);

  // ── Submit to contract once gameOver flips true ──
  useEffect(() => {
    if (!gameOver || !resultRef.current || submitDoneRef.current) return;
    submitDoneRef.current = true;
    const { didWin, guessCount } = resultRef.current;
    const doSubmit = async () => {
      setPhase('submitting');
      setTxMsg('Confirming result on-chain...');
      try {
        const tx = didWin
          ? await contracts.wordGuess.submitResult(guessCount)
          : await contracts.wordGuess.forfeit();
        await tx.wait();
        await refresh();
        setReward(didWin ? REWARD_MAP[guessCount - 1] : 0);
        setTxMsg('');
        setPhase('result');
      } catch (err) {
        setTxMsg('❌ ' + (err.reason || err.shortMessage || err.message || 'Transaction failed').slice(0, 100));
        setReward(0);
        setPhase('result');
      }
    };
    doSubmit();
  }, [gameOver, contracts, refresh]);

  // ── Handle Enter key (memoized to include in effect deps) ──
  const handleEnter = useCallback(() => {
    if (current.length !== 5) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    const newGuesses = [...guesses, current];
    setGuesses(newGuesses);
    setCurrent('');
    if (current === target) {
      resultRef.current = { didWin: true, guessCount: newGuesses.length };
      setWon(true);
      setGameOver(true);
    } else if (newGuesses.length >= 6) {
      resultRef.current = { didWin: false, guessCount: 6 };
      setGameOver(true);
    }
  }, [current, guesses, target]);

  // ── Physical keyboard listener ──
  useEffect(() => {
    if (phase !== 'playing' || gameOver) return;
    const handle = (e) => {
      if (e.key === 'Enter')           handleEnter();
      else if (e.key === 'Backspace')  setCurrent(c => c.slice(0, -1));
      else if (/^[a-zA-Z]$/.test(e.key))
        setCurrent(c => c.length < 5 ? c + e.key.toUpperCase() : c);
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [phase, gameOver, handleEnter]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStart = async () => {
    setTxMsg('Paying 1 GOLD entry fee...');
    try {
      const tx = await contracts.wordGuess.startGame();
      await tx.wait();
      setTarget(WORDS[Math.floor(Math.random() * WORDS.length)]);
      setGuesses([]); setCurrent(''); setGameOver(false); setWon(false);
      resultRef.current = null; submitDoneRef.current = false;
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

  const handleForfeitExisting = async () => {
    setTxMsg('Forfeiting...');
    try {
      const tx = await contracts.wordGuess.forfeit();
      await tx.wait();
      await refresh();
      setTxMsg(''); setPhase('start');
    } catch (err) {
      setTxMsg('❌ ' + (err.reason || err.shortMessage || err.message || 'Failed').slice(0, 80));
    }
  };

  const handleGiveUp = () => {
    resultRef.current = { didWin: false, guessCount: 6 };
    setGameOver(true);
  };

  const handleOnScreenKey = (key) => {
    if (phase !== 'playing' || gameOver) return;
    if (key === 'ENTER')     handleEnter();
    else if (key === '⌫')   setCurrent(c => c.slice(0, -1));
    else setCurrent(c => c.length < 5 ? c + key : c);
  };

  const playAgain = () => {
    setPhase('start'); setGuesses([]); setCurrent('');
    setGameOver(false); setWon(false); setTarget('');
    setReward(0); setTxMsg('');
    resultRef.current = null; submitDoneRef.current = false;
  };

  const letterStatus = (phase === 'playing' || phase === 'submitting')
    ? getLetterStatus(guesses, target) : {};

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page" style={{ maxWidth: 520, paddingTop: 20 }}>
      <button className="btn-pixel" onClick={() => {
        if (phase === 'playing' && !gameOver) {
          if (window.confirm('Quit? Your 1 GOLD entry fee is non-refundable.')) {
            contracts.wordGuess.forfeit().then(tx => tx.wait()).then(() => { refresh(); setPage('home'); }).catch(() => setPage('home'));
          }
        } else { setPage('home'); }
      }} style={{ marginBottom: 16, fontSize: 12, padding: '8px 14px' }}>
        ← Back
      </button>
      <h1 className="page-title">📜 Word Quest</h1>

      {/* ── Active game found ── */}
      {phase === 'active_found' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontFamily: 'var(--pixel-font)', fontSize: 11, marginBottom: 12 }}>Unfinished Game Found</h2>
          <p style={{ fontSize: 14, color: 'var(--brown)', marginBottom: 20 }}>
            You have an unfinished game. Forfeit it to start a new one.
          </p>
          <button className="btn-pixel" onClick={handleForfeitExisting}>Forfeit & Start New</button>
          {txMsg && <p style={{ marginTop: 12, fontSize: 13 }}>{txMsg}</p>}
        </div>
      )}

      {/* ── Start screen ── */}
      {phase === 'start' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>📜</div>
          <h2 style={{ fontFamily: 'var(--pixel-font)', fontSize: 12, marginBottom: 10 }}>Guess the 5-letter word in 6 tries</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
            {[['🟩','Correct spot'],['🟨','Wrong spot'],['⬜','Not in word']].map(([icon, label]) => (
              <div key={label} style={{ fontSize: 12, color: 'var(--brown)', textAlign: 'center' }}>
                <div style={{ fontSize: 22 }}>{icon}</div>
                <div style={{ marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--cream)', border: '2px solid var(--navy)', borderRadius: 8, padding: '10px 20px', marginBottom: 20, display: 'inline-block' }}>
            <p style={{ fontFamily: 'var(--pixel-font)', fontSize: 8, lineHeight: 2 }}>
              1 guess = 20 GOLD &nbsp;|&nbsp; 2 = 15 &nbsp;|&nbsp; 3 = 10<br />
              4 = 7 GOLD &nbsp;|&nbsp; 5 = 4 &nbsp;|&nbsp; 6 = 2 GOLD
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
          {/* 6×5 tile grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', marginBottom: 20 }}>
            {Array.from({ length: 6 }, (_, row) => {
              const guessStr   = row < guesses.length ? guesses[row]
                               : row === guesses.length ? current : '';
              const isSubmitted = row < guesses.length;
              const colors      = isSubmitted ? getColors(guessStr, target) : null;
              const isActive    = row === guesses.length;
              return (
                <div key={row} style={{
                  display: 'flex', gap: 6,
                  animation: isActive && shake ? 'wordShake 0.4s ease-in-out' : 'none',
                }}>
                  {Array.from({ length: 5 }, (_, col) => {
                    const letter = guessStr[col] || '';
                    const bg     = isSubmitted ? TILE_COLOR[colors[col]]
                                 : letter ? 'var(--peach)' : 'var(--white)';
                    return (
                      <div key={col} style={{
                        width: 52, height: 52,
                        background: bg,
                        border: '3px solid var(--navy)',
                        borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--pixel-font)',
                        fontSize: 22,
                        color: 'var(--navy)',
                        boxShadow: letter && !isSubmitted ? '2px 2px 0 var(--navy)' : 'none',
                        transition: 'background 0.25s',
                      }}>
                        {letter}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* On-screen keyboard */}
          {phase === 'playing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', marginBottom: 16 }}>
              {KEYBOARD_ROWS.map((row, r) => (
                <div key={r} style={{ display: 'flex', gap: 4 }}>
                  {row.map(key => {
                    const st = letterStatus[key];
                    const bg = st ? KEY_COLOR[st] : 'var(--peach)';
                    return (
                      <button key={key} onClick={() => handleOnScreenKey(key)} style={{
                        width: key.length > 1 ? 54 : 36, height: 44,
                        background: bg, border: '2px solid var(--navy)', borderRadius: 6,
                        cursor: 'pointer', fontFamily: 'var(--pixel-font)',
                        fontSize: key.length > 1 ? 7 : 12, color: 'var(--navy)',
                        boxShadow: '2px 2px 0 var(--navy)',
                      }}>
                        {key}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Give Up + status */}
          <div style={{ textAlign: 'center' }}>
            {phase === 'playing' && (
              <button className="btn-pixel" onClick={handleGiveUp}
                style={{ fontSize: 11, padding: '6px 14px', opacity: 0.65 }}>
                Give Up
              </button>
            )}
            {(txMsg || phase === 'submitting') && (
              <p style={{ marginTop: 10, fontSize: 13, color: 'var(--brown)' }}>
                {txMsg || '⏳ Confirming on-chain...'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Result screen ── */}
      {phase === 'result' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{won ? '🏆' : '😔'}</div>
          <h2 style={{ fontFamily: 'var(--pixel-font)', fontSize: 13, marginBottom: 12 }}>
            {won ? 'You Won!' : 'Game Over'}
          </h2>
          {won
            ? <p style={{ fontSize: 16, color: 'var(--gold-dark)', fontWeight: 'bold', marginBottom: 8 }}>+{reward} GOLD earned!</p>
            : <p style={{ fontSize: 15, color: 'var(--brown)', marginBottom: 8 }}>The word was: <strong style={{ fontFamily: 'var(--pixel-font)', letterSpacing: 3 }}>{target}</strong></p>
          }
          <p style={{ fontSize: 13, color: 'var(--brown)', marginBottom: 4 }}>Balance: 🪙 {formatGold(goldBalance)} GOLD</p>
          {txMsg && <p style={{ fontSize: 12, color: '#c00', marginBottom: 8 }}>{txMsg}</p>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
            <button className="btn-pixel green" onClick={playAgain}>Play Again</button>
            <button className="btn-pixel" onClick={() => setPage('home')}>Home</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes wordShake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-5px); }
          80%      { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}

export default WordGuess;
