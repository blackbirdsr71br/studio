'use client';
import React from 'react';

interface SelectionOverlayProps {
  selectionRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
}

export function SelectionOverlay({ selectionRect }: SelectionOverlayProps) {
  if (!selectionRect) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute z-50 border-2 border-primary"
      style={{
        top: `${selectionRect.top}px`,
        left: `${selectionRect.left}px`,
        width: `${selectionRect.width}px`,
        height: `${selectionRect.height}px`,
        boxSizing: 'border-box',
      }}
    />
  );
}
