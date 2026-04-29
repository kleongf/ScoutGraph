import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
//   measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
// };
const firebaseConfig = {
  apiKey: "AIzaSyCsyeEScLUkaUukUmWYN4UFePwZMEK4STc",
  authDomain: "rebuiltscouting.firebaseapp.com",
  projectId: "rebuiltscouting",
  storageBucket: "rebuiltscouting.firebasestorage.app",
  messagingSenderId: "1047240648935",
  appId: "1:1047240648935:web:5a91995b1852a759525a42",
  measurementId: "G-8FC30CWN5L"
};

const alreadyInitialized = getApps().length > 0;
const app = alreadyInitialized ? getApps()[0] : initializeApp(firebaseConfig);

console.log("[firebase] init — already existed:", alreadyInitialized);
console.log("[firebase] projectId:", firebaseConfig.projectId);
console.log("[firebase] apiKey prefix:", firebaseConfig.apiKey?.slice(0, 8));

export const db = getFirestore(app);
console.log("[firebase] db ready, app name:", app.name);
