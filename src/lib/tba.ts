const TBA_BASE = "https://www.thebluealliance.com/api/v3";
const TBA_KEY = import.meta.env.VITE_TBA_AUTH_KEY ?? "";

export async function fetchTeamsAtEvent(eventKey: string): Promise<string[]> {
  const res = await fetch(`${TBA_BASE}/event/${eventKey}/teams/simple`, {
    headers: { "X-TBA-Auth-Key": TBA_KEY },
  });
  if (!res.ok) throw new Error(`TBA error ${res.status} fetching teams for ${eventKey}`);
  const data = (await res.json()) as Array<{ team_number: number }>;
  return data
    .map((t) => String(t.team_number))
    .sort((a, b) => Number(a) - Number(b));
}
