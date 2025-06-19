
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
    contentScale = "Crop"
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
  };

  // Image dimensions should be 100% of the containerStyle's dimensions (which now consider padding)
  // The 'next/image' component with w-full h-full classes will fill this styled div.
  const imageWidthForNextImage = typeof properties.width === 'number' ? Math.max(1, properties.width - (effectivePaddingStart + effectivePaddingEnd)) : 100; // Fallback for layout calculation
  const imageHeightForNextImage = typeof properties.height === 'number' ? Math.max(1, properties.height - (effectivePaddingTop + effectivePaddingBottom)) : 100; // Fallback for layout calculation


  let objectFitClass = 'object-cover'; // Default for 'Crop'
  switch(contentScale) {
    case 'Fit': objectFitClass = 'object-contain'; break;
    case 'FillBounds': objectFitClass = 'object-fill'; break;
    case 'Inside': objectFitClass = 'object-scale-down'; break;
    case 'None': objectFitClass = 'object-none'; break;
    // FillWidth and FillHeight might need specific aspect ratio considerations if we want them to behave differently from object-cover
    // For now, object-cover is a reasonable default for them if the image fills its bounds.
    case 'FillWidth': objectFitClass = 'object-cover'; break; 
    case 'FillHeight': objectFitClass = 'object-cover'; break;
    default: objectFitClass = 'object-cover';
  }

  return (
    <div style={containerStyle} className="select-none">
      <Image
        src={src as string}
        alt={contentDescription as string}
        width={imageWidthForNextImage}  // These are more like aspect ratio hints if layout='responsive' or classes define size
        height={imageHeightForNextImage} // For layout='intrinsic' or 'fixed' they are actual dimensions.
                                     // Given our classes, these are less critical but good to have.
        className={`${objectFitClass} w-full h-full`} // These classes are key for filling the div
        data-ai-hint={aiHint as string}
        unoptimized // for placehold.co and other external non-optimized images, including data URIs
      />
    </div>
  );
}
