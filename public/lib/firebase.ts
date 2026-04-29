// Single re-export so all frontend code can import from either path and
// always get the same Firebase app instance initialized in firebaseConfig.ts.
export { db } from "../config/firebaseConfig";
