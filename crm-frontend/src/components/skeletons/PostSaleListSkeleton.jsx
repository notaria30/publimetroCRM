import { Bar, LoadingDots } from "./Bar";

// Skeleton para el listado de Post-Venta, que se muestra como grid de
// tarjetas (ps-grid / ps-card) en vez de tabla.
export function PostSaleListSkeleton({ cardCount = 6 }) {
  return (
    <div className="sl-page">
      <div className="sl-header">
        <Bar style={{ width: 170, height: 26 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <Bar style={{ width: 260, height: 34, borderRadius: 8 }} />
          <Bar style={{ width: 160, height: 34, borderRadius: 8 }} />
        </div>
      </div>

      <div className="ps-grid">
        {Array.from({ length: cardCount }).map((_, i) => (
          <div className="ps-card" key={i}>
            <div className="ps-card-body">
              <div className="ps-card-header-row">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Bar style={{ width: "70%", height: 15, marginBottom: 8 }} />
                  <Bar style={{ width: "50%", height: 11 }} />
                </div>
                <Bar style={{ width: 80, height: 20, borderRadius: 20 }} />
              </div>

              <hr className="ps-card-divider" />

              <div className="ps-card-info">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div className="ps-card-info-item" key={j}>
                    <Bar style={{ width: "60%", height: 9, marginBottom: 6 }} />
                    <Bar style={{ width: "40%", height: 13 }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="ps-card-footer">
              <Bar style={{ width: "100%", height: 32, borderRadius: 8 }} />
            </div>
          </div>
        ))}
      </div>

      <LoadingDots />
    </div>
  );
}
