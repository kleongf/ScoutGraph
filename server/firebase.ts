import { initializeApp, cert, getApps, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function initFirebase() {
  if (getApps().length > 0) return;

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath) {
    initializeApp({ credential: cert(credentialsPath) });
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    const serviceAccount: ServiceAccount = { projectId, clientEmail, privateKey };
    initializeApp({ credential: cert(serviceAccount) });
    return;
  }

  // Fall back to Application Default Credentials (gcloud auth, emulator, etc.)
  initializeApp();
}

initFirebase();

export const db = getFirestore();
