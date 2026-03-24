import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Đăng ký tài khoản mới
  async function signup(email, password, displayName) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName });

    // Tính thời gian hết hạn trial (1 ngày)
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 1);

    // Tạo profile trong Firestore với bonus 10k
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      displayName: displayName,
      role: 'user',
      balance: 10000, // Bonus đăng ký 10k
      createdAt: serverTimestamp()
    });

    return userCredential;
  }

  // Đăng nhập
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Đăng xuất
  function logout() {
    return signOut(auth);
  }

  // Lấy profile từ Firestore
  async function fetchUserProfile(uid) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  }

  // Kiểm tra quyền admin
  function isAdmin() {
    return userProfile?.role === 'admin';
  }

  useEffect(() => {
    let unsubProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Use onSnapshot for real-time updates of balance and profile
        const docRef = doc(db, 'users', user.uid);
        unsubProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user profile snapshot:", error);
          setLoading(false);
        });
      } else {
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    logout,
    isAdmin,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
