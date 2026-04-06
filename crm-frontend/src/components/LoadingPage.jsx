// src/components/LoadingPage.jsx
export function LoadingPage() {
  return (
    <div className="sl-page">

      <div className="sl-header">
        <div className="sl-skel" style={{ width: 200, height: 28, marginBottom: 8 }} />
        <div className="sl-skel" style={{ width: 160, height: 14 }} />
      </div>

      <div className="sl-stats-grid" style={{ marginBottom: 20 }}>
        {[...Array(4)].map((_, i) => (
          <div className="sl-stat-box sl-stat-box--green" key={i}>
            <div className="sl-skel" style={{ height: 12, width: "70%", marginBottom: 12 }} />
            <div className="sl-skel" style={{ height: 26, width: "50%" }} />
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="sl-card">
          <div className="sl-card-header" style={{ background: "transparent", padding: 0, marginBottom: 16 }}>
            <div className="sl-skel" style={{ height: 14, width: 140 }} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
            {[90, 60, 110, 45].map((h, i) => (
              <div key={i} className="sl-skel sl-skel--pulse"
                style={{ width: 32, height: h, borderRadius: "4px 4px 0 0", animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
        <div className="sl-card">
          <div className="sl-skel" style={{ height: 14, width: 100, marginBottom: 20 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {["#16a34a", "#dc2626", "#2563eb"].map((color, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, opacity: 0.3, flexShrink: 0 }} />
                <div className="sl-skel" style={{ height: 12, flex: 1 }} />
                <div className="sl-skel" style={{ height: 16, width: 80 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sl-card">
        <div className="sl-skel" style={{ height: 14, width: 160, marginBottom: 16 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[...Array(3)].map((_, i) => (
            <div className="sl-stat-box sl-stat-box--green" key={i}>
              <div className="sl-skel" style={{ height: 12, width: "60%", marginBottom: 12 }} />
              <div className="sl-skel" style={{ height: 32, width: "40%" }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="sl-loading-dot" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>

    </div>
  );
}