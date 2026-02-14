
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAinxlOhOZYdNZYr8q8qNvx_-pln195XRY",
  authDomain: "spaceaduans-aigit-956472-f2243.firebaseapp.com",
  projectId: "spaceaduans-aigit-956472-f2243",
  storageBucket: "spaceaduans-aigit-956472-f2243.appspot.com",
  messagingSenderId: "684109081771",
  appId: "1:684109081771:web:e7ac6491d2a2358e5b9bee"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'us-central1');
