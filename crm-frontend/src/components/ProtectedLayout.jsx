// src/components/ProtectedLayout.jsx
import Navbar from "./Navbar";
import "./ProtectedLayout.css";

function ProtectedLayout({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default ProtectedLayout;