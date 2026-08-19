import { Bar, LoadingDots } from "./Bar";

const STAGES = [
  "Prospección", "Calificación", "Propuesta",
  "Negociación", "Cerrado Ganado", "Cerrado Perdido",
];

// Skeleton para el pipeline de Oportunidades, que se muestra como tablero
// kanban (opp-kanban-board / opp-kanban-col / opp-card) en vez de tabla.
export function OpportunityBoardSkeleton() {
  return (
    <div className="sl-page">
      <div className="sl-header">
        <Bar style={{ width: 220, height: 26 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <Bar style={{ width: 150, height: 34, borderRadius: 8 }} />
          <Bar style={{ width: 170, height: 34, borderRadius: 8 }} />
        </div>
      </div>

      <div className="opp-kanban-board">
        {STAGES.map((label, i) => (
          <div className="opp-kanban-col" key={label}>
            <div className="opp-col-header">
              <Bar style={{ width: "60%", height: 12 }} />
              <Bar style={{ width: 50, height: 12 }} />
            </div>
            <div className="opp-col-body">
              {Array.from({ length: i % 2 === 0 ? 2 : 1 }).map((_, j) => (
                <div className="opp-card" key={j}>
                  <Bar style={{ width: "80%", height: 13, marginBottom: 8 }} />
                  <Bar style={{ width: "55%", height: 11, marginBottom: 14 }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Bar style={{ width: 60, height: 11 }} />
                    <Bar style={{ width: 70, height: 11 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <LoadingDots />
    </div>
  );
}
