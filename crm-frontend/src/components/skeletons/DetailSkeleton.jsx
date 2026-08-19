import { Bar, LoadingDots } from "./Bar";

// Skeleton para páginas de detalle/formulario (Cliente, Cotización, Venta,
// Post-Venta, Factura, Campaña, Oportunidad…). Cada página describe su propio
// header y sus propias tarjetas (`cards`) usando sus clases reales, así el
// hueco de carga coincide con la forma real de esa página en vez de mostrar
// siempre el mismo layout genérico.
export function DetailSkeleton({
  pageClass,
  headerClass,
  actions = 2,
  titleWidth = 220,
  cards = [],
  statsGridClass,
  statBoxClass,
  statCount = 0,
}) {
  return (
    <div className={pageClass}>
      <div className={headerClass}>
        <Bar style={{ width: titleWidth, height: 26 }} />
        <div style={{ display: "flex", gap: 10 }}>
          {Array.from({ length: actions }).map((_, i) => (
            <Bar key={i} style={{ width: 100, height: 32, borderRadius: 8 }} />
          ))}
        </div>
      </div>

      {cards.map((card, i) => (
        <div className={card.cardClass} key={i}>
          {card.headerClass ? (
            <div className={card.headerClass}>
              <Bar style={{ width: 160, height: 13 }} />
            </div>
          ) : (
            <Bar style={{ width: 160, height: 13, marginBottom: 14 }} />
          )}

          <div
            className={card.bodyClass}
            style={card.bodyClass ? undefined : { padding: "16px 0 4px" }}
          >
            {card.gridClass ? (
              <div className={card.gridClass}>
                {Array.from({ length: card.lines || 4 }).map((_, j) => (
                  <div key={j}>
                    <Bar style={{ width: "55%", height: 10, marginBottom: 8 }} />
                    <Bar style={{ width: "82%", height: 15 }} />
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${card.cols || 2}, 1fr)`,
                  gap: 16,
                }}
              >
                {Array.from({ length: card.lines || 4 }).map((_, j) => (
                  <div key={j}>
                    <Bar style={{ width: "55%", height: 10, marginBottom: 8 }} />
                    <Bar style={{ width: "82%", height: 15 }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {statCount > 0 && (
        <div className={statsGridClass} style={{ marginTop: 8 }}>
          {Array.from({ length: statCount }).map((_, i) => (
            <div className={statBoxClass} key={i}>
              <Bar style={{ height: 12, width: "70%", marginBottom: 12 }} />
              <Bar style={{ height: 26, width: "45%" }} />
            </div>
          ))}
        </div>
      )}

      <LoadingDots />
    </div>
  );
}
