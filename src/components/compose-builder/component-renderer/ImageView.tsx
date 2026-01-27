
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
    contentScale = "Crop",
    backgroundColor,
  } = properties;

  const src = (rawSrc && rawSrc.trim() !== '') ? rawSrc : 'https://placehold.co/300x200.png';
  
  const hasRealImage = rawSrc && rawSrc.trim() !== '' && !rawSrc.startsWith('https://placehold.co');

  const effectivePaddingTop = paddingTop ?? padding ?? 0;
  const effectivePaddingBottom = paddingBottom ?? padding ?? 0;
  const effectivePaddingStart = paddingStart ?? padding ?? 0;
  const effectivePaddingEnd = paddingEnd ?? 0;

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxSizing: 'border-box',
    backgroundColor: backgroundColor ? backgroundColor : (hasRealImage ? 'transparent' : 'hsl(var(--muted))'),
    paddingTop: `${effectivePaddingTop}px`,
    paddingBottom: `${effectivePaddingBottom}px`,
    paddingLeft: `${effectivePaddingStart}px`,
    paddingRight: `${effectivePaddingEnd}px`,
    overflow: 'hidden',
  };

  const imageStyle: React.CSSProperties = {
    display: 'block',
  };

  if (isPreview) {
    imageStyle.objectFit = 'contain';
    imageStyle.width = '100%';
    imageStyle.height = '100%';
  } else {
    switch (contentScale) {
      case 'Fit':
        imageStyle.objectFit = 'contain';
        imageStyle.width = '100%';
        imageStyle.height = '100%';
        break;
      case 'Crop':
        imageStyle.objectFit = 'cover';
        imageStyle.width = '100%';
        imageStyle.height = '100%';
        break;
      case 'FillBounds':
        imageStyle.objectFit = 'fill';
        imageStyle.width = '100%';
        imageStyle.height = '100%';
        break;
      case 'FillWidth':
        imageStyle.width = '100%';
        imageStyle.height = 'auto';
        break;
      case 'FillHeight':
        imageStyle.height = '100%';
        imageStyle.width = 'auto';
        break;
      case 'Inside':
        imageStyle.objectFit = 'scale-down';
        imageStyle.maxWidth = '100%';
        imageStyle.maxHeight = '100%';
        break;
      case 'None':
        imageStyle.objectFit = 'none';
        imageStyle.maxWidth = '100%';
        imageStyle.maxHeight = '100%';
        break;
      default:
        // Default to 'Crop' as defined in compose-spec.ts for the property
        imageStyle.objectFit = 'cover';
        imageStyle.width = '100%';
        imageStyle.height = '100%';
        break;
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
