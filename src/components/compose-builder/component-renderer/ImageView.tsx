
'use client';
import type { BaseComponentProps } from '@/types/compose-spec';
import Image from 'next/image';

interface ImageViewProps {
  properties: BaseComponentProps;
}

export function ImageView({ properties }: ImageViewProps) {
  const {
    src = 'https://placehold.co/100x100.png',
    contentDescription = 'Image',
    width = 100,
    height = 100,
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
    contentScale = "Crop"
  } = properties;

  const effectivePaddingTop = paddingTop ?? padding ?? 0;
  const effectivePaddingBottom = paddingBottom ?? padding ?? 0;
  const effectivePaddingStart = paddingStart ?? padding ?? 0;
  const effectivePaddingEnd = paddingEnd ?? padding ?? 0;

  const containerStyle: React.CSSProperties = {
    paddingTop: `${effectivePaddingTop}px`,
    paddingBottom: `${effectivePaddingBottom}px`,
    paddingLeft: `${effectivePaddingStart}px`,
    paddingRight: `${effectivePaddingEnd}px`,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    overflow: 'hidden',
    display: 'inline-block',
    boxSizing: 'border-box', // Important for padding and width/height to work as expected
    borderTopLeftRadius: `${cornerRadiusTopLeft}px`,
    borderTopRightRadius: `${cornerRadiusTopRight}px`,
    borderBottomRightRadius: `${cornerRadiusBottomRight}px`,
    borderBottomLeftRadius: `${cornerRadiusBottomLeft}px`,
  };

  // Calculate image dimensions considering the padding
  const imageWidth = typeof width === 'number' ? width - (effectivePaddingStart + effectivePaddingEnd) : '100%';
  const imageHeight = typeof height === 'number' ? height - (effectivePaddingTop + effectivePaddingBottom) : '100%';

  let objectFitClass = 'object-cover'; // Default for 'Crop'
  switch(contentScale) {
    case 'Fit': objectFitClass = 'object-contain'; break;
    case 'FillBounds': objectFitClass = 'object-fill'; break;
    case 'Inside': objectFitClass = 'object-scale-down'; break;
    case 'None': objectFitClass = 'object-none'; break;
    case 'FillWidth': objectFitClass = 'object-cover'; break;
    case 'FillHeight': objectFitClass = 'object-cover'; break;
    default: objectFitClass = 'object-cover';
  }

  return (
    <div style={containerStyle} className="select-none w-full h-full">
      <Image
        src={src as string}
        alt={contentDescription as string}
        width={typeof imageWidth === 'number' ? Math.max(1, imageWidth) : 100}
        height={typeof imageHeight === 'number' ? Math.max(1, imageHeight) : 100}
        className={`${objectFitClass} w-full h-full`}
        data-ai-hint={aiHint as string}
        unoptimized // for placehold.co and other external non-optimized images, including data URIs
      />
    </div>
  );
}

    