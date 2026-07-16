import { collection, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { PRODUCTS } from '../data/products';

export async function getProducts() {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    let productsList = querySnapshot.docs.map(snapshot => {
      const data = snapshot.data();
      const defaults = PRODUCTS.find(product => product.id === snapshot.id);
      return {
        id: snapshot.id,
        requireHwid: data.requireHwid ?? defaults?.requireHwid ?? true,
        hwidFormat: data.hwidFormat || defaults?.hwidFormat || 'legacy',
        requireDeviceBinding: data.requireDeviceBinding ?? defaults?.requireDeviceBinding ?? false,
        ...data
      };
    });

    // Seed products if empty in Firestore
    if (productsList.length === 0) {
      console.log('Firestore products collection is empty. Seeding defaults...');
      for (const prod of PRODUCTS) {
        const docRef = doc(db, 'products', prod.id);
        const seedData = {
          name: prod.name,
          tagline: prod.tagline || '',
          description: prod.description || '',
          type: prod.type || 'php-tool',
          badge: prod.badge || '',
          image: prod.image || '',
          videoTutorial: prod.videoTutorial || '',
          features: prod.features || [],
          plans: prod.plans || {},
          version: prod.id === 'regfb' ? '3.0.0.5' : '1.0.0',
          downloadUrl: '',
          changelog: prod.id === 'regfb' ? '- Cập nhật API Facebook mới nhất.\n- Sửa lỗi checkpoint 282.\n- Tối ưu hóa tốc độ tạo tài khoản.' : '- Phiên bản đầu tiên.',
          icon: prod.id === 'regfb' || prod.id === 'reg_fb_v2' ? 'terminal' : prod.id === 'photoshop_panel' ? 'image' : 'smart_display',
          requireHwid: prod.requireHwid !== false,
          hwidFormat: prod.hwidFormat || 'legacy',
          requireDeviceBinding: prod.requireDeviceBinding === true
        };
        const { downloadUrl, ...publicSeed } = seedData;
        await setDoc(docRef, publicSeed);
        if (downloadUrl) {
          await setDoc(doc(db, 'products_secure', prod.id), { downloadUrl });
        }
        productsList.push({ id: prod.id, ...publicSeed });
      }
    } else {
      // Auto-migrate old products that still have public downloadUrl in Firestore
      for (const prod of productsList) {
        if (prod.downloadUrl) {
          console.log(`Migrating product ${prod.id} downloadUrl to products_secure...`);
          try {
            await setDoc(doc(db, 'products_secure', prod.id), { downloadUrl: prod.downloadUrl });
            const publicData = { ...prod };
            delete publicData.downloadUrl;
            await setDoc(doc(db, 'products', prod.id), publicData);
            delete prod.downloadUrl;
          } catch (migError) {
            console.error(`Error migrating product ${prod.id}:`, migError);
          }
        }
      }
    }

    // Make newly added static products visible before an administrator publishes
    // their Firestore document. This is read-only for regular visitors.
    const existingIds = new Set(productsList.map(product => product.id));
    PRODUCTS.filter(product => !existingIds.has(product.id)).forEach(product => {
      productsList.push({
        ...product,
        version: product.id === 'regfb' ? '3.0.0.5' : '1.0.0',
        icon: product.id === 'regfb' || product.id === 'reg_fb_v2' ? 'terminal' : product.id === 'photoshop_panel' ? 'image' : 'smart_display',
        __staticFallback: true
      });
    });

    return productsList;
  } catch (error) {
    console.error('Error fetching/seeding products:', error);
    // Fallback to static data in case of Firestore issues
    return PRODUCTS;
  }
}

export async function getProductById(id) {
  try {
    const docRef = doc(db, 'products', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const defaults = PRODUCTS.find(product => product.id === id);
      return {
        id: docSnap.id,
        requireHwid: data.requireHwid ?? defaults?.requireHwid ?? true,
        hwidFormat: data.hwidFormat || defaults?.hwidFormat || 'legacy',
        requireDeviceBinding: data.requireDeviceBinding ?? defaults?.requireDeviceBinding ?? false,
        ...data
      };
    }
    return PRODUCTS.find(product => product.id === id) || null;
  } catch (error) {
    console.error(`Error fetching product ${id}:`, error);
    return PRODUCTS.find(product => product.id === id) || null;
  }
}

export async function updateProduct(id, data) {
  try {
    const docRef = doc(db, 'products', id);
    const { downloadUrl, ...publicData } = data;
    // Merge also publishes a static fallback product the first time an admin
    // saves it from Settings.
    await setDoc(docRef, publicData, { merge: true });
    
    if (downloadUrl !== undefined) {
      const secureRef = doc(db, 'products_secure', id);
      await setDoc(secureRef, { downloadUrl });
    }
    return true;
  } catch (error) {
    console.error(`Error updating product ${id}:`, error);
    throw error;
  }
}

export async function addProduct(id, data) {
  try {
    const docRef = doc(db, 'products', id);
    const { downloadUrl, ...publicData } = data;
    await setDoc(docRef, publicData);
    
    if (downloadUrl !== undefined) {
      const secureRef = doc(db, 'products_secure', id);
      await setDoc(secureRef, { downloadUrl });
    }
    return true;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
}

export async function deleteProduct(id) {
  try {
    const docRef = doc(db, 'products', id);
    await deleteDoc(docRef);
    // Also delete the secure product details
    const secureRef = doc(db, 'products_secure', id);
    await deleteDoc(secureRef);
    return true;
  } catch (error) {
    console.error(`Error deleting product ${id}:`, error);
    throw error;
  }
}
