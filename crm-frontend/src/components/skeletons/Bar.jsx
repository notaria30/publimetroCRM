import "./skeleton.css";

export function Bar({ style, className = "" }) {
  return <span className={`crm-skel ${className}`} style={style} />;
}

export function LoadingDots() {
  return (
    <div className="crm-loading-dots">
      {[0, 1, 2].map((i) => (
        <span key={i} className="crm-loading-dot" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}
