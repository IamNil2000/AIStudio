export default function ExplodeControls({
  explodeAmount,
  setExplodeAmount,
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: 20,
        background: "rgba(30,30,30,0.85)",
        padding: "15px",
        borderRadius: "10px",
        color: "white",
        width: "250px",
        zIndex: 10,
      }}
    >
      <h3>Explosion</h3>

      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={explodeAmount}
        onChange={(e) =>
          setExplodeAmount(Number(e.target.value))
        }
        style={{ width: "100%" }}
      />

      <div
        style={{
          marginTop: 15,
          display: "flex",
          gap: 10,
        }}
      >
        <button
          onClick={() => setExplodeAmount(1)}
        >
          Explode
        </button>

        <button
          onClick={() => setExplodeAmount(0)}
        >
          Collapse
        </button>
      </div>
    </div>
  );
}