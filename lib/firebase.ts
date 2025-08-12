import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getDatabase } from "firebase/database"

 const firebaseConfig = {
      apiKey: "AIzaSyCyxjEz8m5XgcyKQT_MenE2nF3ee5f6njE",
      authDomain: "firegram-by-uzair.firebaseapp.com",
      databaseURL: "https://firegram-by-uzair-default-rtdb.firebaseio.com",
      projectId: "firegram-by-uzair",
      storageBucket: "firegram-by-uzair.firebasestorage.app",
      messagingSenderId: "372370171931",
      appId: "1:372370171931:web:70865a6e1de4ecf80870be"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const database = getDatabase(app)
export default app
