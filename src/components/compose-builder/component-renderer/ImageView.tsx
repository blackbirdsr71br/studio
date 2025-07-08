
'use client';
import type { BaseComponentProps } from '@/types/compose-spec';
import Image from 'next/image';

interface ImageViewProps {
  properties: BaseComponentProps;
  isPreview?: boolean;
}

export function ImageView({ properties, isPreview = false }: ImageViewProps) {
  const {
    src: rawSrc,
    contentDescription = 'Image',
    // width and height from props are now used by RenderedComponentWrapper, not directly here for sizing
    padding, // All sides padding
    paddingTop,
    paddingBottom,
    paddingStart,
    paddingEnd,
    "data-ai-hint": aiHint = "abstract pattern",
    cornerRadiusTopLeft = 0,
    cornerRadiusTopRight = 0,
    cornerRadiusBottomRight = 0,
    cornerRadiusBottomLeft = 0,
    contentScale = "Crop",
    backgroundColor,
  } = properties;

  // This is a critical fix. An empty string "" for src is an error in Next.js.
  // This ensures we always have a valid placeholder if the src is missing or empty.
  const src = (rawSrc && rawSrc.trim() !== '') ? rawSrc : 'https://placehold.co/300x200.png';

  const effectivePaddingTop = paddingTop ?? padding ?? 0;
  const effectivePaddingBottom = paddingBottom ?? padding ?? 0;
  const effectivePaddingStart = paddingStart ?? padding ?? 0;
  const effectivePaddingEnd = paddingEnd ?? 0;

  const containerStyle: React.CSSProperties = {
    paddingTop: `${effectivePaddingTop}px`,
    paddingBottom: `${effectivePaddingBottom}px`,
    paddingLeft: `${effectivePaddingStart}px`,
    paddingRight: `${effectivePaddingEnd}px`,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    display: 'block',
    boxSizing: 'border-box',
    borderTopLeftRadius: `${cornerRadiusTopLeft}px`,
    borderTopRightRadius: `${cornerRadiusTopRight}px`,
    borderBottomRightRadius: `${cornerRadiusBottomRight}px`,
    borderBottomLeftRadius: `${cornerRadiusBottomLeft}px`,
    // Add a default background color to ensure visibility even if the image fails to load
    backgroundColor: backgroundColor || 'hsl(var(--muted))',
    position: 'relative', // Required for next/image with fill
  };

  let objectFit: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down' = 'cover';
  if (isPreview) {
    objectFit = 'contain'; // Force 'Fit' scale for all previews
  } else {
    switch(contentScale) {
      case 'Fit': objectFit = 'contain'; break;
      case 'FillBounds': objectFit = 'fill'; break;
      case 'Inside': objectFit = 'scale-down'; break;
      case 'None': objectFit = 'none'; break;
      case 'Crop':
      case 'FillWidth': 
      case 'FillHeight':
      default: 
        objectFit = 'cover';
    }
  }


  return (
    <div style={containerStyle} className="select-none">
      <Image
        src={src as string}
        alt={contentDescription as string}
        fill
        style={{ objectFit }}
        data-ai-hint={aiHint as string}
        unoptimized // for placehold.co and other external non-optimized images, including data URIs
      />
    </div>
  );
}
