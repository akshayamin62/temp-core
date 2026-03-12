/**
 * University classification utility.
 * Classifies a university name as 'ivy-league', 'russell-group', or null (normal).
 * Uses keyword matching so partial / variant names still resolve correctly.
 */

export type UniversityCategory = 'ivy-league' | 'russell-group' | null;

// Each entry is an array of lowercase keywords — any match tags that university
const IVY_LEAGUE_KEYWORDS: string[][] = [
  ['harvard'],
  ['yale'],
  ['princeton'],
  ['columbia university', 'columbia college new york'],
  ['brown university'],
  ['dartmouth'],
  ['cornell'],
  ['university of pennsylvania', 'upenn', 'u penn'],
];

const RUSSELL_GROUP_KEYWORDS: string[][] = [
  ['university of birmingham'],
  ['university of bristol'],
  ['university of cambridge', 'cambridge university'],
  ['cardiff university'],
  ['durham university', 'university of durham'],
  ['university of edinburgh'],
  ['university of exeter'],
  ['university of glasgow'],
  ['imperial college'],
  ["king's college london", 'kings college london', 'kcl'],
  ['university of leeds'],
  ['university of liverpool'],
  ['london school of economics', 'lse'],
  ['university of manchester'],
  ['newcastle university', 'university of newcastle'],
  ['university of nottingham'],
  ['university of oxford', 'oxford university'],
  ['queen mary university of london', 'qmul'],
  ["queen's university belfast", 'queens university belfast'],
  ['university of sheffield'],
  ['university of southampton'],
  ['university college london', 'ucl'],
  ['university of warwick'],
  ['university of york'],
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/['']/g, "'")          // smart apostrophes → straight
    .replace(/[^a-z0-9\s']/g, ' ')  // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesGroup(universityName: string, groups: string[][]): boolean {
  const n = normalize(universityName);
  return groups.some((keywords) =>
    keywords.some((kw) => n.includes(normalize(kw)))
  );
}

export function classifyUniversity(universityName: string): UniversityCategory {
  if (!universityName) return null;
  if (matchesGroup(universityName, IVY_LEAGUE_KEYWORDS)) return 'ivy-league';
  if (matchesGroup(universityName, RUSSELL_GROUP_KEYWORDS)) return 'russell-group';
  return null;
}
