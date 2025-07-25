import {
  Type,
  Image as ImageIcon,
  Columns,
  Rows,
  MousePointerSquareDashed,
  Box,
  CreditCard,
  GalleryVertical,
  GalleryHorizontal,
  Grid3x3,
  GalleryThumbnails,
  BoxSelect,
  Space,
  PanelTop,
  PanelBottom,
  Film,
  LayoutTemplate, // For Scaffold
} from "lucide-react";
import type { ComponentType } from "@/types/compose-spec";
import type { LucideIcon } from "lucide-react";

export const getComponentIcon = (type: ComponentType | string): LucideIcon => {
    switch (type as ComponentType) {
        case 'Text': return Type;
        case 'Button': return MousePointerSquareDashed;
        case 'Image': return ImageIcon;
        case 'Column': return Columns;
        case 'Row': return Rows;
        case 'Box': return Box;
        case 'Card': return CreditCard;
        case 'LazyColumn': return GalleryVertical;
        case 'LazyRow': return GalleryHorizontal;
        case 'LazyVerticalGrid': return Grid3x3;
        case 'LazyHorizontalGrid': return GalleryThumbnails;
        case 'Spacer': return Space;
        case 'TopAppBar': return PanelTop;
        case 'BottomNavigationBar': return PanelBottom;
        case 'AnimatedContent': return Film;
        case 'Scaffold': return LayoutTemplate;
        default: return BoxSelect; // Default for custom components
    }
}
