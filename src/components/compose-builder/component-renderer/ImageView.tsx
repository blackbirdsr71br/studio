'use client';
import type { BaseComponentProps } from '@/types/compose-spec';
import Image from 'next/image';

interface ImageViewProps {
  properties: BaseComponentProps;
}

export function ImageView({ properties }: ImageViewProps) {
  const { src = 'https://placehold.co/100x100.png', contentDescription = 'Image', width = 100, height = 100, padding = 0, "data-ai-hint": aiHint = "placeholder" } = properties;
  
  const containerStyle: React.CSSProperties = {
    padding: `${padding}px`,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    overflow: 'hidden', // To respect padding and contain image
    display: 'inline-block',
  };

  const imageWidth = typeof width === 'number' ? width - (padding * 2) : '100%';
  const imageHeight = typeof height === 'number' ? height - (padding * 2) : '100%';


  return (
    <div style={containerStyle} className="select-none">
      <Image
        src={src as string}
        alt={contentDescription as string}
        width={typeof imageWidth === 'number' ? Math.max(1, imageWidth) : 100} // Ensure positive width for NextImage
        height={typeof imageHeight === 'number' ? Math.max(1, imageHeight) : 100} // Ensure positive height
        className="object-cover w-full h-full" // object-cover to fill dimensions
        data-ai-hint={aiHint}
        unoptimized // for placehold.co and other external non-optimized images
      />
    </div>
  );
}
