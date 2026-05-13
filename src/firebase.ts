import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA6jkgQ_V-PE_VEBMGPGis4smL3PXzjseU",
  authDomain: "chaye-cafe-pos.firebaseapp.com",
  projectId: "chaye-cafe-pos",
  storageBucket: "chaye-cafe-pos.firebasestorage.app",
  messagingSenderId: "1012843986143",
  appId: "1:1012843986143:web:d3a1c260acbe1c058cbd6a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

enableIndexedDbPersistence(db).catch(console.error);