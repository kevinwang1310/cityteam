export const SHOE_RULE_START = '2026-11-28';
type Participant = { id: string; dateFirstJoined?: string; fiveKCompletedDate?: string };
type Records = {
  runs: { id: string; date: string }[];
  attendance: { runnerId: string; runId: string; attended: boolean }[];
  raceResults: { runnerId: string; runId: string; finishSeconds: number }[];
};
export function shoeEligibility(state: Records, runner: Participant) {
  const attended = new Set(state.attendance.filter(a => a.runnerId === runner.id && a.attended).map(a => a.runId));
  const dates = state.runs.filter(r => attended.has(r.id)).map(r => r.date).sort();
  const joined = [runner.dateFirstJoined, dates[0]].filter((d): d is string => Boolean(d)).sort()[0];
  const newRule = !joined || joined >= SHOE_RULE_START;
  const requiredRuns = newRule ? 6 : 4;
  const raceDates = state.raceResults.filter(r => r.runnerId === runner.id && r.finishSeconds > 0)
    .map(r => state.runs.find(run => run.id === r.runId)?.date);
  const raceDate = [...raceDates, runner.fiveKCompletedDate].filter((d): d is string => Boolean(d)).sort()[0];
  const runDate = dates[requiredRuns - 1];
  const earnedOn = runDate && (!newRule || raceDate) ? (newRule && raceDate > runDate ? raceDate : runDate) : undefined;
  const remaining = Math.max(0, requiredRuns - dates.length);
  const progress = [remaining ? `${remaining} more ${remaining === 1 ? 'run' : 'runs'}` : '', newRule && !raceDate ? 'a completed 5K race' : ''].filter(Boolean).join(' and ');
  return { newRule, requiredRuns, earned: Boolean(earnedOn), earnedOn, raceDate,
    earnedAtRun: earnedOn ? dates.filter(d => d <= earnedOn).length : undefined,
    label: earnedOn ? 'New shoes earned' : `${progress} to earn new shoes` };
}
