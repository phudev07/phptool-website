import { useEffect } from 'react';

/**
 * SEO Component - Sets page title and meta tags dynamically
 * Compatible with React 19 (no helmet dependency)
 */
export default function SEO({ 
  title, 
  description, 
  keywords,
  image,
  url 
}) {
  const siteTitle = 'PHP Tool';
  const defaultDescription = 'Tool tự động đăng ký và xác minh tài khoản Facebook hàng loạt. Hỗ trợ Hotmail, SMS, Gmail.';
  
  useEffect(() => {
    // Set page title
    document.title = title ? `${title} | ${siteTitle}` : `${siteTitle} - Tool Reg/Very Facebook`;
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description || defaultDescription);
    }

    // Update OG tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    
    if (ogTitle) ogTitle.setAttribute('content', title ? `${title} | ${siteTitle}` : siteTitle);
    if (ogDesc) ogDesc.setAttribute('content', description || defaultDescription);
    if (ogUrl && url) ogUrl.setAttribute('content', url);
    if (ogImage && image) ogImage.setAttribute('content', image);

    // Update Twitter tags
    const twTitle = document.querySelector('meta[property="twitter:title"]');
    const twDesc = document.querySelector('meta[property="twitter:description"]');
    
    if (twTitle) twTitle.setAttribute('content', title ? `${title} | ${siteTitle}` : siteTitle);
    if (twDesc) twDesc.setAttribute('content', description || defaultDescription);

    // Update keywords if provided
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) {
        metaKeywords.setAttribute('content', keywords);
      }
    }
  }, [title, description, keywords, image, url]);

  return null; // This component doesn't render anything
}
