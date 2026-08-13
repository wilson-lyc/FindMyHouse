export function formatDistanceShort(meters: number): string {
  if (meters >= 1000) {
    return (meters / 1000).toFixed(1) + 'km';
  }
  return Math.round(meters) + 'm';
}

export function formatDurationShort(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.round(seconds / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return hours + 'h' + (mins > 0 ? mins + 'min' : '');
    }
    return minutes + 'min';
  }
  return Math.round(seconds) + 's';
}
