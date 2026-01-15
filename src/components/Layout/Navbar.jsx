import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Wallet, Key, User, Settings, LogOut, Menu, X, ChevronDown, Users, FileText, BarChart3, Cog } from 'lucide-react';
import logoImage from '/logo.png';
import './Navbar.css';

export default function Navbar() {
  const { currentUser, userProfile, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const balance = userProfile?.balance || 0;

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
  }

  function isActive(path) {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-brand">
          <img src={logoImage} alt="PHP Tool" className="brand-logo" />
          <span className="brand-text">PHP Tool</span>
        </Link>

        {/* Desktop Menu */}
        <div className="navbar-center">
          {currentUser && (
            <>
              <Link to="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </Link>
              <Link to="/my-licenses" className={`nav-item ${isActive('/my-licenses') ? 'active' : ''}`}>
                <Key size={18} />
                <span>License</span>
              </Link>
              {isAdmin() && (
                <div className="admin-dropdown">
                  <button className={`nav-item admin-nav ${isActive('/admin') ? 'active' : ''}`}>
                    <Settings size={18} />
                    <span>Admin</span>
                    <ChevronDown size={14} className="admin-chevron" />
                  </button>
                  <div className="admin-dropdown-menu">
                    <Link to="/admin/users" className="admin-dropdown-item">
                      <Users size={16} /> Users
                    </Link>
                    <Link to="/admin/licenses" className="admin-dropdown-item">
                      <Key size={16} /> Keys
                    </Link>
                    <Link to="/admin/orders" className="admin-dropdown-item">
                      <FileText size={16} /> Đơn hàng
                    </Link>
                    <Link to="/admin/deposits" className="admin-dropdown-item">
                      <Wallet size={16} /> Nạp tiền
                    </Link>
                    <Link to="/admin/stats" className="admin-dropdown-item">
                      <BarChart3 size={16} /> Thống kê
                    </Link>
                    <Link to="/admin/settings" className="admin-dropdown-item">
                      <Cog size={16} /> Cài đặt
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Section */}
        <div className="navbar-right">
          {currentUser ? (
            <>
              {/* Balance */}
              <Link to="/wallet" className="balance-chip">
                <Wallet size={16} />
                <span>{formatMoney(balance)}đ</span>
              </Link>

              {/* Account Dropdown */}
              <div 
                className={`account-dropdown ${accountOpen ? 'open' : ''}`}
                onMouseEnter={() => setAccountOpen(true)}
                onMouseLeave={() => setAccountOpen(false)}
              >
                <button className="account-trigger">
                  <div className="nav-avatar">
                    {(userProfile?.displayName || currentUser.email)?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <ChevronDown size={14} className="chevron" />
                </button>
                <div className="dropdown-panel">
                  <div className="dropdown-header">
                    <span className="dropdown-name">{userProfile?.displayName || 'User'}</span>
                    <span className="dropdown-email">{currentUser.email}</span>
                  </div>
                  <div className="dropdown-divider"></div>
                  <Link to="/my-licenses" className="dropdown-link">
                    <Key size={16} /> License của tôi
                  </Link>
                  <Link to="/wallet" className="dropdown-link">
                    <Wallet size={16} /> Nạp tiền
                  </Link>
                  <Link to="/profile" className="dropdown-link">
                    <User size={16} /> Lịch sử giao dịch
                  </Link>

                  <div className="dropdown-divider"></div>
                  <button onClick={handleLogout} className="dropdown-link logout">
                    <LogOut size={16} /> Đăng xuất
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-login">Đăng nhập</Link>
              <Link to="/register" className="btn-signup">Đăng ký</Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button className="mobile-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        {currentUser ? (
          <>
            <div className="mobile-user">
              <div className="mobile-avatar">
                {(userProfile?.displayName || currentUser.email)?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="mobile-user-info">
                <span className="mobile-name">{userProfile?.displayName || 'User'}</span>
                <span className="mobile-balance">{formatMoney(balance)}đ</span>
              </div>
            </div>
            <div className="mobile-divider"></div>
            <Link to="/dashboard" className="mobile-link" onClick={() => setMenuOpen(false)}>
              <LayoutDashboard size={20} /> Dashboard
            </Link>
            <Link to="/buy/regfb" className="mobile-link" onClick={() => setMenuOpen(false)}>
              <Key size={20} /> Sản phẩm
            </Link>
            <Link to="/my-licenses" className="mobile-link" onClick={() => setMenuOpen(false)}>
              <Key size={20} /> License của tôi
            </Link>
            <Link to="/wallet" className="mobile-link" onClick={() => setMenuOpen(false)}>
              <Wallet size={20} /> Nạp tiền
            </Link>
            <Link to="/profile" className="mobile-link" onClick={() => setMenuOpen(false)}>
              <User size={20} /> Lịch sử giao dịch
            </Link>
            {isAdmin() && (
              <>
                <div className="mobile-divider"></div>
                <span className="mobile-label">Admin</span>
                <Link to="/admin/users" className="mobile-link admin" onClick={() => setMenuOpen(false)}>
                  <Users size={20} /> Users
                </Link>
                <Link to="/admin/licenses" className="mobile-link admin" onClick={() => setMenuOpen(false)}>
                  <Key size={20} /> Keys
                </Link>
                <Link to="/admin/orders" className="mobile-link admin" onClick={() => setMenuOpen(false)}>
                  <FileText size={20} /> Đơn hàng
                </Link>
                <Link to="/admin/deposits" className="mobile-link admin" onClick={() => setMenuOpen(false)}>
                  <Wallet size={20} /> Nạp tiền
                </Link>
                <Link to="/admin/stats" className="mobile-link admin" onClick={() => setMenuOpen(false)}>
                  <BarChart3 size={20} /> Thống kê
                </Link>
                <Link to="/admin/settings" className="mobile-link admin" onClick={() => setMenuOpen(false)}>
                  <Cog size={20} /> Cài đặt
                </Link>
              </>
            )}
            <div className="mobile-divider"></div>
            <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="mobile-link logout">
              <LogOut size={20} /> Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="mobile-link" onClick={() => setMenuOpen(false)}>
              Đăng nhập
            </Link>
            <Link to="/register" className="mobile-link highlight" onClick={() => setMenuOpen(false)}>
              Đăng ký
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
