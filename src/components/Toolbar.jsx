export default function Toolbar({ explode, setExplode }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: 20,
        zIndex: 100,
        background: "rgba(255,255,255,0.95)",
        padding: "15px",
        borderRadius: "10px",
        width: "260px",
        fontFamily: "Arial",
      }}
    >
      <h3>AIStudio Controls</h3>

      <button
        onClick={() => setExplode(3)}
        style={{
          marginRight: "10px",
          padding: "8px 14px",
          cursor: "pointer",
        }}
      >
        Explode
      </button>

      <button
        onClick={() => setExplode(0)}
        style={{
          padding: "8px 14px",
          cursor: "pointer",
        }}
      >
        Collapse
      </button>

      <br />
      <br />

      <label>Explosion</label>

      <input
        type="range"
        min="0"
        max="3"
        step="0.05"
        value={explode}
        onChange={(e) => setExplode(Number(e.target.value))}
        style={{ width: "100%" }}
      />

      <p>{explode.toFixed(2)}</p>
    </div>
  );
}