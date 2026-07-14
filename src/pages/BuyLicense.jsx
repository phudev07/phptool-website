import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { collection, serverTimestamp, doc, increment, writeBatch, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAntiSpam } from '../hooks/useAntiSpam';
import Navbar from '../components/Layout/Navbar';
import { getProductById } from '../services/productsService';

export default function BuyLicense() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const { productId } = useParams();
  
  const [product, setProduct] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasLicense, setHasLicense] = useState(false);

  useEffect(() => {
    async function checkExistingLicense() {
      if (!currentUser || !productId) {
        setHasLicense(false);
        return;
      }
      try {
        // 1. Check licenses collection
        const q = query(
          collection(db, 'licenses'),
          where('userId', '==', currentUser.uid),
          where('productId', '==', productId),
          where('status', '==', 'active')
        );
        const snap = await getDocs(q);
        let exists = !snap.empty;

        // 2. Check active_tools collection (for tools without HWID)
        if (!exists) {
          const activeToolRef = doc(db, 'users', currentUser.uid, 'active_tools', productId);
          const activeToolSnap = await getDoc(activeToolRef);
          if (activeToolSnap.exists() && activeToolSnap.data().active === true) {
            exists = true;
          }
        }

        setHasLicense(exists);
      } catch (error) {
        console.error("Error checking existing license:", error);
      }
    }
    checkExistingLicense();
  }, [currentUser, productId]);

  const { validateSubmission, recordAttempt } = useAntiSpam({
    maxAttempts: 3,
    windowMs: 3600000,
    cooldownMs: 3600000
  });

  // Fetch product from Firestore
  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      const targetId = productId || 'regfb';
      const data = await getProductById(targetId);
      if (data) {
        setProduct(data);
        if (data.plans && Object.keys(data.plans).length > 0) {
          // Select default plan (usually monthly or the first one)
          const keys = Object.keys(data.plans);
          const defaultKey = keys.find(k => k === 'monthly') || keys[0];
          setSelectedPlan(defaultKey);
        }
      }
      setLoading(false);
    }
    loadProduct();
  }, [productId]);

  // Dynamic SEO page title and meta description
  useEffect(() => {
    if (product) {
      document.title = `${product.name} - ${product.tagline} | PHP-TOOL VIP`;
      
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', `${product.description || product.tagline || 'Mua bản quyền phần mềm tự động hóa siêu tốc.'}`);
    } else {
      document.title = 'Mua Bản Quyền Tool | PHP-TOOL VIP';
    }
  }, [product]);

  const plan = product?.plans?.[selectedPlan];
  const balance = userProfile?.balance || 0;

  function formatMoney(amount) {
    if (amount === 0 || !amount) return 'Miễn phí';
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  }

  function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (i < 3) key += '-';
    }
    return key;
  }

  function getExpiryDate(days) {
    if (days <= 0 || days > 30000) return null; // Lifetime
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  async function handlePurchase() {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (!plan || !product) return;

    if (balance < plan.price) {
      alert('Số dư tài khoản không đủ! Vui lòng nạp thêm tiền.');
      navigate('/wallet');
      return;
    }
    
    const spamCheck = validateSubmission();
    if (!spamCheck.valid) {
      alert(spamCheck.error);
      return;
    }
    recordAttempt();

    setPurchasing(true);

    try {
      // Check if user already has an existing license for this product
      let existingLicense = null;
      if (product.requireHwid !== false) {
        const q = query(
          collection(db, 'licenses'),
          where('userId', '==', currentUser.uid),
          where('productId', '==', product.id)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          // Find the one with furthest expiresAt
          let docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          docs.sort((a, b) => {
            const expA = a.expiresAt?.toDate ? a.expiresAt.toDate() : (a.expiresAt ? new Date(a.expiresAt) : new Date(0));
            const expB = b.expiresAt?.toDate ? b.expiresAt.toDate() : (b.expiresAt ? new Date(b.expiresAt) : new Date(0));
            return expB - expA;
          });
          existingLicense = docs[0];
        }
      }

      let newExpiryDate = null;
      const daysToAdd = plan.days;
      const batch = writeBatch(db);
      let licenseRef = null;

      if (product.requireHwid !== false) {
        if (existingLicense) {
          licenseRef = doc(db, 'licenses', existingLicense.id);
          const currentExpiry = existingLicense.expiresAt?.toDate ? existingLicense.expiresAt.toDate() : (existingLicense.expiresAt ? new Date(existingLicense.expiresAt) : null);
          
          if (selectedPlan === 'lifetime' || existingLicense.plan === 'lifetime') {
            newExpiryDate = null; // Keep/make lifetime
          } else if (currentExpiry) {
            const now = new Date();
            if (currentExpiry > now) {
              // Active: extend from the current expiry date
              newExpiryDate = new Date(currentExpiry);
              newExpiryDate.setDate(newExpiryDate.getDate() + daysToAdd);
              newExpiryDate.setHours(23, 59, 59, 999);
            } else {
              // Expired: start fresh from today
              newExpiryDate = new Date();
              newExpiryDate.setDate(newExpiryDate.getDate() + daysToAdd);
              newExpiryDate.setHours(23, 59, 59, 999);
            }
          } else {
            // No expiry set previously: start fresh
            newExpiryDate = new Date();
            newExpiryDate.setDate(newExpiryDate.getDate() + daysToAdd);
            newExpiryDate.setHours(23, 59, 59, 999);
          }

          batch.update(licenseRef, {
            plan: selectedPlan,
            planName: plan.name,
            price: plan.price,
            status: 'active',
            expiresAt: newExpiryDate,
            updatedAt: serverTimestamp()
          });
        } else {
          // Create new license doc
          const licenseKey = generateLicenseKey();
          if (selectedPlan === 'lifetime') {
            newExpiryDate = null;
          } else {
            newExpiryDate = getExpiryDate(plan.days);
            if (newExpiryDate) {
              newExpiryDate.setHours(23, 59, 59, 999);
            }
          }

          licenseRef = doc(collection(db, 'licenses'));
          batch.set(licenseRef, {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            productId: product.id,
            productName: product.name,
            licenseKey: licenseKey,
            plan: selectedPlan,
            planName: plan.name,
            price: plan.price,
            status: 'active',
            hwid: null,
            hwidHistory: [],
            expiresAt: newExpiryDate,
            createdAt: serverTimestamp()
          });
        }
      }

      // 2. Update user balance
      if (plan.price > 0) {
        const userRef = doc(db, 'users', currentUser.uid);
        batch.update(userRef, {
          balance: increment(-plan.price)
        });
      }

      // 3. Create transaction record (even for free purchases)
      const transactionRef = doc(collection(db, 'transactions'));
      batch.set(transactionRef, {
        userId: currentUser.uid,
        type: 'license_purchase',
        amount: -plan.price,
        productId: product.id,
        description: `Mua ${product.name} - ${plan.name}`,
        createdAt: serverTimestamp()
      });

      // 4. Update active tools for download link security check
      const activeToolRef = doc(db, 'users', currentUser.uid, 'active_tools', product.id);
      if (product.requireHwid !== false) {
        batch.set(activeToolRef, { 
          active: true, 
          licenseId: licenseRef.id, 
          updatedAt: serverTimestamp() 
        });
      } else {
        batch.set(activeToolRef, { 
          active: true, 
          plan: selectedPlan, 
          updatedAt: serverTimestamp() 
        });
      }

      await batch.commit();

      // Immediately redirect user to management tab
      navigate('/my-licenses');
    } catch (error) {
      console.error('Purchase transaction failed:', error);
      alert('Giao dịch thất bại: ' + error.message);
    }
    setPurchasing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-on-background">
        <Navbar />
        <main className="md:ml-sidebar-width pt-header-height min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-[#c21a5b] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-secondary">Đang tải cấu hình sản phẩm...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background text-on-background">
        <Navbar />
        <main className="md:ml-sidebar-width pt-header-height min-h-screen p-4 md:p-gutter flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl text-error mb-2">error</span>
            <h2 className="text-xl font-bold">Không tìm thấy sản phẩm</h2>
            <Link to="/" className="text-[#c21a5b] hover:underline mt-2 inline-block">Quay lại cửa hàng</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Navbar />

      <main className="md:ml-sidebar-width pt-header-height min-h-screen">
        <div className="max-w-container-max mx-auto p-4 md:p-gutter pb-20">
          
          {/* Breadcrumb / Back Link */}
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center gap-1.5 text-secondary hover:text-[#c21a5b] transition-colors font-label-md text-label-md">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Quay lại cửa hàng
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Product Info */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                
                {/* Header */}
                <div className="flex items-center gap-4 pb-6 border-b border-outline-variant/60 mb-6">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-outline-variant bg-surface-container">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-fill" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl">
                          {product.icon || 'terminal'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                      {product.name}
                    </h2>
                    <p className="text-secondary mt-1">{product.tagline}</p>
                  </div>
                </div>

                {/* Tool Image */}
                {product.image && (
                  <div className="h-80 md:h-[480px] bg-surface-container rounded-xl overflow-hidden border border-outline-variant/50 mb-6">
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-fill"
                    />
                  </div>
                )}

                {/* Description */}
                <div className="space-y-4">
                  <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-wider">Mô Tả Sản Phẩm</h3>
                  <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                    {product.description}
                  </p>
                </div>

                {/* Features list */}
                {product.features && product.features.length > 0 && (
                  <div className="mt-8">
                    <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-4">Tính năng nổi bật</h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {product.features.map((feat, index) => (
                        <li key={index} className="flex items-start gap-2 text-on-surface-variant">
                          <span className="material-symbols-outlined text-emerald-600 shrink-0 text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                          <span className="font-body-md text-body-md">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Video Tutorial */}
                {product.videoTutorial && (
                  <div className="mt-8 pt-6 border-t border-outline-variant/60">
                    <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-4">Video Hướng Dẫn Sử Dụng</h3>
                    <div className="aspect-video w-full rounded-xl overflow-hidden border border-outline-variant bg-surface-container shadow-inner">
                      <iframe 
                        src={product.videoTutorial} 
                        title="YouTube video player" 
                        className="w-full h-full border-none"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Right Column: Checkout Card */}
            <div className="lg:col-span-4">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm sticky top-[96px]">
                <h3 className="font-headline-md text-headline-md text-on-surface font-bold mb-6">Đăng ký bản quyền</h3>
                
                {/* Plans Selection */}
                {product.plans && Object.keys(product.plans).length > 0 ? (
                  <div className="space-y-4 mb-6">
                    <label className="block font-label-md text-label-md text-secondary uppercase tracking-wider">Chọn Gói Sử Dụng</label>
                    <div className="flex flex-col gap-2">
                      {Object.entries(product.plans).map(([key, p]) => (
                        <button
                          key={key}
                          type="button"
                          className={`w-full text-left p-4 rounded-lg border transition-all flex justify-between items-center ${selectedPlan === key ? 'border-[#c21a5b] bg-gradient-to-r from-[#c21a5b]/10 to-[#571477]/10' : 'border-outline-variant hover:bg-surface-container/50'}`}
                          onClick={() => setSelectedPlan(key)}
                        >
                          <div>
                            <div className={`font-label-md text-label-md font-bold ${selectedPlan === key ? 'text-[#c21a5b]' : 'text-on-surface'}`}>{p.name}</div>
                            {p.description && (
                              <div className="text-secondary text-xs mt-1 leading-normal font-normal">
                                {p.description}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-headline-md text-headline-md font-bold text-[#c21a5b]">
                              {formatMoney(p.price)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-error mb-4">Tool này hiện chưa có bảng giá!</p>
                )}

                {/* User Balance */}
                <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 mb-6 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-secondary font-body-md text-body-md">Số dư khả dụng:</span>
                    <span className="font-bold text-on-surface">{formatMoney(balance)}</span>
                  </div>
                  {plan && (
                    <div className="flex justify-between items-center pt-2 border-t border-outline-variant/60">
                      <span className="text-secondary font-body-md text-body-md">Thành tiền:</span>
                      <span className="font-bold text-[#c21a5b] text-lg">{formatMoney(plan.price)}</span>
                    </div>
                  )}
                </div>

                {product?.requireHwid === false && hasLicense ? (
                  <Link
                    to={`/my-licenses?productId=${product.id}`}
                    className="w-full bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white font-label-md text-label-md py-3 rounded-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 font-bold shadow-sm text-center"
                  >
                    <span className="material-symbols-outlined">settings_suggest</span>
                    Quản lý Tool
                  </Link>
                ) : plan ? (
                  !currentUser ? (
                    <Link
                      to="/login"
                      className="w-full bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white font-label-md text-label-md py-3 rounded-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 font-bold shadow-sm text-center"
                    >
                      <span className="material-symbols-outlined">login</span>
                      Đăng nhập để đăng ký
                    </Link>
                  ) : balance >= plan.price ? (
                    <button
                      type="button"
                      disabled={purchasing}
                      onClick={handlePurchase}
                      className="w-full bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white font-label-md text-label-md py-3 rounded-lg hover:bg-on-primary-fixed-variant transition-colors flex items-center justify-center gap-2 font-bold shadow-sm"
                    >
                      {purchasing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                          Đang xử lý giao dịch...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">shopping_cart</span>
                          Thanh Toán Ngay
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-error text-center text-xs font-medium">Số dư khả dụng không đủ để thanh toán gói này.</div>
                      <Link
                        to="/wallet"
                        className="w-full bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white font-label-md text-label-md py-3 rounded-lg hover:bg-on-primary-fixed-variant transition-colors flex items-center justify-center gap-2 font-bold shadow-sm text-center"
                      >
                        <span className="material-symbols-outlined">account_balance_wallet</span>
                        Nạp tiền ngay
                      </Link>
                    </div>
                  )
                ) : null}

              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
