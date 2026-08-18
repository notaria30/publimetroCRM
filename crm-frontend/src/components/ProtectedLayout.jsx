// src/components/ProtectedLayout.jsx
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./ProtectedLayout.css";

function ProtectedLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Topbar />
        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default ProtectedLayout;