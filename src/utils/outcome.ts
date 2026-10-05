export type Outcome = 'won' | 'lost' | 'tied';

export const outcomeOf = (mine: number, theirs: number): Outcome =>
  mine === theirs ? 'tied' : mine > theirs ? 'won' : 'lost';

/** "Won by 1,349", "Lost by 120" or "Tied", from your point of view. */
export const marginLabel = (mine: number, theirs: number) => {
  const outcome = outcomeOf(mine, theirs);
  const margin = Math.abs(mine - theirs).toLocaleString();
  return outcome === 'tied' ? 'Tied' : `${outcome === 'won' ? 'Won' : 'Lost'} by ${margin}`;
};
