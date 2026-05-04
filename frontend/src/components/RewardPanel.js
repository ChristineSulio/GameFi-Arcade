// RewardPanel — shown to the right of the game area during gameplay
// Props:
//   tiers: [{ label: '10 apples', reward: '2 GOLD', threshold: 10 }, ...]
//   current: current score/apples/attempts (highlights achieved tiers)
//   higherIsBetter: true = highlight tiers where current >= threshold (Snake, Brick)
//                   false = highlight tiers where current <= threshold (MemoryMatch)

function RewardPanel({ tiers, current, higherIsBetter = true }) {
  return (
    <div className="card" style={{ minWidth: 200, padding: '20px 16px', flexShrink: 0 }}>
      <div style={{
        fontFamily: 'var(--pixel-font)',
        fontSize: 'var(--font-base)',
        color: 'var(--navy)',
        marginBottom: 14,
        textAlign: 'center',
      }}>
        💰 Rewards
      </div>

      {tiers.map(({ label, reward, threshold }, i) => {
        const achieved = current !== undefined && (
          higherIsBetter ? current >= threshold : current <= threshold
        );
        return (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 6px',
            borderRadius: 8,
            marginBottom: 4,
          }}>
            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--brown)' }}>
              {label}
            </span>
            <span style={{
              fontSize: 'var(--font-sm)',
              color: 'var(--gold-dark)',
              fontFamily: 'var(--pixel-font)',
              marginLeft: 12,
              whiteSpace: 'nowrap',
            }}>
              {reward}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default RewardPanel;
