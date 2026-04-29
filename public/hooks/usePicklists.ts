import { useState, useCallback } from "react";
import { collection, doc, getDocs, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface Picklist {
  id: string;
  name: string;
  teams: string[];
}

export function usePicklists(eventKey: string) {
  const [lists, setLists] = useState<Picklist[]>([]);
  const [saving, setSaving] = useState(false);

  const loadLists = useCallback(async () => {
    if (!eventKey) return;
    try {
      const snap = await getDocs(collection(db, `competitions/${eventKey}/lists`));
      setLists(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name as string,
          teams: d.data().teams as string[],
        }))
      );
    } catch (e) {
      console.error("[usePicklists] load error:", e);
    }
  }, [eventKey]);

  const saveList = useCallback(
    async (name: string, teams: string[]) => {
      if (!eventKey || !name.trim()) return;
      const id = name.trim().toLowerCase().replace(/\s+/g, "-");
      setSaving(true);
      try {
        await setDoc(
          doc(db, `competitions/${eventKey}/lists/${id}`),
          { name: name.trim(), teams, updatedAt: serverTimestamp() },
          { merge: true }
        );
        setLists((prev) => {
          const idx = prev.findIndex((l) => l.id === id);
          const entry = { id, name: name.trim(), teams };
          return idx >= 0 ? prev.map((l) => (l.id === id ? entry : l)) : [...prev, entry];
        });
      } catch (e) {
        console.error("[usePicklists] save error:", e);
      } finally {
        setSaving(false);
      }
    },
    [eventKey]
  );

  return { lists, saving, loadLists, saveList };
}
