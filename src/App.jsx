import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import MyLicenses from './pages/MyLicenses';
import Profile from './pages/Profile';
import BuyLicense from './pages/BuyLicense';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminLicenses from './pages/admin/Licenses';
import AdminOrders from './pages/admin/Orders';
import AdminDeposits from './pages/admin/Deposits';
import AdminStats from './pages/admin/Stats';
import AdminSettings from './pages/admin/Settings';
import FallingFlowers from './components/FallingFlowers';
import './App.css';

// Protected Route Component
function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  return currentUser ? children : <Navigate to="/login" />;
}

// Public Route (redirect if logged in)
function PublicRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  return !currentUser ? children : <Navigate to="/dashboard" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/products" element={<Home />} />
      
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      
      <Route path="/dashboard" element={
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      } />

      <Route path="/wallet" element={
        <PrivateRoute>
          <Wallet />
        </PrivateRoute>
      } />

      <Route path="/my-licenses" element={
        <PrivateRoute>
          <MyLicenses />
        </PrivateRoute>
      } />

      <Route path="/profile" element={
        <PrivateRoute>
          <Profile />
        </PrivateRoute>
      } />
      
      <Route path="/buy" element={
        <BuyLicense />
      } />

      <Route path="/buy/:productId" element={
        <BuyLicense />
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <PrivateRoute>
          <AdminDashboard />
        </PrivateRoute>
      } />

      <Route path="/admin/users" element={
        <PrivateRoute>
          <AdminUsers />
        </PrivateRoute>
      } />
      
      <Route path="/admin/licenses" element={
        <PrivateRoute>
          <AdminLicenses />
        </PrivateRoute>
      } />
      
      <Route path="/admin/orders" element={
        <PrivateRoute>
          <AdminOrders />
        </PrivateRoute>
      } />

      <Route path="/admin/deposits" element={
        <PrivateRoute>
          <AdminDeposits />
        </PrivateRoute>
      } />

      <Route path="/admin/stats" element={
        <PrivateRoute>
          <AdminStats />
        </PrivateRoute>
      } />

      <Route path="/admin/settings" element={
        <PrivateRoute>
          <AdminSettings />
        </PrivateRoute>
      } />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <FallingFlowers />
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
