import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function Navbar() {
  const { currentUser, userProfile, logout, isAdmin } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const avatarMenuRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState(() => {
    return new URLSearchParams(location.search).get('search') || '';
  });

  useEffect(() => {
    const query = new URLSearchParams(location.search).get('search') || '';
    setSearchQuery(query);
  }, [location.search]);

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setAvatarMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown and mobile sidebar on route change
  useEffect(() => {
    setAvatarMenuOpen(false);
    setIsMobileOpen(false);
  }, [location.pathname]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    const params = new URLSearchParams(location.search);
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    
    const isStorefront = location.pathname === '/' || location.pathname === '/products';
    const targetPath = isStorefront ? location.pathname : '/';
    
    navigate(`${targetPath}?${params.toString()}`, { replace: true });
  };

  const balance = userProfile?.balance || 0;
  const showAdminMenu = location.pathname.startsWith('/admin') && isAdmin();

  async function handleLogout() {
    setAvatarMenuOpen(false);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Format balance amount to Vietnamese Dong format
  function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
  }

  // Get dynamic user avatar URL from Dicebear API
  function getAvatarUrl(seed) {
    return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(seed || 'default')}&backgroundColor=transparent`;
  }

  const avatarSeed = currentUser?.uid || currentUser?.email || 'user';

  // Check if link route is currently active
  function isActive(path, exact = false) {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }

  const activeLinkClass = "flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white rounded-xl scale-[0.98] transition-all font-label-md text-label-md shadow-md";
  const normalLinkClass = "flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors hover:bg-surface-container-high font-label-md text-label-md";

  return (
    <>
      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[48] md:hidden backdrop-blur-xs"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* SideNavBar Component */}
      <aside 
        className={`fixed left-0 top-0 h-screen w-sidebar-width bg-surface-container-low border-r border-outline-variant z-50 flex flex-col p-4 gap-2 transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Link to={showAdminMenu ? "/admin" : "/dashboard"} className="mb-8 px-4 flex items-center gap-3 py-2 hover:opacity-85 transition-opacity cursor-pointer block select-none">
          <img src="/logo.png" alt="PHP-TOOL" className="w-10 h-10 rounded-lg object-contain shrink-0" />
          <div>
            <h1 className="font-headline-md text-headline-md font-extrabold bg-gradient-to-r from-[#c21a5b] to-[#571477] bg-clip-text text-transparent">PHP-TOOL</h1>
          </div>
        </Link>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {showAdminMenu ? (
            // Admin Sidebar Navigation
            <>
              <Link to="/dashboard" className={normalLinkClass}>
                <span className="material-symbols-outlined">arrow_back</span>
                <span>Về cửa hàng</span>
              </Link>
              <Link to="/admin" className={isActive('/admin', true) ? activeLinkClass : normalLinkClass}>
                <span className="material-symbols-outlined">dashboard</span>
                <span>Dashboard</span>
              </Link>
              <Link to="/admin/stats" className={isActive('/admin/stats') ? activeLinkClass : normalLinkClass}>
                <span className="material-symbols-outlined">bar_chart</span>
                <span>Thống kê</span>
              </Link>
              <Link to="/admin/users" className={isActive('/admin/users') ? activeLinkClass : normalLinkClass}>
                <span className="material-symbols-outlined">group</span>
                <span>Thành viên</span>
              </Link>
              <Link to="/admin/licenses" className={isActive('/admin/licenses') ? activeLinkClass : normalLinkClass}>
                <span className="material-symbols-outlined">vpn_key</span>
                <span>Keys bản quyền</span>
              </Link>
              <Link to="/admin/settings" className={isActive('/admin/settings') ? activeLinkClass : normalLinkClass}>
                <span className="material-symbols-outlined">settings</span>
                <span>Cài đặt tool</span>
              </Link>
              <Link to="/admin/orders" className={isActive('/admin/orders') ? activeLinkClass : normalLinkClass}>
                <span className="material-symbols-outlined">receipt_long</span>
                <span>Đơn hàng</span>
              </Link>
              <Link to="/admin/deposits" className={isActive('/admin/deposits') ? activeLinkClass : normalLinkClass}>
                <span className="material-symbols-outlined">payments</span>
                <span>Nạp tiền</span>
              </Link>
            </>
          ) : (
            // User Sidebar Navigation
            <>
              <Link to="/" className={(isActive('/', true) || isActive('/products', true)) && !location.search.includes('type=free') ? activeLinkClass : normalLinkClass}>
                <span className="material-symbols-outlined">shopping_cart</span>
                <span>Mua Tool</span>
              </Link>
              <Link to="/products?type=free" className={location.search.includes('type=free') ? activeLinkClass : normalLinkClass}>
                <span className="material-symbols-outlined">redeem</span>
                <span>Tool Free</span>
              </Link>
              <Link to="/my-licenses" className={isActive('/my-licenses') ? activeLinkClass : normalLinkClass}>
                <span className="material-symbols-outlined">key</span>
                <span>Quản lý Tool</span>
              </Link>
              <Link to="/wallet" className={isActive('/wallet') ? activeLinkClass : normalLinkClass}>
                <span className="material-symbols-outlined">account_balance_wallet</span>
                <span>Nạp tiền</span>
              </Link>
              <a href="https://t.me/groupphptool" target="_blank" rel="noopener noreferrer" className={normalLinkClass}>
                <span className="material-symbols-outlined">groups</span>
                <span>Nhóm Telegram</span>
              </a>
              <a href="https://t.me/phptoolvip" target="_blank" rel="noopener noreferrer" className={normalLinkClass}>
                <span className="material-symbols-outlined">support_agent</span>
                <span>Liên hệ</span>
              </a>
              {isAdmin() && (
                <Link to="/admin" className={normalLinkClass}>
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                  <span>Admin Hub</span>
                </Link>
              )}
            </>
          )}
        </nav>
      </aside>

      {/* TopNavBar Component */}
      <header className="fixed top-0 right-0 h-header-height z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant flex justify-between items-center px-4 md:px-gutter w-full md:w-[calc(100%-theme(spacing.sidebar-width))] ml-auto">
        <div className="flex-1 flex items-center gap-2 sm:gap-4">
          {/* Hamburger Menu Toggle Button */}
          <button 
            onClick={() => setIsMobileOpen(true)} 
            className="md:hidden text-on-surface-variant hover:text-[#c21a5b] transition-colors flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container shrink-0"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="relative flex-1 max-w-[130px] sm:max-w-xs md:max-w-none">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={showAdminMenu ? "Tìm kiếm..." : "Tìm kiếm công cụ..."} 
              className="pl-10 pr-4 py-2 rounded-none font-body-md text-body-md w-full md:w-96 transition-all glass-search-input"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-6">
          <button onClick={toggleTheme} className="text-on-surface-variant hover:text-[#c21a5b] transition-colors flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container shrink-0">
            <span className="material-symbols-outlined">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
          
          {currentUser ? (
            <>
              <Link to="/wallet" className="flex items-center gap-1 sm:gap-2 shrink-0">
                <span className="font-label-md text-label-md text-on-surface-variant hidden sm:inline">Số dư:</span>
                <span className="font-headline-md text-headline-md font-bold text-[#c21a5b] whitespace-nowrap">
                  {formatMoney(balance)}
                  <span className="font-body-md text-body-md font-normal ml-0.5">đ</span>
                </span>
              </Link>
              
              {/* Avatar with Dropdown */}
              <div className="relative" ref={avatarMenuRef}>
                <button
                  onClick={() => setAvatarMenuOpen(prev => !prev)}
                  className="w-10 h-10 rounded-full border-2 border-outline-variant hover:border-[#c21a5b] transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shrink-0 overflow-hidden cursor-pointer select-none bg-surface-container-low p-0"
                >
                  <img src={getAvatarUrl(avatarSeed)} alt="Avatar" className="w-full h-full object-cover" />
                </button>

                {/* Dropdown Menu */}
                {avatarMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl overflow-hidden animate-fadeIn z-50">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-outline-variant/60 bg-surface-container-low flex items-center gap-3">
                      <img src={getAvatarUrl(avatarSeed)} alt="Avatar" className="w-9 h-9 rounded-full bg-surface-container shrink-0" />
                      <div className="min-w-0">
                        <p className="font-label-md text-label-md font-bold text-on-surface truncate">
                          {userProfile?.displayName || 'User'}
                        </p>
                        <p className="text-[11px] text-secondary truncate mt-0.5">
                          {currentUser?.email}
                        </p>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setAvatarMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md"
                      >
                        <span className="material-symbols-outlined text-[20px] text-on-surface-variant">person</span>
                        <span>Hồ sơ cá nhân</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 text-error hover:bg-error-container/10 transition-colors font-label-md text-label-md w-full text-left"
                      >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link to="/login" className="px-3 py-1.5 sm:px-4 sm:py-2 border border-outline-variant rounded-lg font-label-md text-label-md hover:bg-surface-container transition-all">
                Đăng nhập
              </Link>
              <Link to="/register" className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white rounded-lg font-label-md text-label-md hover:opacity-95 transition-all shadow-sm">
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
