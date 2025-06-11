
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getContrastingTextColor(hexColor: string | undefined): string {
  if (!hexColor || !hexColor.startsWith('#') || (hexColor.length !== 4 && hexColor.length !== 7)) {
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
  } else {
    return '#000000'; // Should not happen due to initial check
  }

  const r = parseInt(R, 16);
  const g = parseInt(G, 16);
  const b = parseInt(B, 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);

  return luminance > 128 ? '#000000' : '#FFFFFF';
}

export function hexToHsl(hex: string): { h: number, s: number, l: number } | null {
  hex = hex.replace(/^#/, '');

  let r_num: number, g_num: number, b_num: number;
  if (hex.length === 3) {
    r_num = parseInt(hex[0] + hex[0], 16);
    g_num = parseInt(hex[1] + hex[1], 16);
    b_num = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r_num = parseInt(hex.substring(0, 2), 16);
    g_num = parseInt(hex.substring(2, 4), 16);
    b_num = parseInt(hex.substring(4, 6), 16);
  } else {
    return null; 
  }

  const r = r_num / 255;
  const g = g_num / 255;
  const b = b_num / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hexToHslCssString(hex: string): string | null {
    const hsl = hexToHsl(hex);
    if (!hsl) return null;
    return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}
