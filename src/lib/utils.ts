import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getContrastingTextColor(hexColor: string | undefined): string {
  if (!hexColor || !hexColor.startsWith('#') || (hexColor.length !== 4 && hexColor.length !== 7)) {
    // If color is invalid, transparent, or not a hex, default to a sensible theme-neutral decision.
    // Assuming a generally light theme might be prevalent or a dark text on light background is safer.
    // However, since this function is used by components to decide on black/white,
    // defaulting to black is a simple choice.
    return '#000000';
  }

  let R = '', G = '', B = '';

  if (hexColor.length === 4) { // #RGB
    R = hexColor[1] + hexColor[1];
    G = hexColor[2] + hexColor[2];
    B = hexColor[3] + hexColor[3];
  } else if (hexColor.length === 7) { // #RRGGBB
    R = hexColor[1] + hexColor[2];
    G = hexColor[3] + hexColor[4];
    B = hexColor[5] + hexColor[6];
  }

  const r = parseInt(R, 16);
  const g = parseInt(G, 16);
  const b = parseInt(B, 16);

  // Calculate luminance (per WCAG YIQ formula simplified for sRGB)
  // L = 0.299*R + 0.587*G + 0.114*B
  // Threshold of 128 is common (middle of 0-255 range)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);

  return luminance > 128 ? '#000000' : '#FFFFFF';
}
