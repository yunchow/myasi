export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

export function generateLayerColor(layerId: string): string {
  // Predefined subtle palette for backgrounds (very faint/dark versions of colors)
  // Avoiding gray and pure duplicates, aiming for "natural transition" and "slightly different"
  // We use very dark tones with a hint of color.
  const palette = [
    '#1A242F', // Dark Slate Blue
    '#1A2F24', // Dark Jungle Green
    '#2F241A', // Dark Bronze
    '#2F1A1F', // Dark Burgundy
    '#241A2F', // Dark Deep Purple
    '#1A2A2F', // Dark Cyan
    '#2A2A1E', // Dark Olive
    '#2A1F1A', // Dark Brown
    '#1F2A24'  // Dark Forest
  ];
  
  let hash = 0;
  for (let i = 0; i < layerId.length; i++) {
    hash = layerId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return palette[Math.abs(hash) % palette.length];
}

export function generateGradient(id: string): string {
   const color = generateLayerColor(id);
   // Create a very subtle gradient
   // Using the color as base and fading to a slightly darker/neutral tone
   return `linear-gradient(135deg, ${color} 0%, #161618 100%)`;
}
