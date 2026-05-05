import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  doc, updateDoc, deleteDoc, getDoc,
  query, orderBy, limit, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const app = initializeApp({
  apiKey:            "AIzaSyDe2lk9OGhRzzX7bsSv7T4OIqZyldjLN8w",
  authDomain:        "beak-2ad1f.firebaseapp.com",
  projectId:         "beak-2ad1f",
  storageBucket:     "beak-2ad1f.firebasestorage.app",
  messagingSenderId: "387132342574",
  appId:             "1:387132342574:web:ceaf9d42665df03f9ababf"
});

export const db   = getFirestore(app);
export const auth = getAuth(app);
export {
  collection, addDoc, getDocs,
  doc, updateDoc, deleteDoc, getDoc,
  query, orderBy, limit, increment, serverTimestamp,
  signInWithEmailAndPassword, signOut, onAuthStateChanged
};
