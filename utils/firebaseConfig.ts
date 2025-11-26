import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your actual Firebase Web Configuration
// You can find this in Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
    apiKey: "AIzaSyAzQZY7PygvZMQGilk3Y3u_zVfUGr_8dF4",
    authDomain: "matix-573eb.firebaseapp.com",
    projectId: "matix-573eb",
    storageBucket: "matix-573eb.firebasestorage.app",
    messagingSenderId: "979802238732",
    appId: "1:979802238732:web:01e5a2e8597373e847a329"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
