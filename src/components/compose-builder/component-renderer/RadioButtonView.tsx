
'use client';

import type { BaseComponentProps } from '@/types/compose-spec';

interface RadioButtonViewProps {
  properties: BaseComponentProps;
}

export function RadioButtonView({ properties }: RadioButtonViewProps) {
  const {
    text = 'Radio Button',
    selected = false,
    enabled = true,
  } = properties;

  return (
    <div className="flex items-center space-x-2 select-none p-1">
      <div
        className={`w-5 h-5 border-2 rounded-full flex items-center justify-center transition-colors ${
          selected ? 'border-primary' : 'border-gray-400'
        } ${!enabled ? 'opacity-50' : ''}`}
      >
        {selected && (
          <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
        )}
      </div>
      {text && <span className={`text-sm ${!enabled ? 'text-muted-foreground' : ''}`}>{text}</span>}
    </div>
  );
}
