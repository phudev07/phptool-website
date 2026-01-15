import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import MyLicenses from './pages/MyLicenses';
import Profile from './pages/Profile';
import BuyLicense from './pages/BuyLicense';
import Guide from './pages/Guide';
import AdminUsers from './pages/admin/Users';
import AdminLicenses from './pages/admin/Licenses';
import AdminOrders from './pages/admin/Orders';
import AdminDeposits from './pages/admin/Deposits';
import AdminStats from './pages/admin/Stats';
import AdminSettings from './pages/admin/Settings';
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

      <Route path="/guide" element={<Guide />} />
      <Route path="/guide/:productId" element={<Guide />} />

      <Route path="/profile" element={
        <PrivateRoute>
          <Profile />
        </PrivateRoute>
      } />
      
      <Route path="/buy" element={
        <PrivateRoute>
          <BuyLicense />
        </PrivateRoute>
      } />

      <Route path="/buy/:productId" element={
        <PrivateRoute>
          <BuyLicense />
        </PrivateRoute>
      } />

      {/* Admin Routes */}
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
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
