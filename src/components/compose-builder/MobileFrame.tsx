'use client';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext'; // Import useTheme

interface MobileFrameProps {
  children: ReactNode;
  className?: string;
}

// Target screen dimensions: 432px width, 896px height
const SCREEN_WIDTH_TARGET = 432; // Pure screen width
const SCREEN_HEIGHT_TARGET = 896; // Pure screen height

const FRAME_BODY_PADDING = 8; // Equivalent to p-2 for the phone body's bezel around the screen area container
const SPEAKER_BAR_HEIGHT = 24; // h-6
const SPEAKER_BAR_MARGIN_BOTTOM = 4; // mb-1

// Calculate total frame dimensions
export const FRAME_WIDTH = SCREEN_WIDTH_TARGET + (FRAME_BODY_PADDING * 2);
export const FRAME_HEIGHT = SCREEN_HEIGHT_TARGET + (FRAME_BODY_PADDING * 2) + SPEAKER_BAR_HEIGHT + SPEAKER_BAR_MARGIN_BOTTOM;

export function MobileFrame({ children, className }: MobileFrameProps) {
  const { resolvedTheme } = useTheme();

  const frameBodyColor = resolvedTheme === 'dark' ? 'bg-neutral-300' : 'bg-neutral-900';
  const speakerBarColor = resolvedTheme === 'dark' ? 'bg-neutral-400' : 'bg-neutral-950';

  return (
    <div
      className={cn(
        "rounded-[44px] shadow-xl mx-auto my-auto flex flex-col",
        frameBodyColor,
        className
      )}
      style={{
        width: `${FRAME_WIDTH}px`,
        height: `${FRAME_HEIGHT}px`,
        padding: `${FRAME_BODY_PADDING}px`
      }}
    >
      {/* Top speaker/sensor bar */}
      <div 
        className={cn(
          "w-28 mx-auto rounded-b-xl shrink-0",
          speakerBarColor
        )}
        style={{ 
          height: `${SPEAKER_BAR_HEIGHT}px`,
          marginBottom: `${SPEAKER_BAR_MARGIN_BOTTOM}px`
        }}
      ></div>
      
      {/* Screen Area */}
      <div 
        className={cn(
          "bg-background overflow-hidden rounded-[32px] w-full flex-grow" 
        )}
        // The actual screen content area will be SCREEN_WIDTH_TARGET x SCREEN_HEIGHT_TARGET
        // because DesignSurface inside this will be w-full h-full.
      >
        {children} {/* DesignSurface will go here */}
      </div>
    </div>
  );
}
