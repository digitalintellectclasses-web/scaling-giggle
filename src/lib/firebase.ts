import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";

// Hardcoded for production reliability (fixes missing Vercel environment variables)
const firebaseConfig = {
  apiKey: "AIzaSyD03j4ju-ROo6v7z1IIIiJsq6-u_CrjJpg",
  authDomain: "big-dreco-laptop-a644e.firebaseapp.com",
  databaseURL: "https://big-dreco-laptop-a644e-default-rtdb.firebaseio.com",
  projectId: "big-dreco-laptop-a644e",
  storageBucket: "big-dreco-laptop-a644e.firebasestorage.app",
  messagingSenderId: "643125630057",
  appId: "1:643125630057:web:f0e3ab399191d87cdabef8",
  measurementId: "G-KMB8SNKS9V"
};

// Initialization Diagnostic
if (typeof window !== 'undefined') {
  console.log('📡 Firebase Core initialized.');
  console.log('📁 Firestore using Long Polling:', true);
  console.log('💾 Firestore Cache: memory-only');
}

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);


// Use memoryLocalCache to force server-first data flow and fix 
// the 'hanging' sync issues common in serverless/proxied environments.
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: memoryLocalCache()
});

export { auth, db, app };

