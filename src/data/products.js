import { Smartphone, Facebook, Mail, Box, Code, Youtube } from 'lucide-react';

export const PRODUCTS = [
  {
    id: 'regfb',
    name: 'Tool Auto Reg/Very FB LD và Phone',
    tagline: 'Công cụ đắc lực cho dân MMO',
    description: 'Tự động hóa hoàn toàn quá trình tạo và nuôi tài khoản Facebook số lượng lớn trên môi trường giả lập LDPlayer và điện thoại thật.',
    type: 'php-tool', // php-tool, crack, free
    badge: 'Thuê / Vĩnh viễn',
    image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80',
    videoTutorial: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Link nhúng ytb (thay id)
    features: [
      'Tự động đăng ký tài khoản Facebook hàng loạt',
      'Hỗ trợ chạy trên trình duyệt ẩn danh, fake IP, MAC',
      'Nuôi tài khoản, tương tác như người dùng thật',
      'Tự động vượt Checkpoint, giải Captcha',
      'Quản lý hàng ngàn tài khoản dễ dàng'
    ],
    highlights: [
      {
        icon: Smartphone,
        title: 'Đa nền tảng',
        desc: 'Hỗ trợ chạy trên cả Giả lập PC (LDPlayer, Nox) và Điện thoại thật Android.'
      },
      {
        icon: Facebook,
        title: 'Tối ưu FB',
        desc: 'Thuật toán chống block, vượt checkpoint tự động tỷ lệ thành công cao.'
      }
    ],
    plans: {
      daily: {
        name: 'Gói Theo Ngày (Test)',
        price: 15000,
        days: 1,
        description: 'Phù hợp để trải nghiệm thử các tính năng của tool',
        popular: false
      },
      monthly: {
        name: 'Gói Tháng',
        price: 350000,
        days: 30,
        description: 'Tiết kiệm hơn, đầy đủ tính năng nuôi và reg',
        popular: true,
        save: '22%'
      },
      yearly: {
        name: 'Gói Năm',
        price: 1800000,
        days: 365,
        description: 'Tiết kiệm lâu dài, cập nhật miễn phí',
        popular: false
      },
      lifetime: {
        name: 'Gói Vĩnh Viễn',
        price: 3500000,
        days: 36500, // 100 years
        description: 'Sử dụng trọn đời, update miễn phí mãi mãi',
        popular: false,
        best: true
      }
    }
  },
  {
    id: 'clonetk',
    name: 'Tool Nuôi Clone TikTok Siêu Tốc',
    tagline: 'Nuôi tài khoản TikTok không giới hạn',
    description: 'Phần mềm tự động hóa nuôi nick TikTok, tăng follow, view, tương tác chéo an toàn và hiệu quả cao.',
    type: 'php-tool',
    badge: 'Thuê / Vĩnh viễn',
    image: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&q=80',
    videoTutorial: '', 
    features: [
      'Tự động lướt video, thả tim, comment',
      'Upload video hàng loạt theo lịch',
      'Đổi IP Proxy cho từng tài khoản',
      'Follow chéo, tăng tương tác tự nhiên'
    ],
    highlights: [],
    plans: {
      monthly: {
        name: 'Gói 1 Tháng',
        price: 200000,
        days: 30,
        description: 'Nuôi không giới hạn tài khoản',
        popular: true
      },
      lifetime: {
        name: 'Gói Vĩnh Viễn',
        price: 2000000,
        days: 36500,
        description: 'Sử dụng trọn đời, cập nhật tự động',
        popular: false
      }
    }
  },
  {
    id: 'photoshop_panel',
    name: 'Photoshop Retouch Panel (Bản Quyền)',
    tagline: 'Tự động làm mịn da, blend màu 1 click',
    description: 'Panel tiện ích cài thẳng vào Photoshop giúp các photographer chỉnh sửa ảnh chân dung, ảnh cưới nhanh chóng.',
    type: 'crack',
    badge: 'Vĩnh viễn',
    image: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=800&q=80',
    videoTutorial: '',
    features: [
      'Tự động nhặt mụn, làm mịn da giữ hạt',
      'Blend màu tự động theo preset',
      'Cứu sáng, cứu cháy, trong trẻo ảnh',
      'Tương thích Photoshop CC 2018 - 2024'
    ],
    highlights: [],
    plans: {
      lifetime: {
        name: 'Mua Vĩnh Viễn',
        price: 500000,
        days: 36500,
        description: 'Mua 1 lần dùng mãi mãi',
        popular: true
      }
    }
  },
  {
    id: 'free_spamsms',
    name: 'Phần mềm Spam SMS Android',
    tagline: 'Gửi tin nhắn SMS tự động',
    description: 'Tool nhỏ gọn giúp gửi tin nhắn SMS hàng loạt theo danh sách sđt bằng điện thoại Android.',
    type: 'free',
    badge: 'Free',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
    videoTutorial: '',
    features: [
      'Gửi SMS theo list danh bạ (file txt)',
      'Tự động dãn cách thời gian gửi',
      'Hoạt động không cần root'
    ],
    highlights: [],
    plans: {
      free: {
        name: 'Tải Miễn Phí',
        price: 0,
        days: 36500,
        description: 'Click để tải ngay',
        popular: true
      }
    }
  }
];

export const getProductsByType = (type) => {
  return PRODUCTS.filter(p => p.type === type);
};

export const getProductById = (id) => {
  return PRODUCTS.find(p => p.id === id);
};
