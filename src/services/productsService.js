import { collection, getDocs, doc, setDoc, getDoc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { PRODUCTS } from '../data/products';

export async function getProducts() {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    let productsList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

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
          icon: prod.id === 'regfb' ? 'terminal' : prod.id === 'photoshop_panel' ? 'image' : 'smart_display'
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
            const { downloadUrl, ...publicData } = prod;
            await setDoc(doc(db, 'products', prod.id), publicData);
            delete prod.downloadUrl;
          } catch (migError) {
            console.error(`Error migrating product ${prod.id}:`, migError);
          }
        }
      }
    }

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
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching product ${id}:`, error);
    return null;
  }
}

export async function updateProduct(id, data) {
  try {
    const docRef = doc(db, 'products', id);
    const { downloadUrl, ...publicData } = data;
    await updateDoc(docRef, publicData);
    
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

