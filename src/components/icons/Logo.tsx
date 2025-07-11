
import * as React from "react";

export function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient
          id="logo-gradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" style={{ stopColor: "hsl(var(--primary))" }} />
          <stop offset="100%" style={{ stopColor: "hsl(var(--accent))" }} />
        </linearGradient>
      </defs>
      <path
        d="M50 0L100 28.87V86.6L50 115.47L0 86.6V28.87L50 0Z"
        transform="scale(0.8) translate(12.5, -5)"
        fill="url(#logo-gradient)"
        opacity="0.3"
      />
      <path
        d="M50 13.33L88.87 36.22V81.99L50 104.88L11.13 81.99V36.22L50 13.33Z"
        transform="scale(0.8) translate(12.5, -5)"
        fill="url(#logo-gradient)"
      />
    </svg>
  );
}
