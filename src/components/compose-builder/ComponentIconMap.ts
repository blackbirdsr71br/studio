import {
  Type,
  Image as ImageIcon,
  Columns,
  Rows,
  MousePointerSquareDashed,
  Box,
  CreditCard,
  View, // For Carousel
  GalleryVertical,
  GalleryHorizontal,
  Grid3x3,
  GalleryThumbnails,
  BoxSelect,
  Space,
  PanelTop,
  PanelBottom,
  Film,
  CheckSquare,
  CircleDot,
  MenuSquare,
  LayoutTemplate, // For Scaffold
  LayoutGrid, // For Navigation Tab
  Home,
  Star,
  Heart,
  Settings,
  User,
  Search,
  Mail,
  Bell,
  ShoppingCart,
  MessageSquare,
  Compass,
  MapPin,
  Briefcase,
  Calendar,
  Camera,
  List,
} from "lucide-react";
import type { ComponentType } from "@/types/compose-spec";
import type { LucideIcon } from "lucide-react";

export const getComponentIcon = (type: ComponentType | string): LucideIcon => {
    switch (type as ComponentType | string) {
        case 'Text': return Type;
        case 'Button': return MousePointerSquareDashed;
        case 'Image': return ImageIcon;
        case 'Column': return Columns;
        case 'Row': return Rows;
        case 'Box': return Box;
        case 'Card': return CreditCard;
        case 'Carousel': return View;
        case 'LazyColumn': return GalleryVertical;
        case 'LazyRow': return GalleryHorizontal;
        case 'LazyVerticalGrid': return Grid3x3;
        case 'LazyHorizontalGrid': return GalleryThumbnails;
        case 'Spacer': return Space;
        case 'TopAppBar': return PanelTop;
        case 'BottomNavigationBar': return PanelBottom;
        case 'AnimatedContent': return Film;
        case 'Checkbox': return CheckSquare;
        case 'RadioButton': return CircleDot;
        case 'DropdownMenu': return MenuSquare;
        case 'Scaffold': return LayoutTemplate;
        case 'navigation': return LayoutGrid; // For Navigation Tab
        
        // Navigation Icons
        case 'Home': return Home;
        case 'Star': return Star;
        case 'Heart': return Heart;
        case 'Settings': return Settings;
        case 'User': return User;
        case 'CreditCard': return CreditCard;
        case 'Search': return Search;
        case 'Mail': return Mail;
        case 'Bell': return Bell;
        case 'ShoppingCart': return ShoppingCart;
        case 'MessageSquare': return MessageSquare;
        case 'Compass': return Compass;
        case 'MapPin': return MapPin;
        case 'Briefcase': return Briefcase;
        case 'Calendar': return Calendar;
        case 'Camera': return Camera;
        case 'List': return List;

        default: return BoxSelect; // Default for custom components
    }
}
