// SpriteButton.js
// Canvas-based Play button using the sprite sheet at /assets/UI Big Play Button.png
//
// Sprite layout (192×64 total, 4 frames of 96×32):
//   ┌──────────┬──────────┐  y=0  — blank buttons (unused)
//   ├──────────┼──────────┤  y=32 — PLAY buttons  (used)
//   │ DEFAULT  │  HOVER   │
//   └──────────┴──────────┘
//     x=0        x=96

import { useEffect, useRef } from 'react';

// Load the image once at module level — shared by every SpriteButton on the page
const spriteSheet = new Image();
spriteSheet.src = '/assets/UI Big Play Button.png';

// Source coordinates inside the sprite sheet
const SPRITE_W  = 96;   // one frame width
const SPRITE_H  = 32;   // one frame height
const SPRITE_Y  = 32;   // y=32 → bottom row (PLAY buttons)
const FRAME_DEFAULT = 0;   // x=0  → default frame
const FRAME_HOVER   = 96;  // x=96 → hover/pressed frame

// How large to render on screen (2× scale)
const DISPLAY_W = 164;
const DISPLAY_H = 52;

function SpriteButton({ onClick, disabled = false }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef({ hovered: false, pressed: false });
  const frameRef  = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    // ── Draw loop ─────────────────────────────────────────────────────────────
    const draw = () => {
      ctx.clearRect(0, 0, DISPLAY_W, DISPLAY_H);

      // Dim if disabled
      ctx.globalAlpha = disabled ? 0.45 : 1;

      if (spriteSheet.complete && spriteSheet.naturalWidth > 0) {
        const { hovered, pressed } = stateRef.current;

        // Switch to hover frame when moused over (but not if disabled)
        const sourceX    = (!disabled && (hovered || pressed)) ? FRAME_HOVER : FRAME_DEFAULT;
        // Shift down 3px when held — looks like the button physically sinks
        const pressShift = (!disabled && pressed) ? 3 : 0;

        ctx.drawImage(
          spriteSheet,
          sourceX, SPRITE_Y,           // crop from sprite sheet
          SPRITE_W, SPRITE_H,          // crop size
          0, pressShift,               // draw position + press offset
          DISPLAY_W, DISPLAY_H         // draw size (2× scale)
        );
      }

      ctx.globalAlpha = 1;
      frameRef.current = requestAnimationFrame(draw);
    };

    // ── Mouse helpers ─────────────────────────────────────────────────────────
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const isOver = ({ x, y }) =>
      x >= 0 && x <= DISPLAY_W && y >= 0 && y <= DISPLAY_H;

    // ── Mouse listeners ───────────────────────────────────────────────────────
    const onMove = (e) => {
      stateRef.current.hovered  = isOver(getPos(e));
      canvas.style.cursor = (!disabled && stateRef.current.hovered) ? 'pointer' : 'default';
    };

    const onDown = (e) => {
      if (!disabled && isOver(getPos(e))) stateRef.current.pressed = true;
    };

    const onUp = (e) => {
      if (!disabled && stateRef.current.pressed && isOver(getPos(e))) {
        onClick?.();
      }
      stateRef.current.pressed = false;
    };

    const onLeave = () => {
      stateRef.current.hovered = false;
      stateRef.current.pressed = false;
    };

    canvas.addEventListener('mousemove',  onMove);
    canvas.addEventListener('mousedown',  onDown);
    canvas.addEventListener('mouseup',    onUp);
    canvas.addEventListener('mouseleave', onLeave);

    // Start the draw loop (sprite may already be cached)
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      canvas.removeEventListener('mousemove',  onMove);
      canvas.removeEventListener('mousedown',  onDown);
      canvas.removeEventListener('mouseup',    onUp);
      canvas.removeEventListener('mouseleave', onLeave);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [onClick, disabled]);

  return (
    <canvas
      ref={canvasRef}
      width={DISPLAY_W}
      height={DISPLAY_H}
      style={{
        imageRendering: 'pixelated',  // keeps pixel art sharp at 2× scale
        display: 'block',
        maxWidth: '100%',
      }}
    />
  );
}

export default SpriteButton;
