import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Submission from './pages/Submission';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* User-only: redirect admins to /admin */}
          <Route
            path="/submission"
            element={
              <ProtectedRoute userOnly>
                <Submission />
              </ProtectedRoute>
            }
          />

          {/* Admin-only: redirect non-admins to /submission */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Root: redirect based on role after auth */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/submission" replace />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
