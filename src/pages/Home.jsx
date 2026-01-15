import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Layout/Navbar';
import SEO from '../components/SEO';
import { 
  Smartphone, Music, Youtube, Zap, Shield, Clock,
  RefreshCw, Headphones, Users, Server, Check, ArrowRight,
  Star, ChevronRight, Gift
} from 'lucide-react';
import heroImage from '/hero-visual.png';
import logoImage from '/logo.png';
import './Home.css';

// Products Data - Simplified with images
const PRODUCTS = [
  {
    id: 'regfb',
    name: 'Tool Auto Reg/Very FB LD và Phone',
    tagline: '⭐ Best Seller',
    image: '/tool-screenshot.png',
    status: 'available',
    color: '#6366F1'
  },
  {
    id: 'clonetk',
    name: 'Clone TikTok Tool',
    tagline: '🔜 Sắp ra mắt',
    image: null,
    Icon: Music,
    status: 'coming_soon',
    color: '#EC4899'
  },
  {
    id: 'seoyt',
    name: 'YouTube SEO Tool',
    tagline: '🔜 Sắp ra mắt',
    image: null,
    Icon: Youtube,
    status: 'coming_soon',
    color: '#F97316'
  }
];

// Features Data
const FEATURES = [
  { Icon: Zap, title: 'Tốc Độ Cao', desc: 'Xử lý nhanh chóng, tiết kiệm thời gian', color: '#FFDE59' },
  { Icon: Shield, title: 'Bảo Mật HWID', desc: 'Bind máy tính, chống share key', color: '#22C55E' },
  { Icon: RefreshCw, title: 'Update Liên Tục', desc: 'Luôn tương thích với Facebook mới nhất', color: '#6366F1' },
  { Icon: Headphones, title: 'Hỗ Trợ 24/7', desc: 'Đội ngũ support chuyên nghiệp', color: '#EC4899' },
  { Icon: Server, title: 'Ổn Định 99%', desc: 'Chạy mượt, không lỗi, không lag', color: '#8B5CF6' },
  { Icon: Clock, title: 'Dùng Thử Free', desc: 'Đăng ký nhận ngay 1 ngày miễn phí', color: '#F97316' }
];

// Stats Data with icons
const STATS = [
  { value: '500+', label: 'Khách hàng', Icon: Users, color: '#6366F1' },
  { value: '99%', label: 'Uptime', Icon: Server, color: '#22C55E' },
  { value: '24/7', label: 'Hỗ trợ', Icon: Headphones, color: '#EC4899' },
  { value: '3+', label: 'Sản phẩm', Icon: Zap, color: '#FFDE59' }
];

// Testimonials Data - more reviews for slider
const TESTIMONIALS = [
  { name: 'Minh T.', content: 'Tool ổn định nhất mình từng dùng. Chạy 24/7 không lỗi!', rating: 5 },
  { name: 'Hoàng V.', content: 'Giá rẻ, tool ngon, support nhiệt tình. Recommend!', rating: 5 },
  { name: 'Đức H.', content: 'Reg acc tự động cực nhanh, chạy 100% không lỗi.', rating: 5 },
  { name: 'Long P.', content: 'Support trả lời nhanh, fix bug trong vài phút.', rating: 5 },
  { name: 'Tuấn A.', content: 'Tool giúp tiết kiệm hàng giờ làm việc mỗi ngày!', rating: 5 },
  { name: 'Quang M.', content: 'Giao diện đẹp, dễ sử dụng. Rất chuyên nghiệp!', rating: 5 },
  { name: 'Kiên T.', content: 'Đã dùng nhiều tool khác nhưng đây là tốt nhất!', rating: 5 },
  { name: 'Nam N.', content: 'Dịch vụ tốt, giá cả hợp lý. Rất hài lòng!', rating: 5 }
];

export default function Home() {
  const { currentUser } = useAuth();
  const productsRef = useRef(null);

  const scrollToProducts = (e) => {
    e.preventDefault();
    productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
  }

  return (
    <div className="home-page">
      <SEO 
        title="Trang chủ"
        description="PHP Tool - Cung cấp Tool Reg/Very Facebook tự động hàng loạt. Hỗ trợ Hotmail, SMS, Gmail. Giao diện dễ sử dụng, giá rẻ nhất thị trường."
        keywords="tool reg fb, tool very fb, reg facebook tự động, xác minh facebook, tool mmo, php tool"
      />
      <Navbar />

      {/* ========== HERO SECTION ========== */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-gradient"></div>
          <div className="hero-grid"></div>
        </div>
        
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <Zap size={14} />
              <span>Nền tảng Tools MMO #1 Việt Nam</span>
            </div>
            
            <h1 className="hero-title">
              <span className="hero-title-line">Công Cụ MMO</span>
              <span className="hero-title-gradient">Chuyên Nghiệp</span>
            </h1>
            
            <p className="hero-desc">
              Tự động hóa công việc, tăng năng suất gấp 10 lần. Tool ổn định, 
              update liên tục, hỗ trợ 24/7.
            </p>

            <div className="hero-cta">
              <a href="#products" onClick={scrollToProducts} className="btn-primary">
                <span>Xem sản phẩm</span>
                <ArrowRight size={20} />
              </a>
              {!currentUser && (
                <Link to="/register" className="btn-secondary">
                  <Gift size={20} />
                  <span>Dùng thử miễn phí</span>
                </Link>
              )}
            </div>

            <div className="hero-trust">
              <div className="hero-avatars">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="hero-avatar">
                    <Users size={16} />
                  </div>
                ))}
              </div>
              <div className="hero-trust-text">
                <strong>500+</strong> người dùng tin tưởng
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-card">
              <div className="hero-card-header">
                <div className="hero-card-dot"></div>
                <div className="hero-card-dot"></div>
                <div className="hero-card-dot"></div>
              </div>
              <img src={heroImage} alt="PHP Tool" className="hero-image" />
            </div>
          </div>
        </div>
      </section>

      {/* ========== STATS BAR ========== */}
      <section className="stats">
        <div className="stats-container">
          {STATS.map((stat, idx) => (
            <div key={idx} className="stat-item" style={{ '--accent': stat.color }}>
              <div className="stat-icon">
                <stat.Icon size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========== PRODUCTS GRID ========== */}
      <section className="products" id="products" ref={productsRef}>
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Sản phẩm</span>
            <h2>Tools Của Chúng Tôi</h2>
            <p>Click vào sản phẩm để xem chi tiết và mua</p>
          </div>

          <div className="products-grid">
            {PRODUCTS.map((product) => (
              <Link 
                key={product.id}
                to={product.status === 'available' ? `/buy/${product.id}` : '#'}
                className={`product-card ${product.status}`}
                style={{ '--accent': product.color }}
                onClick={(e) => product.status !== 'available' && e.preventDefault()}
              >
                <div className="product-visual">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="product-image" />
                  ) : (
                    <div className="product-icon-placeholder">
                      <product.Icon size={64} />
                    </div>
                  )}
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <span className="product-tagline">{product.tagline}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FEATURES GRID ========== */}
      <section className="features">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Tại sao chọn chúng tôi</span>
            <h2>Lợi Ích Vượt Trội</h2>
          </div>

          <div className="features-grid">
            {FEATURES.map((feature, idx) => (
              <div key={idx} className="feature-card" style={{ '--accent': feature.color }}>
                <div className="feature-icon">
                  <feature.Icon size={24} />
                </div>
                <h4>{feature.title}</h4>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS - Infinite Marquee ========== */}
      <section className="testimonials">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Đánh giá</span>
            <h2>Khách Hàng Nói Gì?</h2>
          </div>
        </div>

        <div className="testimonials-marquee">
          <div className="testimonials-track">
            {/* First set */}
            {TESTIMONIALS.map((t, idx) => (
              <div key={`a-${idx}`} className="testimonial-card">
                <div className="testimonial-stars">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={14} fill="#FFDE59" color="#FFDE59" />
                  ))}
                </div>
                <p className="testimonial-content">"{t.content}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">
                    <Users size={16} />
                  </div>
                  <span>{t.name}</span>
                </div>
              </div>
            ))}
            {/* Duplicate set for seamless loop */}
            {TESTIMONIALS.map((t, idx) => (
              <div key={`b-${idx}`} className="testimonial-card">
                <div className="testimonial-stars">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={14} fill="#FFDE59" color="#FFDE59" />
                  ))}
                </div>
                <p className="testimonial-content">"{t.content}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">
                    <Users size={16} />
                  </div>
                  <span>{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="cta">
        <div className="section-container">
          <div className="cta-card">
            <div className="cta-content">
              <h2>Bắt đầu miễn phí ngay hôm nay!</h2>
              <p>Đăng ký tài khoản và nhận 1 ngày dùng thử hoàn toàn miễn phí.</p>
            </div>
            {currentUser ? (
              <Link to="/dashboard" className="cta-btn">
                Vào Dashboard <ArrowRight size={20} />
              </Link>
            ) : (
              <Link to="/register" className="cta-btn">
                Đăng ký miễn phí <ArrowRight size={20} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <img src={logoImage} alt="PHP Tool" className="footer-logo" />
            <span>PHP Tool</span>
          </div>
          <div className="footer-links">
            <a href="https://t.me/phptoolvip" target="_blank" rel="noopener noreferrer">Telegram</a>
            <Link to="/guide">Hướng dẫn</Link>
          </div>
          <p className="footer-copy">© 2024 PHP Tool. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
