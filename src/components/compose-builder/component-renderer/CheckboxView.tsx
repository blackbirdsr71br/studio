
'use client';

import type { BaseComponentProps } from '@/types/compose-spec';

interface CheckboxViewProps {
  properties: BaseComponentProps;
}

export function CheckboxView({ properties }: CheckboxViewProps) {
  const {
    text = 'Checkbox',
    checked = false,
    enabled = true,
  } = properties;

  return (
    <div className="flex items-center space-x-2 select-none p-1">
      <div
        className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
          checked ? 'bg-primary border-primary' : 'bg-transparent border-gray-400'
        } ${!enabled ? 'opacity-50' : ''}`}
      >
        {checked && (
          <svg
            className="w-4 h-4 text-primary-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
        )}
      </div>
      {text && <span className={`text-sm ${!enabled ? 'text-muted-foreground' : ''}`}>{text}</span>}
    </div>
  );
}
