export function googleLensSearchUrl(imageUrl: string): string {
  return `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`;
}
