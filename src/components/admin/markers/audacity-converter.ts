/**
 * Audacity Label Track Import / Export Utilities
 * Audacity export format is tab-delimited:
 * [start_time_seconds]\t[end_time_seconds]\t[label_name]
 */

export function parseAudacityLabels(rawText: string): {
  markers: number[];
  labels: string[];
} {
  const lines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const markersSet = new Set<number>();
  const labels: string[] = [];

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length >= 1) {
      const startTime = parseFloat(parts[0].trim());
      if (!isNaN(startTime) && startTime >= 0) {
        markersSet.add(Math.round(startTime * 1000) / 1000);
      }
      if (parts.length >= 3) {
        labels.push(parts[2].trim());
      }
    }
  }

  const markers = Array.from(markersSet).sort((a, b) => a - b);
  return { markers, labels };
}

export function exportAudacityLabels(
  markers: number[],
  audioLength: number,
  labels?: string[]
): string {
  if (markers.length === 0) return '';

  const rows: string[] = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i];
    const end = i + 1 < markers.length ? markers[i + 1] : Math.max(start + 1, audioLength);
    const label = labels && labels[i] ? labels[i] : `${i + 1}`;
    rows.push(`${start.toFixed(6)}\t${end.toFixed(6)}\t${label}`);
  }

  return rows.join('\n');
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
