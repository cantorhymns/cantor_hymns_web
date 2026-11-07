import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a cantor ID or slug into a clean display title
 * e.g. "cantor-bola" -> "Cantor Bola", "Cantor bola" -> "Cantor Bola", "hics" -> "HICS",
 * or looks up from cantorsMap if provided, always enforcing proper Title Case.
 */
export function formatCantorName(
  cantorIdOrName: string,
  cantorsMap?: Map<string, { id: string; name?: string }> | Array<{ id: string; name?: string }>
): string {
  if (!cantorIdOrName) return '';

  let nameToFormat = cantorIdOrName;

  if (cantorsMap) {
    if (cantorsMap instanceof Map) {
      const match = cantorsMap.get(cantorIdOrName);
      if (match?.name) nameToFormat = match.name;
    } else if (Array.isArray(cantorsMap)) {
      const match = cantorsMap.find(c => c.id === cantorIdOrName);
      if (match?.name) nameToFormat = match.name;
    }
  }

  if (nameToFormat.trim().toLowerCase() === 'hics') {
    return 'HICS';
  }

  // If there are dashes or underscores (slug format) and no spaces, replace with spaces
  if (!nameToFormat.includes(' ') && (nameToFormat.includes('-') || nameToFormat.includes('_'))) {
    nameToFormat = nameToFormat.replace(/[-_]/g, ' ');
  }

  // Capitalize every word, keeping HICS uppercase
  return nameToFormat
    .split(/\s+/)
    .filter(Boolean)
    .map(word => {
      const lower = word.toLowerCase();
      if (lower === 'hics') return 'HICS';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

