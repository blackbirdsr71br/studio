
'use client';
import type { BaseComponentProps } from '@/types/compose-spec';
import Image from 'next/image';

interface ImageViewProps {
  properties: BaseComponentProps;
  isPreview?: boolean;
}

export function ImageView({ properties, isPreview = false }: ImageViewProps) {
  const {
    src = 'https://placehold.co/100x100.png',
    contentDescription = 'Image',
    width = 100, // Default if properties.width is undefined
    height = 100, // Default if properties.height is undefined
    fillMaxWidth,
    fillMaxHeight,
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

  const effectivePaddingTop = paddingTop ?? padding ?? 0;
  const effectivePaddingBottom = paddingBottom ?? padding ?? 0;
  const effectivePaddingStart = paddingStart ?? padding ?? 0;
  const effectivePaddingEnd = paddingEnd ?? padding ?? 0;

  let styleWidth: string;
  if (fillMaxWidth) {
    styleWidth = '100%';
  } else if (typeof width === 'number') {
    styleWidth = `${width}px`;
  } else {
    styleWidth = width || '100px'; // Fallback if width is a string like 'wrap_content' (though less typical for image)
  }

  let styleHeight: string;
  if (fillMaxHeight) {
    styleHeight = '100%';
  } else if (typeof height === 'number') {
    styleHeight = `${height}px`;
  } else {
    styleHeight = height || '100px'; // Fallback
  }

  const containerStyle: React.CSSProperties = {
    paddingTop: `${effectivePaddingTop}px`,
    paddingBottom: `${effectivePaddingBottom}px`,
    paddingLeft: `${effectivePaddingStart}px`,
    paddingRight: `${effectivePaddingEnd}px`,
    width: styleWidth,
    height: styleHeight,
    overflow: 'hidden',
    display: 'block', // Changed from inline-block
    boxSizing: 'border-box',
    borderTopLeftRadius: `${cornerRadiusTopLeft}px`,
    borderTopRightRadius: `${cornerRadiusTopRight}px`,
    borderBottomRightRadius: `${cornerRadiusBottomRight}px`,
    borderBottomLeftRadius: `${cornerRadiusBottomLeft}px`,
    backgroundColor: backgroundColor,
    position: 'relative' // Required for next/image with fill
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
