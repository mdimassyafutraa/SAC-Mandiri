import { Navigate, Route, Routes } from 'react-router-dom';

import Login from './pages/auth/Login';

import SecurityDashboard from './pages/security/Dashboard';

import AdminDashboard from './pages/admin/Dashboard';
import AllQueues from './pages/admin/AllQueues';

import ProtectedRoute from './routes/ProtectedRoute';
import Layout from './components/Layout';

function App() {
  return (
    <Routes>
      
      <Route path="/" element={<Login />} />

      
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
