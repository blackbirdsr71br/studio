
'use client';
import type { BaseComponentProps } from '@/types/compose-spec';

interface ImageViewProps {
  properties: BaseComponentProps;
  isPreview?: boolean;
}

export function ImageView({ properties, isPreview = false }: ImageViewProps) {
  const {
    src: rawSrc,
    contentDescription = 'Image',
    padding,
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

  const src = (rawSrc && rawSrc.trim() !== '') ? rawSrc : 'https://placehold.co/300x200.png';

  const effectivePaddingTop = paddingTop ?? padding ?? 0;
  const effectivePaddingBottom = paddingBottom ?? padding ?? 0;
  const effectivePaddingStart = paddingStart ?? padding ?? 0;
  const effectivePaddingEnd = paddingEnd ?? 0;

  // The container will fill its parent (RenderedComponentWrapper)
  const containerStyle: React.CSSProperties = {
    flex: 1, // Grow to fill the flex parent (RenderedComponentWrapper)
    display: 'block', // Behave as a block for internal layout
    boxSizing: 'border-box',
    borderTopLeftRadius: `${cornerRadiusTopLeft}px`,
    borderTopRightRadius: `${cornerRadiusTopRight}px`,
    borderBottomRightRadius: `${cornerRadiusBottomRight}px`,
    borderBottomLeftRadius: `${cornerRadiusBottomLeft}px`,
    backgroundColor: backgroundColor || 'hsl(var(--muted))',
    paddingTop: `${effectivePaddingTop}px`,
    paddingBottom: `${effectivePaddingBottom}px`,
    paddingLeft: `${effectivePaddingStart}px`,
    paddingRight: `${effectivePaddingEnd}px`,
    overflow: 'hidden', // Clip the inner image to the border radius
  };
  
  const imageStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      display: 'block',
      objectFit: 'cover' // default
  };
  
  if (isPreview) {
    imageStyle.objectFit = 'contain';
  } else {
    switch(contentScale) {
      case 'Fit': imageStyle.objectFit = 'contain'; break;
      case 'FillBounds': imageStyle.objectFit = 'fill'; break;
      case 'Inside': imageStyle.objectFit = 'scale-down'; break;
      case 'None': imageStyle.objectFit = 'none'; break;
      case 'Crop':
      case 'FillWidth': 
      case 'FillHeight':
      default: 
        imageStyle.objectFit = 'cover';
    }
  }

  return (
    <div style={containerStyle} className="select-none">
       <img
        src={src}
        alt={contentDescription as string}
        style={imageStyle}
        data-ai-hint={aiHint as string}
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (target.src !== 'https://placehold.co/300x200.png') {
            target.src = 'https://placehold.co/300x200.png';
          }
        }}
      />
    </div>
  );
}
