import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Layout/Navbar';
import SEO from '../components/SEO';
import { ArrowLeft } from 'lucide-react';
import './Guide.css';

// Guide content per product - extensible for future products
const PRODUCT_GUIDES = {
  'regfb': {
    name: 'Tool Auto Reg/Very FB LD và Phone',
    description: 'Hướng dẫn chi tiết cách sử dụng Tool Reg/Very Facebook. Các bước cài đặt, kích hoạt license, cấu hình Option và Setting.'
  },
  'clonetk': {
    name: 'Clone TikTok Tool',
    description: 'Hướng dẫn sử dụng Clone TikTok Tool. (Sắp ra mắt)'
  },
  'seoyt': {
    name: 'YouTube SEO Tool', 
    description: 'Hướng dẫn sử dụng YouTube SEO Tool. (Sắp ra mắt)'
  }
};

export default function Guide() {
  const { productId } = useParams();
  const currentProduct = PRODUCT_GUIDES[productId] || PRODUCT_GUIDES['regfb'];
  const actualProductId = productId || 'regfb';

  // For coming soon products, show a simple message
  if (actualProductId !== 'regfb') {
    return (
      <div className="guide-page">
        <SEO 
          title={`Hướng dẫn ${currentProduct.name}`}
          description={currentProduct.description}
        />
        <Navbar />
        <div className="guide-container">
          <Link to={`/buy/${actualProductId}`} className="back-btn">
            <ArrowLeft size={20} /> Quay lại sản phẩm
          </Link>
          <div className="guide-header">
            <h1>📖 Hướng Dẫn Sử Dụng</h1>
            <p>{currentProduct.name}</p>
          </div>
          <div className="coming-soon-guide">
            <p>🔜 Hướng dẫn cho sản phẩm này đang được cập nhật...</p>
            <p>Vui lòng quay lại sau hoặc liên hệ hỗ trợ qua Telegram.</p>
            <a href="https://t.me/phu_dev" target="_blank" rel="noopener noreferrer" className="support-link">
              💬 Liên hệ Telegram
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Full guide for regfb
  return (
    <div className="guide-page">
      <SEO 
        title="Hướng dẫn sử dụng"
        description="Hướng dẫn chi tiết cách sử dụng Tool Reg/Very Facebook. Các bước cài đặt, kích hoạt license, cấu hình Option và Setting."
        keywords="hướng dẫn tool reg fb, cách dùng tool very fb, tutorial php tool, cài đặt tool facebook"
      />
      <Navbar />

      <div className="guide-container">
        <Link to={`/buy/${actualProductId}`} className="back-btn">
          <ArrowLeft size={20} /> Quay lại sản phẩm
        </Link>
        <div className="guide-header">
          <h1>📖 Hướng Dẫn Sử Dụng</h1>
          <p>{currentProduct.name}</p>
        </div>

        {/* Table of Contents */}
        <div className="guide-toc">
          <h2>📑 Mục lục</h2>
          <ul>
            <li><a href="#intro">1. Giới thiệu chung</a></li>
            <li><a href="#features">2. Các chức năng chính</a></li>
            <li><a href="#requirements">3. Điều kiện sử dụng tool</a></li>
            <li><a href="#steps">4. Các bước chạy tool</a></li>
            <li><a href="#options">5. Cài đặt Option</a></li>
            <li><a href="#settings">6. Cài đặt Setting</a></li>
            <li><a href="#support">7. Liên hệ hỗ trợ</a></li>
          </ul>
        </div>

        {/* Content Sections */}
        <div className="guide-content">
          
          <section id="intro" className="guide-section">
            <h2>1. Giới thiệu chung</h2>
            <p>
              Tool automatic Facebook account register and verification by PHP-TOOL giúp việc 
              tạo tài khoản hay xác minh FB hàng loạt của mọi người trở nên dễ dàng và nhanh chóng thuận tiện.
            </p>
            <p>
              Giao diện dễ dàng thao tác sử dụng. Nhiều chức năng cho mọi người lựa chọn và sử dụng theo nhu cầu và mục đích.
            </p>
            <p>
              Giá thuê tool thì rẻ nhất so với thị trường và quan trọng là sẽ hỗ trợ mọi người trong quá trình sử dụng, 
              lắng nghe sự góp ý để tool hoàn thiện hơn.
            </p>
          </section>

          <section id="features" className="guide-section">
            <h2>2. Các chức năng chính</h2>
            <div className="features-table">
              <div className="feature-group">
                <h4>🔧 REG (Tạo tài khoản)</h4>
                <ul>
                  <li><strong>FB Katana:</strong> novery, hotmail, sms, gmail, virtual email</li>
                  <li><strong>FB Lite:</strong> novery, hotmail, sms, gmail, virtual email</li>
                </ul>
              </div>
              <div className="feature-group">
                <h4>✅ VERY (Xác minh)</h4>
                <ul>
                  <li><strong>FB Katana:</strong> hotmail, sms, gmail, virtual email</li>
                  <li><strong>FB Lite:</strong> hotmail, sms, gmail, virtual email</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="requirements" className="guide-section">
            <h2>3. Điều kiện sử dụng tool</h2>
            <div className="requirements-list">
              <div className="requirement-item">
                <span className="req-icon">🎁</span>
                <span>Được dùng thử 1 ngày cho người mới</span>
              </div>
              <div className="requirement-item">
                <span className="req-icon">💰</span>
                <span>Cần thuê tool tháng (200k) hoặc vĩnh viễn (600k) để sử dụng</span>
              </div>
              <div className="requirement-item">
                <span className="req-icon">💻</span>
                <span>Tool chạy được trên Windows, không thể chạy trên VPS</span>
              </div>
              <div className="requirement-item">
                <span className="req-icon">📱</span>
                <span>Để chạy được tool cần có smartphone root hoặc LDPlayer</span>
              </div>
              <div className="requirement-item">
                <span className="req-icon">⚙️</span>
                <span>Không có cấu hình máy tối thiểu, nếu chạy LD máy yếu chạy ít Tab</span>
              </div>
            </div>
          </section>

          <section id="steps" className="guide-section">
            <h2>4. Các bước chạy tool</h2>
            <div className="step-list">
              <div className="step-item">
                <span className="step-number">1</span>
                <div className="step-content">
                  <h4>Giải nén file</h4>
                  <p>Sau khi tải file rar tool về, ấn vào "Extract All" để giải nén</p>
                </div>
              </div>
              <div className="step-item">
                <span className="step-number">2</span>
                <div className="step-content">
                  <h4>Cài đặt APK (nếu dùng điện thoại)</h4>
                  <p>Ấn vào folder APK để tiến hành cài tất cả các app cần thiết. Nếu bạn chạy LDPlayer thì bỏ qua bước này.</p>
                </div>
              </div>
              <div className="step-item">
                <span className="step-number">3</span>
                <div className="step-content">
                  <h4>Mở Tool</h4>
                  <p>Ấn vào file đuôi .exe để mở tool</p>
                </div>
              </div>
              <div className="step-item">
                <span className="step-number">4</span>
                <div className="step-content">
                  <h4>Kích hoạt License</h4>
                  <p>Ấn sao chép mã HWID, sau đó vào website để kích hoạt license</p>
                </div>
              </div>
              <div className="step-item">
                <span className="step-number">5</span>
                <div className="step-content">
                  <h4>Load thiết bị</h4>
                  <p>Sau khi vào tool, chuyển sang tab Device để load thiết bị muốn chạy. Có thể tick từng thiết bị, bôi đen click chuột phải ấn chọn, hoặc chọn tất cả.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="options" className="guide-section">
            <h2>5. Cài đặt Option</h2>
            
            <div className="option-group">
              <h4>📧 Hotmail</h4>
              <p>Có 3 site: <code>unlimitmail</code>, <code>dongvanfb</code>, <code>shopvia1s</code></p>
              <p className="note">dongvanfb và unlimitmail là hotmail new, còn shopvia là hotmail trust</p>
              <p>Dán key vào ô giữa, ấn Check để kiểm tra số dư tài khoản.</p>
              <p className="tip">💡 <strong>Mẹo:</strong> Có thể thay đổi loại email mua bằng cách sửa ID trong file <code>data/[site].txt</code>. VD: Sửa <code>data/dongvanfb.txt</code> nhập số <code>2</code> sẽ mua Outlook thay vì Hotmail.</p>
            </div>

            <div className="option-group">
              <h4>📱 SMS</h4>
              <p>Có 4 site: <code>ironsim</code>, <code>funotp</code>, <code>otptextnow</code>, <code>viotp</code></p>
              <p>Dán key vào ô giữa, ấn Check để kiểm tra số dư tài khoản.</p>
            </div>

            <div className="option-group">
              <h4>📨 Gmail</h4>
              <p>Có 4 site: <code>shopmailmmo</code>, <code>shopgmail999</code>, <code>gmail66</code>, <code>clonenha</code></p>
              <p>Dán key vào ô giữa, ấn Check để kiểm tra số dư tài khoản.</p>
            </div>

            <div className="option-group">
              <h4>✉️ Virtual Email</h4>
              <p>Có 7 site: <code>10p</code>, <code>tm</code>, <code>temp</code>, <code>saki</code>, <code>fake</code>, <code>generator</code>, <code>drop</code></p>
            </div>
          </section>

          <section id="settings" className="guide-section">
            <h2>6. Cài đặt Setting</h2>
            
            <div className="setting-group">
              <h4>🔧 Cài đặt chung</h4>
              <ul>
                <li><strong>Reg/Very:</strong> Chọn reg hoặc very (chọn very không thể chọn novery ở option)</li>
                <li><strong>App:</strong> Chọn app Katana hoặc Lite</li>
                <li><strong>Sex:</strong> Chọn male, female hoặc random</li>
                <li><strong>Language:</strong> Chọn VN (cả trong điện thoại/LD cũng phải để tiếng Việt)</li>
              </ul>
            </div>

            <div className="setting-group">
              <h4>📝 Name & Password</h4>
              <ul>
                <li><strong>Name:</strong> Có last và first để tự custom, hoặc vào folder data thay đổi</li>
                <li><strong>Password:</strong> Để random (ngẫu nhiên) hoặc tự đặt mật khẩu riêng</li>
                <li><strong>Bait:</strong> Mồi số điện thoại, có thể bỏ đầu số mong muốn vào file prefix number</li>
              </ul>
            </div>

            <div className="setting-group">
              <h4>🌐 Change IP</h4>
              <p>Có 4 lựa chọn: <strong>4G</strong>, <strong>Wifi</strong>, <strong>Proxy</strong>, <strong>VPN</strong></p>
              <p>Riêng Proxy xoay: Vào app Super Proxy, ấn dấu cộng để thêm proxy khi mua. Bật phần tự động đổi IP, nhập các thông số và ấn Start.</p>
              <p>Proxy list: Nhập danh sách proxy vào <code>data/proxy.txt</code> với định dạng <code>ip:port:user:pass</code></p>
            </div>

            <div className="setting-group">
              <h4>⏱️ Setting Time</h4>
              <ul>
                <li><strong>Time action:</strong> Thời gian hành động (muốn chậm/nhanh)</li>
                <li><strong>Time wait otp:</strong> Thời gian chờ lấy OTP</li>
                <li><strong>Time buy:</strong> Thời gian chờ mua tài nguyên</li>
              </ul>
            </div>

            <div className="setting-group">
              <h4>📁 File Input/Output</h4>
              <ul>
                <li><strong>File account:</strong> Nhập tk|mk để chạy very</li>
                <li><strong>File live:</strong> Tài khoản reg/very live</li>
                <li><strong>File novery:</strong> Tài khoản chưa xác minh</li>
                <li><strong>File die:</strong> Tài khoản die</li>
              </ul>
            </div>
          </section>

          <section id="support" className="guide-section support-section">
            <h2>7. Liên hệ hỗ trợ</h2>
            <p className="support-note">
              Nếu bạn gặp bất kỳ vấn đề nào trong quá trình sử dụng hoặc có ý tưởng đóng góp,<br/>
              đừng ngần ngại liên hệ với mình nhé! 💪
            </p>
            <div className="support-cards centered">
              <a href="https://t.me/phu_dev" target="_blank" rel="noopener noreferrer" className="support-card">
                <span className="support-icon">💬</span>
                <span>Telegram</span>
              </a>
            </div>
            <p className="support-footer">Chúc mọi người sử dụng tool vui vẻ và hiệu quả! 🎉</p>
          </section>

        </div>
      </div>
    </div>
  );
}
