import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import DefectsList from './pages/DefectsList';
import CreateDefect from './pages/CreateDefect';
import DefectDetail from './pages/DefectDetail';
import Profile from './pages/Profile';
import UsersList from './pages/UsersList';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/defects"
              element={
                <ProtectedRoute>
                  <DefectsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/defects/new"
              element={
                <ProtectedRoute>
                  <CreateDefect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/defects/:id"
              element={
                <ProtectedRoute>
                  <DefectDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <UsersList />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
