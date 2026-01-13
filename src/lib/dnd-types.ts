
export const ItemTypes = {
  COMPONENT_LIBRARY_ITEM: 'componentLibraryItem',
  CANVAS_COMPONENT_ITEM: 'canvasComponentItem',
};

// This defines the structure of the item being dragged from the library
export interface LibraryDragItem {
  type: string; // The component type or template ID
  isCustomComponent?: boolean;
}
