// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";
import ProtectedLayout from "./components/ProtectedLayout";

// Dashboard
import DashboardPage from "./pages/dashboard/DashboardPage";

// Clients
import ClientsPage from "./pages/clients/ClientsPage";
import ClientCreatePage from "./pages/clients/ClientCreatePage";
import ClientDetailPage from "./pages/clients/ClientDetailPage";
import ClientEditPage from "./pages/clients/ClientEditPage";

// Quotes
import QuotesPage from "./pages/quotes/QuotesPage";
import QuoteCreatePage from "./pages/quotes/QuoteCreatePage";
import QuoteDetailPage from "./pages/quotes/QuoteDetailPage";
import QuoteEditPage from "./pages/quotes/QuoteEditPage";

// Sales
import SalesListPage from "./pages/sales/SalesListPage";
import SaleDetailPage from "./pages/sales/SaleDetailPage";

// PostSale
import PostSaleListPage from "./pages/postsale/PostSaleListPage";
import PostSaleDetailPage from "./pages/postsale/PostSaleDetailPage";

// Invoices
import InvoiceListPage from "./pages/invoices/InvoiceListPage";
import InvoiceCreatePage from "./pages/invoices/InvoiceCreatePage";
import InvoiceDetailPage from "./pages/invoices/InvoiceDetailPage";

// Reports
import ReportsHomePage from "./pages/reports/ReportsHomePage";
import ReportSalesPage from "./pages/reports/ReportSalesPage";
import ReportProjectionsPage from "./pages/reports/ReportProjectionsPage";
import ReportClientesActivosPage from "./pages/reports/ReportClientesActivosPage";
import ReportPublicidadPage from "./pages/reports/ReportPublicidadPage";
import ReportActivacionesPage from "./pages/reports/ReportActivacionesPage";
import ReportAnalyticsPage from "./pages/reports/ReportAnalyticsPage";
import ReportMetasPage from "./pages/reports/ReportMetasPage";
import PostSaleCreatePage from "./pages/postsale/PostSaleCreatePage";

import CampaignListPage from "./pages/campaigns/CampaignListPage.jsx";
import CampaignDetailPage from "./pages/campaigns/CampaignDetailPage.jsx";
import CampaignFormPage from "./pages/campaigns/CampaignFormPage.jsx";
import ClientCampaignsPage from "./pages/clients/ClientCampaignsPage";


function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;

  if (!user) return <Navigate to="/login" replace />;

  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* PUBLIC */}
          <Route path="/login" element={<LoginPage />} />

          {/* PROTECTED */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <DashboardPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />

          {/* CLIENTS */}
          <Route
            path="/clients"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <ClientsPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/clients/new"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <ClientCreatePage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/clients/:id"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <ClientDetailPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/clients/:id/edit"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <ClientEditPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/clients/:id/campaigns"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <ClientCampaignsPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/clients/:clientId/campaigns/new"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <CampaignFormPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/clients/:clientId/campaigns/:campId"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <CampaignDetailPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/clients/:clientId/campaigns/:campId/edit"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <CampaignFormPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />

          {/* QUOTES */}
          <Route
            path="/quotes"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <QuotesPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/quotes/new"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <QuoteCreatePage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/quotes/:id"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <QuoteDetailPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/quotes/:id/edit"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <QuoteEditPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />

          {/* SALES */}
          <Route
            path="/sales"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <SalesListPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/sales/:id"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <SaleDetailPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />

          {/* POST SALE */}
          <Route
            path="/postsale"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <PostSaleListPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/postsale/:id"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <PostSaleDetailPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/postsale/create"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <PostSaleCreatePage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />

          {/* INVOICES */}
          <Route
            path="/invoices"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <InvoiceListPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/invoices/new"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <InvoiceCreatePage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/invoices/:id"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <InvoiceDetailPage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />

          {/* REPORTS */}
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <ProtectedLayout>
                  <ReportsHomePage />
                </ProtectedLayout>
              </PrivateRoute>
            }
          />
          <Route path="/reports/sales" element={<ProtectedLayout><ReportSalesPage /></ProtectedLayout>} />
          <Route path="/reports/projections" element={<ProtectedLayout><ReportProjectionsPage /></ProtectedLayout>} />
          <Route path="/reports/clientes-activos" element={<ProtectedLayout><ReportClientesActivosPage /></ProtectedLayout>} />
          <Route path="/reports/publicidad" element={<ProtectedLayout><ReportPublicidadPage /></ProtectedLayout>} />
          <Route path="/reports/activaciones" element={<ProtectedLayout><ReportActivacionesPage /></ProtectedLayout>} />
          <Route path="/reports/analytics" element={<ProtectedLayout><ReportAnalyticsPage /></ProtectedLayout>} />
          <Route path="/reports/metas" element={<ProtectedLayout><ReportMetasPage /></ProtectedLayout>} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
