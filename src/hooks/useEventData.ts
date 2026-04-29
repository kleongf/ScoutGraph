import { useState, useRef, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { fetchTeamsAtEvent } from "../lib/tba";
import { fetchEPAsBatched } from "../lib/statbotics";
import type { TeamEntry, TeamStats } from "../types";

export interface EventDataState {
  teams: TeamEntry[];
  loading: boolean;
  epaProgress: number; // 0–1
  error: string | null;
}

export function useEventData(): EventDataState & { load: (eventKey: string) => void } {
  const [state, setState] = useState<EventDataState>({
    teams: [],
    loading: false,
    epaProgress: 0,
    error: null,
  });

  const abortRef = useRef(false);

  const load = useCallback((eventKey: string) => {
    if (!eventKey) return;

    abortRef.current = true; // cancel any in-flight load
    abortRef.current = false;
    setState({ teams: [], loading: true, epaProgress: 0, error: null });

    (async () => {
      try {
        // 1. Get team list from TBA (avoids querying phantom Firestore collection docs)
        const teamNumbers = await fetchTeamsAtEvent(eventKey);
        console.log("[useEventData] TBA returned", teamNumbers.length, "teams");

        if (abortRef.current) return;

        if (teamNumbers.length === 0) {
          setState({
            teams: [],
            loading: false,
            epaProgress: 1,
            error: `No teams found for event "${eventKey}" on The Blue Alliance.`,
          });
          return;
        }

        // 2. Fetch pre-computed stats for each team via getDoc on known paths
        const statsResults = await Promise.all(
          teamNumbers.map(async (tn) => {
            const ref = doc(db, `competitions/${eventKey}/teams/${tn}/stats/current`);
            const snap = await getDoc(ref);
            return {
              teamNumber: tn,
              stats: snap.exists() ? (snap.data() as TeamStats) : null,
            };
          })
        );

        if (abortRef.current) return;

        const initialTeams: TeamEntry[] = statsResults.map((r) => ({
          teamNumber: r.teamNumber,
          stats: r.stats,
          epa: null,
          epaLoading: true,
        }));

        setState((prev) => ({
          ...prev,
          teams: initialTeams,
          loading: false,
          epaProgress: 0,
        }));

        // 3. Fetch EPAs in batches, updating state progressively
        let fetched = 0;
        const year = eventKey.slice(0, 4);

        await fetchEPAsBatched(teamNumbers, year, 12, (batchResults) => {
          if (abortRef.current) return;
          fetched += Object.keys(batchResults).length;
          const progress = fetched / teamNumbers.length;

          setState((prev) => ({
            ...prev,
            epaProgress: progress,
            teams: prev.teams.map((t) =>
              t.teamNumber in batchResults
                ? { ...t, epa: batchResults[t.teamNumber], epaLoading: false }
                : t
            ),
          }));
        });

        if (abortRef.current) return;
        setState((prev) => ({ ...prev, epaProgress: 1 }));
      } catch (e) {
        console.error("[useEventData] error:", e);
        if (!abortRef.current) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: (e as Error).message,
          }));
        }
      }
    })();
  }, []);

  return { ...state, load };
}
