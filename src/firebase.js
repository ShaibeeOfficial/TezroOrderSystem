// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAnLAVtBamA06ZQYBiThrLYy6mRAGLQBL4",
  authDomain: "tezro-a8726.firebaseapp.com",
  projectId: "tezro-a8726",
  storageBucket: "tezro-a8726.firebasestorage.app",
  messagingSenderId: "257333070774",
  appId: "1:257333070774:web:ebdf6a9a29ddbb25554f17"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
