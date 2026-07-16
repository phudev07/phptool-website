import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Navbar from '../../components/Layout/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { getProducts, updateProduct, addProduct, deleteProduct } from '../../services/productsService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function AdminSettings() {
 const { isAdmin, loading: authLoading } = useAuth();
 const [products, setProducts] = useState([]);
 const [loading, setLoading] = useState(true);
 
 // Accordion expanded state by product ID
 const [expandedId, setExpandedId] = useState('');
 
  // State for editing tool fields
  const [editFields, setEditFields] = useState({
    version: '',
    downloadUrl: '',
    changelog: '',
    name: '',
    tagline: '',
    description: '',
    image: '',
    dailyPrice: '',
    dailyDays: '1',
    dailyName: 'Gói Theo Ngày',
    dailyDescription: 'Phù hợp trải nghiệm nhanh',
    monthlyPrice: '',
    monthlyDays: '30',
    monthlyName: 'Gói Tháng',
    monthlyDescription: 'Khuyên dùng, tiết kiệm nhất',
    yearlyPrice: '',
    yearlyDays: '365',
    yearlyName: 'Gói Năm',
    yearlyDescription: 'Tiết kiệm lâu dài',
    lifetimePrice: '',
    lifetimeDays: '36500',
    lifetimeName: 'Gói Vĩnh Viễn',
    lifetimeDescription: 'Sử dụng trọn đời, update mãi mãi',
    type: 'php-tool',
    requireHwid: true,
    hwidFormat: 'legacy',
    requireDeviceBinding: false,
    videoTutorial: '',
    features: '',
    hidden: false
  });

  // State for Add Tool Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTool, setNewTool] = useState({
    id: '',
    name: '',
    tagline: '',
    description: '',
    type: 'php-tool',
    icon: 'terminal',
    image: '',
    dailyPrice: '',
    dailyDays: '1',
    dailyName: 'Gói Theo Ngày',
    dailyDescription: 'Phù hợp trải nghiệm nhanh',
    monthlyPrice: '',
    monthlyDays: '30',
    monthlyName: 'Gói Tháng',
    monthlyDescription: 'Khuyên dùng, tiết kiệm nhất',
    yearlyPrice: '',
    yearlyDays: '365',
    yearlyName: 'Gói Năm',
    yearlyDescription: 'Tiết kiệm lâu dài',
    lifetimePrice: '',
    lifetimeDays: '36500',
    lifetimeName: 'Gói Vĩnh Viễn',
    lifetimeDescription: 'Sử dụng trọn đời, update mãi mãi',
    requireHwid: true,
    hwidFormat: 'legacy',
    requireDeviceBinding: false,
    videoTutorial: '',
    features: 'Cập nhật phiên bản tự động\nHỗ trợ đa luồng siêu tốc\nTương thích Windows 10/11',
    hidden: false
  });

  useEffect(() => {
    loadProductsList();
  }, []);

  async function loadProductsList() {
    setLoading(true);
    const data = await getProducts();
    setProducts(data);
    setLoading(false);
  }

  async function handleToggleAccordion(id) {
    if (expandedId === id) {
      setExpandedId('');
    } else {
      setExpandedId(id);
      const prod = products.find(p => p.id === id);
      if (prod) {
        let secureDownloadUrl = '';
        try {
          const secureDocRef = doc(db, 'products_secure', id);
          const secureDocSnap = await getDoc(secureDocRef);
          if (secureDocSnap.exists()) {
            secureDownloadUrl = secureDocSnap.data().downloadUrl || '';
          }
        } catch (err) {
          console.error("Error fetching secure download URL:", err);
        }

        setEditFields({
          version: prod.version || '1.0.0',
          downloadUrl: secureDownloadUrl,
          changelog: prod.changelog || '',
          name: prod.name || '',
          tagline: prod.tagline || '',
          description: prod.description || '',
          image: prod.image || '',
          dailyPrice: prod.plans?.daily?.price?.toString() || '',
          dailyDays: prod.plans?.daily?.days?.toString() || '1',
          dailyName: prod.plans?.daily?.name || 'Gói Theo Ngày',
          dailyDescription: prod.plans?.daily?.description || 'Phù hợp trải nghiệm nhanh',
          monthlyPrice: prod.plans?.monthly?.price?.toString() || '',
          monthlyDays: prod.plans?.monthly?.days?.toString() || '30',
          monthlyName: prod.plans?.monthly?.name || 'Gói Tháng',
          monthlyDescription: prod.plans?.monthly?.description || 'Khuyên dùng, tiết kiệm nhất',
          yearlyPrice: prod.plans?.yearly?.price?.toString() || '',
          yearlyDays: prod.plans?.yearly?.days?.toString() || '365',
          yearlyName: prod.plans?.yearly?.name || 'Gói Năm',
          yearlyDescription: prod.plans?.yearly?.description || 'Tiết kiệm lâu dài',
          lifetimePrice: prod.plans?.lifetime?.price?.toString() || '',
          lifetimeDays: prod.plans?.lifetime?.days?.toString() || '36500',
          lifetimeName: prod.plans?.lifetime?.name || 'Gói Vĩnh Viễn',
          lifetimeDescription: prod.plans?.lifetime?.description || 'Sử dụng trọn đời, update mãi mãi',
          type: prod.type || 'php-tool',
          requireHwid: prod.requireHwid !== false,
          hwidFormat: prod.hwidFormat || 'legacy',
          requireDeviceBinding: prod.requireDeviceBinding === true,
          videoTutorial: prod.videoTutorial || '',
          features: Array.isArray(prod.features) ? prod.features.join('\n') : '',
          hidden: prod.hidden === true
        });
      }
    }
  }

  async function handleSaveSettings(id) {
    try {
      const plans = {};
      if (editFields.type === 'free') {
        plans.free = {
          name: 'Tải Miễn Phí',
          price: 0,
          days: 36500,
          description: 'Click để tải ngay',
          popular: true
        };
      } else {
        const dp = editFields.dailyPrice !== '' ? parseInt(editFields.dailyPrice) : NaN;
        const mp = editFields.monthlyPrice !== '' ? parseInt(editFields.monthlyPrice) : NaN;
        const yp = editFields.yearlyPrice !== '' ? parseInt(editFields.yearlyPrice) : NaN;
        const lp = editFields.lifetimePrice !== '' ? parseInt(editFields.lifetimePrice) : NaN;

        if (!isNaN(dp) && dp >= 0) {
          plans.daily = {
            name: editFields.dailyName || 'Gói Theo Ngày',
            price: dp,
            days: editFields.dailyDays ? parseInt(editFields.dailyDays) : 1,
            description: editFields.dailyDescription || 'Phù hợp trải nghiệm nhanh',
            popular: false
          };
        }
        if (!isNaN(mp) && mp >= 0) {
          plans.monthly = {
            name: editFields.monthlyName || 'Gói Tháng',
            price: mp,
            days: editFields.monthlyDays ? parseInt(editFields.monthlyDays) : 30,
            description: editFields.monthlyDescription || 'Khuyên dùng, tiết kiệm nhất',
            popular: true
          };
        }
        if (!isNaN(yp) && yp >= 0) {
          plans.yearly = {
            name: editFields.yearlyName || 'Gói Năm',
            price: yp,
            days: editFields.yearlyDays ? parseInt(editFields.yearlyDays) : 365,
            description: editFields.yearlyDescription || 'Tiết kiệm lâu dài',
            popular: false
          };
        }
        if (!isNaN(lp) && lp >= 0) {
          plans.lifetime = {
            name: editFields.lifetimeName || 'Gói Vĩnh Viễn',
            price: lp,
            days: editFields.lifetimeDays ? parseInt(editFields.lifetimeDays) : 36500,
            description: editFields.lifetimeDescription || 'Sử dụng trọn đời, update mãi mãi',
            popular: false
          };
        }

        if (Object.keys(plans).length === 0) {
          if (editFields.type === 'crack') {
            plans.free = {
              name: 'Tải Miễn Phí',
              price: 0,
              days: 36500,
              description: 'Bản bẻ khóa cộng đồng',
              popular: true
            };
          } else {
            alert('Vui lòng nhập giá cho ít nhất một gói (Ngày, Tháng, Năm hoặc Vĩnh viễn)!');
            return;
          }
        }
      }

      const updatedData = {
        version: editFields.version,
        downloadUrl: editFields.downloadUrl,
        changelog: editFields.changelog,
        name: editFields.name,
        tagline: editFields.tagline,
        description: editFields.description,
        image: editFields.image,
        type: editFields.type,
        badge: editFields.type === 'free' ? 'Miễn phí' : editFields.type === 'crack' ? 'Vĩnh viễn' : 'Thuê / Vĩnh viễn',
        plans: plans,
        requireHwid: editFields.requireHwid !== false,
        hwidFormat: editFields.hwidFormat || 'legacy',
        requireDeviceBinding: editFields.requireHwid !== false && editFields.requireDeviceBinding === true,
        videoTutorial: editFields.videoTutorial || '',
        features: editFields.features ? editFields.features.split('\n').map(f => f.trim()).filter(f => f !== '') : [],
        hidden: editFields.hidden === true
      };

      await updateProduct(id, updatedData);

      // Update state
      setProducts(products.map(p => {
        if (p.id === id) {
          return {
            ...p,
            ...updatedData
          };
        }
        return p;
      }));

      alert('Đã cập nhật cấu hình tool thành công!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Không thể lưu: ' + error.message);
    }
  }

  async function handleAddToolSubmit() {
    const { id, name, tagline, description, type, icon, image, dailyPrice, dailyDays, dailyName, dailyDescription, monthlyPrice, monthlyDays, monthlyName, monthlyDescription, yearlyPrice, yearlyDays, yearlyName, yearlyDescription, lifetimePrice, lifetimeDays, lifetimeName, lifetimeDescription, videoTutorial, features } = newTool;
    
    if (!id.trim() || !name.trim()) {
      alert('Vui lòng nhập ID và Tên Tool!');
      return;
    }

    // Check if ID already exists
    if (products.some(p => p.id === id.trim())) {
      alert('Mã ID này đã tồn tại! Vui lòng chọn mã khác.');
      return;
    }

    try {
      // Build plans object based on price inputs
      const plans = {};
      
      if (type === 'free') {
        plans.free = {
          name: 'Tải Miễn Phí',
          price: 0,
          days: 36500,
          description: 'Click để tải ngay',
          popular: true
        };
      } else {
        const dp = dailyPrice !== '' ? parseInt(dailyPrice) : NaN;
        const mp = monthlyPrice !== '' ? parseInt(monthlyPrice) : NaN;
        const yp = yearlyPrice !== '' ? parseInt(yearlyPrice) : NaN;
        const lp = lifetimePrice !== '' ? parseInt(lifetimePrice) : NaN;

        if (!isNaN(dp) && dp >= 0) {
          plans.daily = {
            name: dailyName || 'Gói Theo Ngày',
            price: dp,
            days: dailyDays ? parseInt(dailyDays) : 1,
            description: dailyDescription || 'Phù hợp trải nghiệm nhanh',
            popular: false
          };
        }
        if (!isNaN(mp) && mp >= 0) {
          plans.monthly = {
            name: monthlyName || 'Gói Tháng',
            price: mp,
            days: monthlyDays ? parseInt(monthlyDays) : 30,
            description: monthlyDescription || 'Khuyên dùng, tiết kiệm nhất',
            popular: true
          };
        }
        if (!isNaN(yp) && yp >= 0) {
          plans.yearly = {
            name: yearlyName || 'Gói Năm',
            price: yp,
            days: yearlyDays ? parseInt(yearlyDays) : 365,
            description: yearlyDescription || 'Tiết kiệm lâu dài',
            popular: false
          };
        }
        if (!isNaN(lp) && lp >= 0) {
          plans.lifetime = {
            name: lifetimeName || 'Gói Vĩnh Viễn',
            price: lp,
            days: lifetimeDays ? parseInt(lifetimeDays) : 36500,
            description: lifetimeDescription || 'Sử dụng trọn đời, update mãi mãi',
            popular: false
          };
        }

        if (Object.keys(plans).length === 0) {
          if (type === 'crack') {
            plans.free = {
              name: 'Tải Miễn Phí',
              price: 0,
              days: 36500,
              description: 'Bản bẻ khóa cộng đồng',
              popular: true
            };
          } else {
            alert('Vui lòng nhập giá cho ít nhất một gói (Ngày, Tháng, Năm hoặc Vĩnh viễn)!');
            return;
          }
        }
      }

      const productData = {
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        type: type,
        badge: type === 'free' ? 'Miễn phí' : type === 'crack' ? 'Vĩnh viễn' : 'Thuê / Vĩnh viễn',
        image: image.trim() || 'https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=800&q=80',
        videoTutorial: videoTutorial ? videoTutorial.trim() : '',
        features: features ? features.split('\n').map(f => f.trim()).filter(f => f !== '') : [],
        plans: plans,
        version: '1.0.0',
        downloadUrl: '',
        changelog: '- Phiên bản khởi tạo đầu tiên.',
        icon: icon,
        requireHwid: newTool.requireHwid !== false,
        hwidFormat: newTool.hwidFormat || 'legacy',
        requireDeviceBinding: newTool.requireHwid !== false && newTool.requireDeviceBinding === true,
        hidden: newTool.hidden === true
      };

      await addProduct(id.trim(), productData);

      alert('Đã thêm sản phẩm thành công!');
      setShowAddModal(false);
      
      // Reload products list
      loadProductsList();

      // Reset form
      setNewTool({
        id: '',
        name: '',
        tagline: '',
        description: '',
        type: 'php-tool',
        icon: 'terminal',
        image: '',
        dailyPrice: '',
        dailyDays: '1',
        dailyName: 'Gói Theo Ngày',
        dailyDescription: 'Phù hợp trải nghiệm nhanh',
        monthlyPrice: '',
        monthlyDays: '30',
        monthlyName: 'Gói Tháng',
        monthlyDescription: 'Khuyên dùng, tiết kiệm nhất',
        yearlyPrice: '',
        yearlyDays: '365',
        yearlyName: 'Gói Năm',
        yearlyDescription: 'Tiết kiệm lâu dài',
        lifetimePrice: '',
        lifetimeDays: '36500',
        lifetimeName: 'Gói Vĩnh Viễn',
        lifetimeDescription: 'Sử dụng trọn đời, update mãi mãi',
        requireHwid: true,
        hwidFormat: 'legacy',
        requireDeviceBinding: false,
        hidden: false
      });

    } catch (error) {
      console.error('Error adding tool product:', error);
      alert('Lỗi thêm tool: ' + error.message);
    }
  }

  async function handleDeleteTool(id, name) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}" (ID: ${id}) không?\nHành động này không thể hoàn tác!`)) {
      return;
    }
    try {
      await deleteProduct(id);
      alert(`Đã xóa sản phẩm "${name}" thành công!`);
      loadProductsList();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Lỗi xóa tool: ' + error.message);
    }
  }

 if (!authLoading && !isAdmin()) {
 return <Navigate to="/dashboard" />;
 }

 return (
 <div className="min-h-screen bg-background text-on-background">
 <Navbar />

 <main className="md:ml-sidebar-width pt-header-height min-h-screen pb-12">
 <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop py-8">
 
 {/* Page Header */}
 <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
 <div>
 <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">Cài đặt phần mềm</h2>
 <p className="font-body-lg text-body-lg text-secondary">Cập nhật phiên bản, file tải xuống, changelog và thêm tool mới.</p>
 </div>
 <button 
 onClick={() => setShowAddModal(true)}
 className="bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white hover:opacity-95 font-label-md text-label-md px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-sm font-bold"
 >
 <span className="material-symbols-outlined text-[20px]">add</span>
 Thêm Tool Mới
 </button>
 </div>

 {loading ? (
 <div className="flex flex-col items-center justify-center py-20">
 <div className="w-10 h-10 border-4 border-[#c21a5b] border-t-transparent rounded-full animate-spin mb-4"></div>
 <p className="text-secondary">Đang tải danh sách cấu hình tool...</p>
 </div>
 ) : (
 /* Tool Accordion List */
 <div className="grid grid-cols-1 gap-4">
 {products.map(prod => {
 const isExpanded = expandedId === prod.id;
 return (
 <div key={prod.id} className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
  {/* Header bar button */}
  <button 
  aria-expanded={isExpanded}
  onClick={() => handleToggleAccordion(prod.id)}
  className="w-full flex items-center justify-between p-6 hover:bg-surface-container-low transition-colors text-left"
  >
  <div className="flex items-center gap-4">
  <div className="w-16 h-12 bg-surface-container rounded-lg overflow-hidden border border-outline-variant shrink-0 flex items-center justify-center">
    {prod.image ? (
      <img src={prod.image} alt={prod.name} className="w-full h-full object-fill" />
    ) : (
      <span className="material-symbols-outlined text-2xl text-[#c21a5b]">
        {prod.icon || 'terminal'}
      </span>
    )}
  </div>
  <div>
  <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
  {prod.name}
  </h3>
  <div className="flex items-center gap-2 mt-1">
  <span className="px-2 py-0.5 bg-surface-container-high text-on-surface text-[11px] font-mono-sm rounded border border-outline-variant">
  v{prod.version ||'1.0.0'}
  </span>
  <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-[11px] font-label-md rounded border border-secondary/20">
  {prod.type.toUpperCase()}
  </span>
  </div>
  </div>
  </div>
  <span className="material-symbols-outlined text-on-surface-variant transition-transform duration-200">
  {isExpanded ?'expand_less' :'expand_more'}
  </span>
  </button>

  {/* Accordion content block */}
  {isExpanded && (
  <div className="px-6 pb-6 pt-4 border-t border-outline-variant/60 bg-surface-container-lowest/40">
  <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
  
  {/* Basic settings */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div>
  <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Tên Tool</label>
  <input 
  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:border-[#c21a5b] focus:ring-1 focus:ring-[#c21a5b] outline-none transition-colors"
  type="text"
  value={editFields.name}
  onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
  />
  </div>
  <div>
  <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Mô tả ngắn (Tagline)</label>
  <input 
  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:border-[#c21a5b] focus:ring-1 focus:ring-[#c21a5b] outline-none transition-colors"
  type="text"
  value={editFields.tagline}
  onChange={(e) => setEditFields({ ...editFields, tagline: e.target.value })}
  />
  </div>
  </div>

  {/* Description and Image settings */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div>
  <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Mô tả chi tiết</label>
  <textarea 
  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:border-[#c21a5b] focus:ring-1 focus:ring-[#c21a5b] outline-none transition-colors"
  rows="3"
  value={editFields.description}
  onChange={(e) => setEditFields({ ...editFields, description: e.target.value })}
  />
  </div>
  <div>
  <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Link ảnh banner (URL)</label>
  <input 
  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:border-[#c21a5b] focus:ring-1 focus:ring-[#c21a5b] outline-none transition-colors text-xs font-mono"
  type="url"
  value={editFields.image}
  onChange={(e) => setEditFields({ ...editFields, image: e.target.value })}
  />
  {editFields.image && (
    <div className="mt-2 h-14 w-24 rounded overflow-hidden border border-outline-variant bg-surface-container-low">
      <img src={editFields.image} alt="Preview" className="w-full h-full object-fill" />
    </div>
  )}
  </div>
  </div>

  {/* Type selection and Plans settings */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Phân loại loại Tool</label>
                  <select 
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:border-[#c21a5b]"
                    value={editFields.type}
                    onChange={(e) => setEditFields({ ...editFields, type: e.target.value })}
                  >
                    <option value="php-tool">Tool của PHP-TOOL</option>
                    <option value="crack">Tool Mở Khóa</option>
                    <option value="free">Tool Free</option>
                  </select>
                  
                  {/* HWID Toggle Switch */}
                  <div className="mt-4 flex items-center justify-between p-3 bg-surface-container-low border border-outline-variant rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-on-surface">Yêu cầu khóa thiết bị (HWID)</span>
                      <span className="text-xs text-secondary">Bật để giới hạn thiết bị chạy key bản quyền.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={editFields.requireHwid !== false}
                        onChange={(e) => setEditFields({ ...editFields, requireHwid: e.target.checked, requireDeviceBinding: e.target.checked ? editFields.requireDeviceBinding : false })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c21a5b] peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  {/* Device binding policy (per product) */}
                  <div className="mt-4 space-y-3 p-3 bg-surface-container-low border border-outline-variant rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-on-surface">Require Device Public Key</span>
                        <span className="text-xs text-secondary">Enable only for clients that support device binding.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input type="checkbox" checked={editFields.requireDeviceBinding === true}
                          onChange={(e) => setEditFields({ ...editFields, requireDeviceBinding: e.target.checked, requireHwid: e.target.checked ? true : editFields.requireHwid })} className="sr-only peer" />
                        <div className="w-11 h-6 bg-surface-container-high rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c21a5b] peer-checked:after:bg-white"></div>
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">HWID format</label>
                      <select className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface"
                        value={editFields.hwidFormat || 'legacy'} onChange={(e) => setEditFields({ ...editFields, hwidFormat: e.target.value })}>
                        <option value="legacy">Legacy (unchanged)</option>
                        <option value="sha256_hex_64">SHA-256 hex (64 characters)</option>
                        <option value="none">No format validation</option>
                      </select>
                    </div>
                  </div>

                  {/* Hidden Toggle Switch */}
                  <div className="mt-4 flex items-center justify-between p-3 bg-surface-container-low border border-outline-variant rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-on-surface">Ẩn tool khỏi cửa hàng</span>
                      <span className="text-xs text-secondary">Bật để ẩn tool này trên trang chủ cửa hàng.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={editFields.hidden === true}
                        onChange={(e) => setEditFields({ ...editFields, hidden: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c21a5b] peer-checked:after:bg-white"></div>
                    </label>
                  </div>
                </div>
  
  {editFields.type !== 'free' && (
  <div className="space-y-4">
    <label className="block font-label-md text-label-md text-on-surface-variant">Cài đặt bảng giá thuê (Để trống hoặc nhập 0 đối với các gói không bán)</label>
    <div className="space-y-4 bg-surface-container-low border border-outline-variant rounded-xl p-4">
      {/* Daily Plan Card */}
      <div className="border border-outline-variant/60 rounded-lg p-3 bg-surface/30 space-y-3">
        <h5 className="text-xs font-bold text-on-surface text-secondary uppercase tracking-wider">Cấu hình Gói Ngày</h5>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Giá thuê (VND)</label>
            <input 
              type="number"
              placeholder="Ví dụ: 10000"
              value={editFields.dailyPrice}
              onChange={(e) => setEditFields({ ...editFields, dailyPrice: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Tên gói hiển thị</label>
            <input 
              type="text"
              placeholder="Gói Theo Ngày"
              value={editFields.dailyName}
              onChange={(e) => setEditFields({ ...editFields, dailyName: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Số ngày sử dụng</label>
            <input 
              type="number"
              placeholder="1"
              value={editFields.dailyDays}
              onChange={(e) => setEditFields({ ...editFields, dailyDays: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Thông tin phụ/Mô tả</label>
            <input 
              type="text"
              placeholder="Phù hợp trải nghiệm nhanh"
              value={editFields.dailyDescription}
              onChange={(e) => setEditFields({ ...editFields, dailyDescription: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
        </div>
      </div>

      {/* Monthly Plan Card */}
      <div className="border border-outline-variant/60 rounded-lg p-3 bg-surface/30 space-y-3">
        <h5 className="text-xs font-bold text-on-surface text-secondary uppercase tracking-wider">Cấu hình Gói Tháng</h5>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Giá thuê (VND)</label>
            <input 
              type="number"
              placeholder="Ví dụ: 200000"
              value={editFields.monthlyPrice}
              onChange={(e) => setEditFields({ ...editFields, monthlyPrice: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Tên gói hiển thị</label>
            <input 
              type="text"
              placeholder="Gói Tháng"
              value={editFields.monthlyName}
              onChange={(e) => setEditFields({ ...editFields, monthlyName: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Số ngày sử dụng</label>
            <input 
              type="number"
              placeholder="30"
              value={editFields.monthlyDays}
              onChange={(e) => setEditFields({ ...editFields, monthlyDays: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Thông tin phụ/Mô tả</label>
            <input 
              type="text"
              placeholder="Khuyên dùng, tiết kiệm nhất"
              value={editFields.monthlyDescription}
              onChange={(e) => setEditFields({ ...editFields, monthlyDescription: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
        </div>
      </div>

      {/* Yearly Plan Card */}
      <div className="border border-outline-variant/60 rounded-lg p-3 bg-surface/30 space-y-3">
        <h5 className="text-xs font-bold text-on-surface text-secondary uppercase tracking-wider">Cấu hình Gói Năm</h5>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Giá thuê (VND)</label>
            <input 
              type="number"
              placeholder="Ví dụ: 1500000"
              value={editFields.yearlyPrice}
              onChange={(e) => setEditFields({ ...editFields, yearlyPrice: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Tên gói hiển thị</label>
            <input 
              type="text"
              placeholder="Gói Năm"
              value={editFields.yearlyName}
              onChange={(e) => setEditFields({ ...editFields, yearlyName: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Số ngày sử dụng</label>
            <input 
              type="number"
              placeholder="365"
              value={editFields.yearlyDays}
              onChange={(e) => setEditFields({ ...editFields, yearlyDays: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Thông tin phụ/Mô tả</label>
            <input 
              type="text"
              placeholder="Tiết kiệm lâu dài"
              value={editFields.yearlyDescription}
              onChange={(e) => setEditFields({ ...editFields, yearlyDescription: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
        </div>
      </div>

      {/* Lifetime Plan Card */}
      <div className="border border-outline-variant/60 rounded-lg p-3 bg-surface/30 space-y-3">
        <h5 className="text-xs font-bold text-on-surface text-secondary uppercase tracking-wider">Cấu hình Gói Vĩnh Viễn</h5>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Giá thuê (VND)</label>
            <input 
              type="number"
              placeholder="Ví dụ: 3500000"
              value={editFields.lifetimePrice}
              onChange={(e) => setEditFields({ ...editFields, lifetimePrice: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Tên gói hiển thị</label>
            <input 
              type="text"
              placeholder="Gói Vĩnh Viễn"
              value={editFields.lifetimeName}
              onChange={(e) => setEditFields({ ...editFields, lifetimeName: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Số ngày sử dụng (Mặc định vĩnh viễn)</label>
            <input 
              type="number"
              placeholder="36500"
              disabled
              value={editFields.lifetimeDays}
              className="w-full bg-surface/50 border border-outline-variant/60 rounded px-2 py-1 text-secondary text-xs cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Thông tin phụ/Mô tả</label>
            <input 
              type="text"
              placeholder="Sử dụng trọn đời, update mãi mãi"
              value={editFields.lifetimeDescription}
              onChange={(e) => setEditFields({ ...editFields, lifetimeDescription: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
        </div>
      </div>
    </div>
    <p className="text-[11px] text-secondary mt-1">
      * Để trống hoặc nhập 0 đối với các gói không bán. Cần có ít nhất 1 gói được cấu hình.
    </p>
  </div>
  )}
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-outline-variant/30">
  <div>
  <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Phiên bản hiện tại</label>
  <input 
  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 font-mono-sm text-mono-sm text-on-surface focus:border-[#c21a5b] focus:ring-1 focus:ring-[#c21a5b] outline-none transition-colors"
  type="text"
  value={editFields.version}
  onChange={(e) => setEditFields({ ...editFields, version: e.target.value })}
  />
  </div>
  <div>
  <label className="block font-label-md text-label-md text-on-surface-variant mb-2">URL Tải xuống</label>
  <div className="flex gap-2">
  <input 
  className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 font-mono-sm text-mono-sm text-on-surface focus:border-[#c21a5b] focus:ring-1 focus:ring-[#c21a5b] outline-none transition-colors"
  type="url"
  value={editFields.downloadUrl}
  onChange={(e) => setEditFields({ ...editFields, downloadUrl: e.target.value })}
  />
  <button 
  className="px-3 py-2 bg-surface-container border border-outline-variant rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-center" 
  title="Copy URL"
  type="button"
  onClick={() => {
  if (editFields.downloadUrl) {
  navigator.clipboard.writeText(editFields.downloadUrl);
  alert('Đã copy URL tải!');
  }
  }}
  >
  <span className="material-symbols-outlined text-[20px]">content_copy</span>
  </button>
  </div>
  </div>
  </div>
  
  <div>
  <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Nhật ký cập nhật (Changelog)</label>
  <textarea 
  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface focus:border-[#c21a5b] focus:ring-1 focus:ring-[#c21a5b] outline-none transition-colors"
  rows="4"
  value={editFields.changelog}
  onChange={(e) => setEditFields({ ...editFields, changelog: e.target.value })}
  />
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Link video hướng dẫn (Youtube Embed URL)</label>
      <input 
        className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:border-[#c21a5b] focus:ring-1 focus:ring-[#c21a5b] outline-none transition-colors text-xs font-mono"
        type="url"
        placeholder="Ví dụ: https://www.youtube.com/embed/dQw4w9WgXcQ"
        value={editFields.videoTutorial || ''}
        onChange={(e) => setEditFields({ ...editFields, videoTutorial: e.target.value })}
      />
    </div>
    <div>
      <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Tính năng nổi bật (Mỗi dòng một tính năng)</label>
      <textarea 
        className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:border-[#c21a5b] focus:ring-1 focus:ring-[#c21a5b] outline-none transition-colors text-xs"
        rows="3"
        placeholder="Ví dụ:&#10;Hỗ trợ đa luồng&#10;Tự động giải captcha"
        value={editFields.features || ''}
        onChange={(e) => setEditFields({ ...editFields, features: e.target.value })}
      />
    </div>
  </div>

  <div className="flex justify-end gap-3 pt-2">
  <button 
  type="button"
  onClick={() => handleDeleteTool(prod.id, prod.name)}
  className="bg-red-50 hover:bg-red-100/80 text-red-600 border border-red-200 font-label-md text-label-md px-5 py-2.5 rounded-lg transition-all shadow-sm font-bold flex items-center gap-1.5 focus:outline-none"
  >
  <span className="material-symbols-outlined text-[18px]">delete</span>
  Xóa Tool
  </button>
  <button 
  type="button"
  onClick={() => handleSaveSettings(prod.id)}
  className="bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white hover:opacity-95 font-label-md text-label-md px-6 py-2.5 rounded-lg transition-all shadow-sm font-bold"
  >
  Lưu Cài Đặt
  </button>
  </div>
  </form>
  </div>
  )}
 </div>
 );
 })}
 </div>
 )}

 </div>
 </main>

 {/* Add New Product Modal */}
 {showAddModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto py-8">
 <div className="bg-surface-bright border border-outline-variant rounded-xl w-full max-w-lg overflow-hidden shadow-xl animate-scaleIn my-auto">
 <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
 <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Thêm Tool Mới vào Store</h3>
 <button onClick={() => setShowAddModal(false)} className="text-secondary hover:text-on-surface text-lg">✕</button>
 </div>
 
 <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
 
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-secondary mb-1">Mã ID Tool (Viết liền, không dấu)</label>
 <input 
 type="text" 
 placeholder="e.g. regfb_v2"
 className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:border-primary font-mono text-xs"
 value={newTool.id}
 onChange={(e) => setNewTool({ ...newTool, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,'') })}
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-secondary mb-1">Tên Tool</label>
 <input 
 type="text" 
 placeholder="e.g. Tool Auto Reg FB v2"
 className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none"
 value={newTool.name}
 onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-semibold text-secondary mb-1">Mô tả ngắn (Tagline)</label>
 <input 
 type="text" 
 placeholder="e.g. Công cụ tạo tài khoản facebook hàng loạt trên PC"
 className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none"
 value={newTool.tagline}
 onChange={(e) => setNewTool({ ...newTool, tagline: e.target.value })}
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-secondary mb-1">Mô tả đầy đủ chi tiết</label>
 <textarea 
 placeholder="Nhập giới thiệu chi tiết về tính năng..."
 className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none"
 rows="3"
 value={newTool.description}
 onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
 />
 </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Phân loại loại Tool</label>
                <select 
                  className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none"
                  value={newTool.type}
                  onChange={(e) => setNewTool({ ...newTool, type: e.target.value })}
                >
                  <option value="php-tool">Tool của PHP-TOOL</option>
                  <option value="crack">Tool Mở Khóa</option>
                  <option value="free">Tool Free</option>
                </select>
                
                {/* HWID Toggle for new tool */}
                <div className="mt-2 flex items-center justify-between p-2.5 bg-surface border border-outline-variant rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-on-surface">Yêu cầu khóa thiết bị (HWID)</span>
                    <span className="text-[10px] text-secondary">Giới hạn key chỉ chạy trên 1 thiết bị.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={newTool.requireHwid !== false}
                      onChange={(e) => setNewTool({ ...newTool, requireHwid: e.target.checked, requireDeviceBinding: e.target.checked ? newTool.requireDeviceBinding : false })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-outline-variant after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c21a5b] peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {/* Device binding policy (per product) */}
                <div className="mt-2 space-y-3 p-2.5 bg-surface border border-outline-variant rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-on-surface">Require Device Public Key</span>
                      <span className="text-[10px] text-secondary">Enable only for clients that support device binding.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input type="checkbox" checked={newTool.requireDeviceBinding === true}
                        onChange={(e) => setNewTool({ ...newTool, requireDeviceBinding: e.target.checked, requireHwid: e.target.checked ? true : newTool.requireHwid })} className="sr-only peer" />
                      <div className="w-9 h-5 bg-surface-container-high rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c21a5b] peer-checked:after:bg-white"></div>
                    </label>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-secondary mb-1">HWID format</label>
                    <select className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface"
                      value={newTool.hwidFormat || 'legacy'} onChange={(e) => setNewTool({ ...newTool, hwidFormat: e.target.value })}>
                      <option value="legacy">Legacy (unchanged)</option>
                      <option value="sha256_hex_64">SHA-256 hex (64 characters)</option>
                      <option value="none">No format validation</option>
                    </select>
                  </div>
                </div>

                {/* Hidden Toggle for new tool */}
                <div className="mt-2 flex items-center justify-between p-2.5 bg-surface border border-outline-variant rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-on-surface">Ẩn tool khỏi cửa hàng</span>
                    <span className="text-[10px] text-secondary">Ẩn tool này ngay sau khi tạo xong.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={newTool.hidden === true}
                      onChange={(e) => setNewTool({ ...newTool, hidden: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-outline-variant after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c21a5b] peer-checked:after:bg-white"></div>
                  </label>
                </div>
              </div>

 <div>
 <label className="block text-xs font-semibold text-secondary mb-1">Link ảnh banner (URL)</label>
 <input 
 type="url" 
 placeholder="https://..."
 className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none text-xs"
 value={newTool.image}
 onChange={(e) => setNewTool({ ...newTool, image: e.target.value })}
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
   <div>
     <label className="block text-xs font-semibold text-secondary mb-1">Link video hướng dẫn (Youtube Embed URL)</label>
     <input 
       type="url" 
       placeholder="https://www.youtube.com/embed/..."
       className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none text-xs font-mono"
       value={newTool.videoTutorial || ''}
       onChange={(e) => setNewTool({ ...newTool, videoTutorial: e.target.value })}
     />
   </div>
   <div>
     <label className="block text-xs font-semibold text-secondary mb-1">Tính năng nổi bật (Mỗi dòng một tính năng)</label>
     <textarea 
       placeholder="Ví dụ:&#10;Hỗ trợ đa luồng&#10;Tự động giải captcha"
       className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none text-xs"
       rows="3"
       value={newTool.features || ''}
       onChange={(e) => setNewTool({ ...newTool, features: e.target.value })}
     />
   </div>
 </div>

 {newTool.type !== 'free' && (
  <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 space-y-4">
    <h4 className="font-label-md text-label-md text-on-surface font-bold">Cài đặt bảng giá thuê (Để trống hoặc nhập 0 đối với các gói không bán)</h4>
    <div className="space-y-4">
      {/* Daily Plan Card */}
      <div className="border border-outline-variant/60 rounded-lg p-3 bg-surface/30 space-y-3">
        <h5 className="text-xs font-bold text-on-surface text-secondary uppercase tracking-wider">Cấu hình Gói Ngày</h5>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Giá thuê (VND)</label>
            <input 
              type="number"
              placeholder="Ví dụ: 10000"
              value={newTool.dailyPrice}
              onChange={(e) => setNewTool({ ...newTool, dailyPrice: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Tên gói hiển thị</label>
            <input 
              type="text"
              placeholder="Gói Theo Ngày"
              value={newTool.dailyName}
              onChange={(e) => setNewTool({ ...newTool, dailyName: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Số ngày sử dụng</label>
            <input 
              type="number"
              placeholder="1"
              value={newTool.dailyDays}
              onChange={(e) => setNewTool({ ...newTool, dailyDays: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Thông tin phụ/Mô tả</label>
            <input 
              type="text"
              placeholder="Phù hợp trải nghiệm nhanh"
              value={newTool.dailyDescription}
              onChange={(e) => setNewTool({ ...newTool, dailyDescription: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
        </div>
      </div>

      {/* Monthly Plan Card */}
      <div className="border border-outline-variant/60 rounded-lg p-3 bg-surface/30 space-y-3">
        <h5 className="text-xs font-bold text-on-surface text-secondary uppercase tracking-wider">Cấu hình Gói Tháng</h5>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Giá thuê (VND)</label>
            <input 
              type="number"
              placeholder="Ví dụ: 200000"
              value={newTool.monthlyPrice}
              onChange={(e) => setNewTool({ ...newTool, monthlyPrice: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Tên gói hiển thị</label>
            <input 
              type="text"
              placeholder="Gói Tháng"
              value={newTool.monthlyName}
              onChange={(e) => setNewTool({ ...newTool, monthlyName: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Số ngày sử dụng</label>
            <input 
              type="number"
              placeholder="30"
              value={newTool.monthlyDays}
              onChange={(e) => setNewTool({ ...newTool, monthlyDays: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Thông tin phụ/Mô tả</label>
            <input 
              type="text"
              placeholder="Khuyên dùng, tiết kiệm nhất"
              value={newTool.monthlyDescription}
              onChange={(e) => setNewTool({ ...newTool, monthlyDescription: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
        </div>
      </div>

      {/* Yearly Plan Card */}
      <div className="border border-outline-variant/60 rounded-lg p-3 bg-surface/30 space-y-3">
        <h5 className="text-xs font-bold text-on-surface text-secondary uppercase tracking-wider">Cấu hình Gói Năm</h5>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Giá thuê (VND)</label>
            <input 
              type="number"
              placeholder="Ví dụ: 1500000"
              value={newTool.yearlyPrice}
              onChange={(e) => setNewTool({ ...newTool, yearlyPrice: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Tên gói hiển thị</label>
            <input 
              type="text"
              placeholder="Gói Năm"
              value={newTool.yearlyName}
              onChange={(e) => setNewTool({ ...newTool, yearlyName: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Số ngày sử dụng</label>
            <input 
              type="number"
              placeholder="365"
              value={newTool.yearlyDays}
              onChange={(e) => setNewTool({ ...newTool, yearlyDays: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Thông tin phụ/Mô tả</label>
            <input 
              type="text"
              placeholder="Tiết kiệm lâu dài"
              value={newTool.yearlyDescription}
              onChange={(e) => setNewTool({ ...newTool, yearlyDescription: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
        </div>
      </div>

      {/* Lifetime Plan Card */}
      <div className="border border-outline-variant/60 rounded-lg p-3 bg-surface/30 space-y-3">
        <h5 className="text-xs font-bold text-on-surface text-secondary uppercase tracking-wider">Cấu hình Gói Vĩnh Viễn</h5>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Giá thuê (VND)</label>
            <input 
              type="number"
              placeholder="Ví dụ: 3500000"
              value={newTool.lifetimePrice}
              onChange={(e) => setNewTool({ ...newTool, lifetimePrice: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Tên gói hiển thị</label>
            <input 
              type="text"
              placeholder="Gói Vĩnh Viễn"
              value={newTool.lifetimeName}
              onChange={(e) => setNewTool({ ...newTool, lifetimeName: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Số ngày sử dụng (Mặc định vĩnh viễn)</label>
            <input 
              type="number"
              placeholder="36500"
              disabled
              value={newTool.lifetimeDays}
              className="w-full bg-surface/50 border border-outline-variant/60 rounded px-2 py-1 text-secondary text-xs cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary mb-1">Thông tin phụ/Mô tả</label>
            <input 
              type="text"
              placeholder="Sử dụng trọn đời, update mãi mãi"
              value={newTool.lifetimeDescription}
              onChange={(e) => setNewTool({ ...newTool, lifetimeDescription: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-on-surface text-xs"
            />
          </div>
        </div>
      </div>
    </div>
    <p className="text-[11px] text-secondary mt-1">
      * Để trống hoặc nhập 0 đối với các gói không bán. Cần có ít nhất 1 gói được cấu hình.
    </p>
  </div>
  )}

 </div>
 
 <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3">
 <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
 Hủy
 </button>
 <button onClick={handleAddToolSubmit} className="px-5 py-2 bg-gradient-to-r from-[#c21a5b] to-[#571477] text-white rounded-lg hover:opacity-95 transition-all font-bold shadow-sm">
 Thêm Tool
 </button>
 </div>
 </div>
 </div>
 )}

 </div>
 );
}
