import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');
const templatePath = path.resolve(distDir, 'index.html');

if (!fs.existsSync(templatePath)) {
  console.error('Template index.html not found in dist. Run vite build first.');
  process.exit(1);
}

const template = fs.readFileSync(templatePath, 'utf8');

const PRODUCTS = [
  {
    id: 'regfb',
    name: 'Tool Auto Reg/Very FB LD và Phone',
    tagline: 'Công cụ đắc lực cho dân MMO',
    description: 'Tự động hóa hoàn toàn quá trình tạo và nuôi tài khoản Facebook số lượng lớn trên môi trường giả lập LDPlayer và điện thoại thật.',
    image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80'
  },
  {
    id: 'clonetk',
    name: 'Tool Nuôi Clone TikTok Siêu Tốc',
    tagline: 'Nuôi tài khoản TikTok không giới hạn',
    description: 'Phần mềm tự động hóa nuôi nick TikTok, tăng follow, view, tương tác chéo an toàn và hiệu quả cao.',
    image: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&q=80'
  },
  {
    id: 'photoshop_panel',
    name: 'Photoshop Retouch Panel (Bản Quyền)',
    tagline: 'Tự động làm mịn da, blend màu 1 click',
    description: 'Panel tiện ích cài thẳng vào Photoshop giúp các photographer chỉnh sửa ảnh chân dung, ảnh cưới nhanh chóng.',
    image: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=800&q=80'
  },
  {
    id: 'free_spamsms',
    name: 'Phần mềm Spam SMS Android',
    tagline: 'Gửi tin nhắn SMS tự động',
    description: 'Tool nhỏ gọn giúp gửi tin nhắn SMS hàng loạt theo danh sách sđt bằng điện thoại Android.',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80'
  }
];

PRODUCTS.forEach(product => {
  const buyDir = path.join(distDir, 'buy', product.id);
  fs.mkdirSync(buyDir, { recursive: true });

  const title = `${product.name} - ${product.tagline} | PHP-TOOL VIP`;
  const desc = product.description || product.tagline || 'Mua bản quyền phần mềm tự động hóa mmo.';
  const image = product.image || 'https://phptool.site/logo.png';
  const url = `https://phptool.site/buy/${product.id}`;

  let content = template;

  // Replace primary title & desc
  content = content.replace(/<title>.*?<\/title>/g, `<title>${title}</title>`);
  content = content.replace(/<meta name="title" content=".*?"\s*\/?>/g, `<meta name="title" content="${title}" />`);
  content = content.replace(/<meta name="description" content=".*?"\s*\/?>/g, `<meta name="description" content="${desc}" />`);

  // Replace OpenGraph tags
  content = content.replace(/<meta property="og:title" content=".*?"\s*\/?>/g, `<meta property="og:title" content="${title}" />`);
  content = content.replace(/<meta property="og:description" content=".*?"\s*\/?>/g, `<meta property="og:description" content="${desc}" />`);
  content = content.replace(/<meta property="og:image" content=".*?"\s*\/?>/g, `<meta property="og:image" content="${image}" />`);
  content = content.replace(/<meta property="og:url" content=".*?"\s*\/?>/g, `<meta property="og:url" content="${url}" />`);

  // Replace Twitter tags
  content = content.replace(/<meta property="twitter:title" content=".*?"\s*\/?>/g, `<meta property="twitter:title" content="${title}" />`);
  content = content.replace(/<meta property="twitter:description" content=".*?"\s*\/?>/g, `<meta property="twitter:description" content="${desc}" />`);
  content = content.replace(/<meta property="twitter:image" content=".*?"\s*\/?>/g, `<meta property="twitter:image" content="${image}" />`);
  content = content.replace(/<meta property="twitter:url" content=".*?"\s*\/?>/g, `<meta property="twitter:url" content="${url}" />`);

  fs.writeFileSync(path.join(buyDir, 'index.html'), content, 'utf8');
  console.log(`Prerendered static SEO page: /buy/${product.id}`);
});
