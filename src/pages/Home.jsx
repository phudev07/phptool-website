import { useState, useEffect } from'react';
import { Link, useLocation } from'react-router-dom';
import Navbar from'../components/Layout/Navbar';
import { getProducts } from'../services/productsService';

export default function Home() {
 const location = useLocation();
 const [products, setProducts] = useState([]);
 const [filterType, setFilterType] = useState('all');
 const [loading, setLoading] = useState(true);

 // Load products from Firestore
 useEffect(() => {
 async function loadData() {
 setLoading(true);
 const data = await getProducts();
 setProducts(data);
 setLoading(false);
 }
 loadData();
 }, []);

  // Set SEO tags
  useEffect(() => {
    document.title = 'PHP-TOOL VIP | Cửa Hàng Phần Mềm Tự Động Hóa MMO';
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 'Cửa hàng cung cấp các tool MMO chất lượng cao, Auto Reg/Very Facebook LDPlayer & Phone, nuôi tài khoản tự động, bypass checkpoint.');
  }, []);

 const [searchQuery, setSearchQuery] = useState('');

 // Read URL query parameters for type and search
 useEffect(() => {
 const params = new URLSearchParams(location.search);
 
 const type = params.get('type');
 if (type) {
 setFilterType(type);
 } else {
 setFilterType('all');
 }

 const search = params.get('search') ||'';
 setSearchQuery(search);
 }, [location]);

  // Filter products based on active tab and search query
  const filteredProducts = products.filter(product => {
    if (product.hidden) return false;

    const minPrice = getMinPrice(product.plans);
    const isProductFree = product.type === 'free' || minPrice === 0;

    let matchesTab = false;
    if (filterType === 'all') {
      matchesTab = true;
    } else if (filterType === 'free') {
      matchesTab = isProductFree;
    } else {
      matchesTab = product.type === filterType;
    }

    const matchesSearch = !searchQuery || 
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tagline?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

 function formatMoney(amount) {
 if (amount === 0 || !amount) return'Miễn phí';
 return new Intl.NumberFormat('vi-VN').format(amount) +'đ';
 }

 function getMinPrice(plans) {
 if (!plans || Object.keys(plans).length === 0) return 0;
 const prices = Object.values(plans).map(p => p.price);
 return Math.min(...prices);
 }

 function renderBadge(type) {
  let classes = "";
  let label = "";
  
  switch (type) {
    case 'php-tool':
      classes = "bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white font-black shadow-md";
      label = "PHP-TOOL";
      break;
    case 'crack':
      classes = "bg-[#d32f2f] text-white font-black shadow-md";
      label = "UNLOCK";
      break;
    case 'free':
      classes = "bg-emerald-600 text-white font-black shadow-md";
      label = "FREE";
      break;
    default:
      classes = "bg-secondary text-on-secondary font-black shadow-md";
      label = "TOOL";
  }
  
  return (
    <span className={`absolute -top-px -left-px z-20 inline-flex items-center px-3 py-1 rounded-br-lg text-[11px] font-bold tracking-wider uppercase ${classes}`}>
      {label}
    </span>
  );
  }

 return (
 <div className="min-h-screen bg-background text-on-background">
 <Navbar />

 <main className="md:ml-sidebar-width pt-header-height min-h-screen">
 <div className="max-w-container-max mx-auto p-4 md:p-gutter pb-20">
 
 {/* Header */}
 <div className="mb-8">
 <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Cửa hàng ứng dụng</h2>
 <p className="font-body-md text-body-md text-secondary">Khám phá và đăng ký các công cụ hỗ trợ tự động hóa.</p>
 </div>

 {/* Tabs Filter */}
 <div className="flex items-center gap-2 mb-8 border-b border-outline-variant pb-px overflow-x-auto">
 <button 
 className={`px-4 py-2 border-b-2 font-label-md text-label-md transition-colors whitespace-nowrap ${filterType ==='all' ?'border-[#c21a5b] text-[#c21a5b]' :'border-transparent text-secondary hover:text-[#c21a5b]'}`}
 onClick={() => setFilterType('all')}
 >
 Tất cả
 </button>
 <button 
 className={`px-4 py-2 border-b-2 font-label-md text-label-md transition-colors whitespace-nowrap ${filterType ==='php-tool' ?'border-[#c21a5b] text-[#c21a5b]' :'border-transparent text-secondary hover:text-[#c21a5b]'}`}
 onClick={() => setFilterType('php-tool')}
 >
 Tool của PHP-TOOL
 </button>
  <button 
  className={`px-4 py-2 border-b-2 font-label-md text-label-md transition-colors whitespace-nowrap ${filterType ==='crack' ?'border-[#c21a5b] text-[#c21a5b]' :'border-transparent text-secondary hover:text-[#c21a5b]'}`}
  onClick={() => setFilterType('crack')}
  >
  Tool Mở Khóa
  </button>
 <button 
 className={`px-4 py-2 border-b-2 font-label-md text-label-md transition-colors whitespace-nowrap ${filterType ==='free' ?'border-[#c21a5b] text-[#c21a5b]' :'border-transparent text-secondary hover:text-[#c21a5b]'}`}
 onClick={() => setFilterType('free')}
 >
 Tool Free
 </button>
 </div>

 {loading ? (
 <div className="flex flex-col items-center justify-center py-20">
 <div className="w-10 h-10 border-4 border-[#c21a5b] border-t-transparent rounded-full animate-spin"></div>
 <p className="text-secondary mt-4">Đang tải danh sách công cụ...</p>
 </div>
 ) : (
 /* Grid of Cards */
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
 {filteredProducts.length > 0 ? (
 filteredProducts.map(product => {
 const minPrice = getMinPrice(product.plans);
 const isFree = product.type ==='free' || minPrice === 0;

 return (
 <div key={product.id} className="bg-surface-container-lowest border border-outline-variant rounded-tr-xl rounded-b-xl flex flex-col hover:border-[#c21a5b] hover:shadow-sm transition-all duration-200 group relative">
 
  {/* Badge - flush top-left corner */}
  {renderBadge(product.type)}

 {/* Image block */}
 <div className="h-48 bg-surface-container relative overflow-hidden border-b border-outline-variant/50 rounded-tr-xl">
 {product.image ? (
 <img 
 alt={product.name} 
 className="w-full h-full object-fill" 
 src={product.image}
 />
 ) : (
 <div className="w-full h-full bg-gradient-to-br from-secondary-container to-surface-container flex items-center justify-center overflow-hidden">
 <span className="material-symbols-outlined text-[64px] text-[#c21a5b]/50">
 {product.icon ||'terminal'}
 </span>
 </div>
 )}
 </div>

 {/* Content block */}
 <div className="p-5 flex flex-col flex-1">
 <h3 className="font-headline-md text-headline-md text-on-surface mb-1 group-hover:text-[#c21a5b] transition-colors">
 {product.name}
 </h3>
 <p className="font-body-md text-body-md text-secondary line-clamp-2 mb-4">
 {product.description || product.tagline}
 </p>
 
 {/* Footer block */}
 <div className="mt-auto pt-4 border-t border-outline-variant/50 flex items-center justify-between">
 <div className="flex flex-col justify-center">
 {isFree ? (
 <span className="font-headline-md text-headline-md text-[#c21a5b] font-bold">
 Miễn phí
 </span>
 ) : (
 <span className="font-headline-md text-headline-md text-[#c21a5b] font-bold">
 {formatMoney(minPrice)}
 </span>
 )}
 </div>
 <Link 
 to={`/buy/${product.id}`} 
 className="relative overflow-hidden bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white hover:opacity-95 font-label-md text-label-md px-6 py-3.5 rounded-xl active:scale-[0.98] transition-all duration-300 text-center font-bold shadow-md group/btn flex items-center justify-center z-10"
 >
 <span className="relative z-10">Xem ngay</span>
 {/* Gloss/Shine Sweep Effect */}
 <span className="absolute inset-0 w-[60%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 -translate-x-[150%] group-hover/btn:translate-x-[200%] transition-transform duration-1000 ease-out z-0"></span>
 </Link>
 </div>
 </div>

 </div>
 );
 })
 ) : (
 <div className="col-span-full text-center py-12 bg-surface rounded-xl border border-outline-variant border-dashed">
 <span className="material-symbols-outlined text-[48px] text-secondary mb-2">
 {searchQuery ?'search_off' :'inventory_2'}
 </span>
 <p className="text-secondary font-body-lg text-body-lg">
 {searchQuery ? (
 <>Không tìm thấy công cụ phù hợp với"{searchQuery}"</>
 ) : (
 <>Chưa có sản phẩm nào trong danh mục này.</>
 )}
 </p>
 </div>
 )}
 </div>
 )}

 </div>
 </main>
 </div>
 );
}
