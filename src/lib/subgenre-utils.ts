/**
 * Utility functions for parsing, querying, and updating the liturgical subgenre
 * layout defined in genre.content text strings.
 */

export interface SubgenreSection {
  name: string; // e.g. "Vespers", "Liturgy", or "" for general/top-level
  hymnIds: string[];
}

/**
 * Parse a genre's content string into structured sections.
 */
export function parseGenreContent(content?: string): SubgenreSection[] {
  if (!content || !content.trim()) return [];

  const sections: SubgenreSection[] = [];
  let currentSection: SubgenreSection = { name: '', hymnIds: [] };

  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('subGenre:')) {
      const name = trimmed.substring('subGenre:'.length).trim();
      if (currentSection.name || currentSection.hymnIds.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { name, hymnIds: [] };
    } else {
      currentSection.hymnIds.push(trimmed);
    }
  });

  if (currentSection.name || currentSection.hymnIds.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Serialize structured sections back into the genre content string format.
 */
export function serializeGenreContent(sections: SubgenreSection[]): string {
  const lines: string[] = [];
  for (const sec of sections) {
    if (sec.name) {
      lines.push(`subGenre:${sec.name}`);
    }
    for (const id of sec.hymnIds) {
      lines.push(id);
    }
  }
  return lines.join('\n');
}

/**
 * Get all existing unique subgenre names in a season's content.
 */
export function getAvailableSubgenres(content?: string): string[] {
  const sections = parseGenreContent(content);
  const names: string[] = [];
  for (const sec of sections) {
    if (sec.name && !names.includes(sec.name)) {
      names.push(sec.name);
    }
  }
  return names;
}

/**
 * Find which subgenre a hymn belongs to within a genre's content string.
 * Returns null if the hymn is not in a named subgenre.
 */
export function getHymnSubgenre(content: string | undefined, hymnId: string): string | null {
  const sections = parseGenreContent(content);
  for (const sec of sections) {
    if (sec.hymnIds.includes(hymnId)) {
      return sec.name || null;
    }
  }
  return null;
}

/**
 * Assign a hymn to a specific subgenre within a genre's content string.
 * Passing targetSubgenre = null or "" removes the hymn from named subgenres.
 */
export function setHymnSubgenre(
  content: string | undefined,
  hymnId: string,
  targetSubgenre: string | null
): string {
  const sections = parseGenreContent(content);

  // Remove hymn from all existing sections
  for (const sec of sections) {
    sec.hymnIds = sec.hymnIds.filter(id => id !== hymnId);
  }

  if (targetSubgenre && targetSubgenre.trim()) {
    const cleanTarget = targetSubgenre.trim();
    let sec = sections.find(s => s.name.toLowerCase() === cleanTarget.toLowerCase());
    if (!sec) {
      sec = { name: cleanTarget, hymnIds: [] };
      sections.push(sec);
    }
    if (!sec.hymnIds.includes(hymnId)) {
      sec.hymnIds.push(hymnId);
    }
  }

  // Filter out empty sections that have no name or no hymns
  const filtered = sections.filter(s => s.name || s.hymnIds.length > 0);
  return serializeGenreContent(filtered);
}

/**
 * Remove a hymn completely from a genre's content.
 */
export function removeHymnFromGenre(content: string | undefined, hymnId: string): string {
  return setHymnSubgenre(content, hymnId, null);
}

/**
 * Add a new empty subgenre to a genre's content.
 */
export function addSubgenre(content: string | undefined, subgenreName: string): string {
  const clean = subgenreName.trim();
  if (!clean) return content || '';
  const sections = parseGenreContent(content);
  if (sections.some(s => s.name.toLowerCase() === clean.toLowerCase())) {
    return content || '';
  }
  sections.push({ name: clean, hymnIds: [] });
  return serializeGenreContent(sections);
}

/**
 * Rename an existing subgenre in a genre's content.
 */
export function renameSubgenre(content: string | undefined, oldName: string, newName: string): string {
  const cleanOld = oldName.trim().toLowerCase();
  const cleanNew = newName.trim();
  if (!cleanNew || cleanOld === cleanNew.toLowerCase()) return content || '';

  const sections = parseGenreContent(content);
  for (const sec of sections) {
    if (sec.name.toLowerCase() === cleanOld) {
      sec.name = cleanNew;
    }
  }
  return serializeGenreContent(sections);
}

/**
 * Delete a subgenre from a genre's content.
 * Hymns previously in that subgenre can either be removed or placed into uncategorized.
 */
export function deleteSubgenre(content: string | undefined, subgenreName: string): string {
  const clean = subgenreName.trim().toLowerCase();
  const sections = parseGenreContent(content);
  const filtered = sections.filter(s => s.name.toLowerCase() !== clean);
  return serializeGenreContent(filtered);
}

/**
 * Reorder subgenres within a genre's content.
 */
export function reorderSubgenres(content: string | undefined, newOrder: string[]): string {
  const sections = parseGenreContent(content);
  const orderMap = new Map(newOrder.map((name, idx) => [name.toLowerCase(), idx]));

  sections.sort((a, b) => {
    const idxA = orderMap.has(a.name.toLowerCase()) ? orderMap.get(a.name.toLowerCase())! : 999;
    const idxB = orderMap.has(b.name.toLowerCase()) ? orderMap.get(b.name.toLowerCase())! : 999;
    return idxA - idxB;
  });

  return serializeGenreContent(sections);
}

/**
 * Reorder hymns within a specific subgenre.
 */
export function reorderHymnsWithinSubgenre(
  content: string | undefined,
  subgenreName: string,
  newHymnIds: string[]
): string {
  const clean = subgenreName.trim().toLowerCase();
  const sections = parseGenreContent(content);
  const target = sections.find(s => s.name.toLowerCase() === clean);
  if (target) {
    target.hymnIds = newHymnIds;
  }
  return serializeGenreContent(sections);
}
