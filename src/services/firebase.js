// Firebase Configuration
// Bạn cần thay thế các giá trị này bằng config từ Firebase Console
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCFK0ROmclDB340RnTgAMGM6xiXgcMs7Vs",
    authDomain: "license-manager-b0e4e.firebaseapp.com",
    projectId: "license-manager-b0e4e",
    storageBucket: "license-manager-b0e4e.firebasestorage.app",
    messagingSenderId: "548643757194",
    appId: "1:548643757194:web:79fa0555acc0ccd9702173",
    measurementId: "G-7RWV4LEHP1"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
