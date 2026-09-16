import { Routes, Route } from 'react-router-dom';

import Login from './pages/auth/Login';

import SecurityDashboard from './pages/security/Dashboard';
import CSDashboard from './pages/cs/Dashboard';

import AdminDashboard from './pages/admin/Dashboard';
import AllQueues from './pages/admin/AllQueues';
import Employees from './pages/admin/Employees';

import ProtectedRoute from './routes/ProtectedRoute';
import Layout from './components/Layout';

function App() {
  return (
    <Routes>
      {/* LOGIN */}
      <Route path="/" element={<Login />} />

      {/* SECURITY */}
      <Route
        path="/security"
        element={
          <ProtectedRoute role="security">
            <Layout>
              <SecurityDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* CS */}
      <Route
        path="/cs"
        element={
          <ProtectedRoute role="cs">
            <Layout>
              <CSDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ADMIN - DASHBOARD */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ADMIN - SELURUH ANTRIAN */}
      <Route
        path="/admin/queues"
        element={
          <ProtectedRoute role="admin">
            <Layout>
              <AllQueues />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ADMIN - PEGAWAI */}
      <Route
        path="/admin/employees"
        element={
          <ProtectedRoute role="admin">
            <Layout>
              <Employees />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
