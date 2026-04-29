const MEAN_SCORE = 156.11;
const STANDARD_DEVIATION = 107.91;

function unitlessToEpa(u: number): number {
  return STANDARD_DEVIATION * ((u - 1500) / 250) + MEAN_SCORE / 3.0;
}

export async function fetchTeamEPA(
  teamNumber: string,
  year: string
): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.statbotics.io/v3/team_year/${teamNumber}/${year}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { epa?: { unitless?: number } };
    const u = data.epa?.unitless;
    return u != null ? unitlessToEpa(u) : null;
  } catch {
    return null;
  }
}

// Fetch EPA for many teams in parallel batches to avoid hammering the API.
export async function fetchEPAsBatched(
  teamNumbers: string[],
  year: string,
  batchSize = 12,
  onBatch?: (results: Record<string, number | null>) => void
): Promise<Record<string, number | null>> {
  const all: Record<string, number | null> = {};

  for (let i = 0; i < teamNumbers.length; i += batchSize) {
    const batch = teamNumbers.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (t) => [t, await fetchTeamEPA(t, year)] as const)
    );
    const batchRecord = Object.fromEntries(results);
    Object.assign(all, batchRecord);
    onBatch?.(batchRecord);
  }

  return all;
}
