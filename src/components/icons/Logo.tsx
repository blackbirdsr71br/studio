
'use client';

export function Logo() {
  return (
    <div className="h-14 w-auto flex items-center" aria-label="UI Compose Builder Logo">
      <svg 
        viewBox="0 0 200 50" 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <style>
          {`
            .logo-text { font-family: 'Inter', sans-serif; fill: #3F51B5; }
            .logo-shape-1 { fill: #9C27B0; }
            .logo-shape-2 { fill: #3F51B5; }
          `}
        </style>
        
        <rect x="5" y="5" width="40" height="40" rx="8" className="logo-shape-1" />
        <rect x="15" y="15" width="20" height="20" rx="4" fill="#FFFFFF" />
        
        <g className="logo-text">
          <text x="58" y="28" fontSize="22" fontWeight="700">UI Compose</text>
          <text x="58" y="46" fontSize="14" fontWeight="500" fill="#6B7280">Builder</text>
        </g>
      </svg>
    </div>
  );
}
