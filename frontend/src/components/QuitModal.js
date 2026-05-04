// Replaces window.confirm() for quit-game flow.
// Usage: <QuitModal onConfirm={() => setPage('home')} onCancel={() => setShowQuit(false)} />
function QuitModal({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div className="card" style={{ maxWidth: 380, width: '90%', textAlign: 'center', padding: '32px 28px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🚪</div>
        <h2>Are you sure you want to quit?</h2>
        <p style={{ marginBottom: 28 }}>Your 1 GOLD entry fee is non-refundable.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn-pixel" onClick={onConfirm} style={{ fontSize: 'var(--font-base)', padding: '14px 28px' }}>Yes, quit</button>
          <button className="btn-pixel green" onClick={onCancel} style={{ fontSize: 'var(--font-base)', padding: '14px 28px' }}>Keep playing</button>
        </div>
      </div>
    </div>
  );
}

export default QuitModal;
