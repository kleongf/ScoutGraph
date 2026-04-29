import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { MatchRecord } from "../types";

export interface MatchHistoryState {
  matches: MatchRecord[];
  loading: boolean;
  error: string | null;
}

export function useTeamMatchHistory(
  eventKey: string,
  teamNumber: string
): MatchHistoryState {
  const [state, setState] = useState<MatchHistoryState>({
    matches: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!eventKey || !teamNumber) return;

    setState({ matches: [], loading: true, error: null });

    (async () => {
      try {
        // Dump top-level competitions collection for debugging
        const compSnap = await getDocs(collection(db, "competitions"));
        console.log("[useTeamMatchHistory] competitions docs:", compSnap.docs.map((d) => ({ id: d.id, data: d.data() })));

        const col = collection(db, `competitions/${eventKey}/teams/${teamNumber}/matches`);
        console.log("[useTeamMatchHistory] querying path: competitions/" + eventKey + "/teams/" + teamNumber + "/matches");
        const snap = await getDocs(col);
        console.log("[useTeamMatchHistory] got", snap.size, "matches");

        const records: MatchRecord[] = snap.docs
          .map((d) => {
            const data = d.data();
            const endgame = data.endgame ?? {};
            return {
              matchNumber: data.matchNumber as number,
              matchKey: data.matchKey as string,
              autoFuel: (data.auto?.fuelScored ?? 0) as number,
              teleopFuel: (data.teleop?.fuelScored ?? 0) as number,
              fuelShuttled: (data.teleop?.fuelShuttled ?? 0) as number,
              fuelPrevented: (data.teleop?.fuelPrevented ?? 0) as number,
              playedDefense: (data.teleop?.playedDefense ?? false) as boolean,
              bricked: (data.teleop?.bricked ?? false) as boolean,
              beached: (data.teleop?.beached ?? false) as boolean,
              climbAttempted: (endgame.climbAttempted ?? false) as boolean,
              climbLevel: endgame.climbAttempted
                ? ((endgame.climbLevel ?? 0) as number)
                : 0,
              driverRating: (data.driverRating ?? 0) as number,
              notes: (data.notes ?? "") as string,
            };
          })
          .sort((a, b) => a.matchNumber - b.matchNumber);

        setState({ matches: records, loading: false, error: null });
      } catch (e) {
        console.error("[useTeamMatchHistory] Firestore error:", e);
        setState({
          matches: [],
          loading: false,
          error: (e as Error).message,
        });
      }
    })();
  }, [eventKey, teamNumber]);

  return state;
}
