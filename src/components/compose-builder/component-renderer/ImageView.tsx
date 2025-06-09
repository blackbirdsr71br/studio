
'use client';
import type { BaseComponentProps } from '@/types/compose-spec';
import Image from 'next/image';

interface ImageViewProps {
  properties: BaseComponentProps;
}

export function ImageView({ properties }: ImageViewProps) {
  const { src = 'https://placehold.co/100x100.png', contentDescription = 'Image', width = 100, height = 100, padding = 0, "data-ai-hint": aiHint = "abstract pattern", cornerRadius = 0, contentScale = "Crop" } = properties;
  
  const containerStyle: React.CSSProperties = {
    padding: `${padding}px`,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    overflow: 'hidden', // To respect padding and contain image
    display: 'inline-block', // Or 'block' if it should take full width of its resizable container
    borderRadius: `${cornerRadius}px`, // Apply cornerRadius to the container
  };

  const imageWidth = typeof width === 'number' ? width - (padding * 2) : '100%';
  const imageHeight = typeof height === 'number' ? height - (padding * 2) : '100%';

  let objectFitClass = 'object-cover'; // Default for 'Crop'
  switch(contentScale) {
    case 'Fit': objectFitClass = 'object-contain'; break;
    case 'FillBounds': objectFitClass = 'object-fill'; break;
    case 'Inside': objectFitClass = 'object-scale-down'; break; // Similar to Jetpack Compose Inside
    case 'None': objectFitClass = 'object-none'; break;
    // FillWidth and FillHeight are trickier with just object-fit.
    // object-cover often gives a good "fill" appearance for fixed aspect ratio.
    // For true FillWidth/FillHeight without maintaining aspect ratio, object-fill (FillBounds) is closer.
    // If aspect ratio must be maintained for FillWidth/FillHeight, it would require different wrapper logic.
    // For simplicity, we'll map them to common object-fit values.
    case 'FillWidth': objectFitClass = 'object-cover'; break; // Or 'object-contain' if you want to see full height
    case 'FillHeight': objectFitClass = 'object-cover'; break; // Or 'object-contain' if you want to see full width
    default: objectFitClass = 'object-cover';
  }


  return (
    <div style={containerStyle} className="select-none w-full h-full"> {/* Ensure div takes full space for Next/Image */}
      <Image
        src={src as string}
        alt={contentDescription as string}
        width={typeof imageWidth === 'number' ? Math.max(1, imageWidth) : 100} 
        height={typeof imageHeight === 'number' ? Math.max(1, imageHeight) : 100} 
        className={`${objectFitClass} w-full h-full`} // Apply object-fit and ensure it fills the div
        data-ai-hint={aiHint as string}
        unoptimized // for placehold.co and other external non-optimized images, including data URIs
      />
    </div>
  );
}
