// Firebase Configuration for Food Recalls Qatar
const firebaseConfig = {
  apiKey: "AIzaSyA40z9WXGYOloDsUyoc3NQLrTuQVY3SF08",
  authDomain: "food-recalls-qatar.firebaseapp.com",
  projectId: "food-recalls-qatar",
  storageBucket: "food-recalls-qatar.firebasestorage.app",
  messagingSenderId: "188639968364",
  appId: "1:188639968364:web:d83d570a4fd8db88d1ee8a",
  measurementId: "G-LGS8SKBF46"
};

// Initialize Firebase
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics, firebaseConfig };
