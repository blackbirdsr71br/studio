import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 250 50"
      width="180"
      height="36"
      aria-label="UI Compose Architect Logo"
      {...props}
    >
      <rect width="250" height="50" rx="5" ry="5" fill="hsl(var(--primary))" />
      <text
        x="125"
        y="32"
        fontFamily="Inter, sans-serif"
        fontSize="22"
        fontWeight="bold"
        fill="hsl(var(--primary-foreground))"
        textAnchor="middle"
        className="font-headline"
      >
        UI Compose Architect
      </text>
    </svg>
  );
}
