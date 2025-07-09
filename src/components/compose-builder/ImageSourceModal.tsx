
'use client';

import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Link as LinkIcon, Image as ImageIcon, Search, Loader2, Sparkles, LayoutGrid, Trash2, Pencil, Check } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { generateImageFromHintAction, searchWebForImagesAction } from '@/app/actions';
import { useDesign } from '@/contexts/DesignContext';

export interface ImageSourceModalRef {
  openModal: (callback: (imageUrl: string) => void, currentSrc?: string) => void;
}

const MIN_WIDTH = 640;
const MIN_HEIGHT = 480;

export const ImageSourceModal = forwardRef<ImageSourceModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('url');
  const [imageUrl, setImageUrl] = useState('');
  const [onSelectCallback, setOnSelectCallback] = useState<(url: string) => void>(() => () => {});
  const { toast } = useToast();
  const { galleryImages, addImageToGallery, removeImageFromGallery } = useDesign();

  // State for modal resizing
  const [dimensions, setDimensions] = useState({ width: 896, height: 600 });
  
  // State for editing gallery
  const [isEditingGallery, setIsEditingGallery] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  // State for AI Generation
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchResults, setAiSearchResults] = useState<string[]>([]);
  const [isAiSearching, setIsAiSearching] = useState(false);
  
  // State for Web Search
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const [webSearchResults, setWebSearchResults] = useState<string[]>([]);
  const [isWebSearching, setIsWebSearching] = useState(false);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dimensions.width;
    const startHeight = dimensions.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
        const newWidth = startWidth + (moveEvent.clientX - startX);
        const newHeight = startHeight + (moveEvent.clientY - startY);
        setDimensions({
            width: Math.max(MIN_WIDTH, newWidth),
            height: Math.max(MIN_HEIGHT, newHeight),
        });
    };

    const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };


  useImperativeHandle(ref, () => ({
    openModal: (callback, currentSrc) => {
      setOnSelectCallback(() => callback);
      setImageUrl(currentSrc || '');
      // Reset all other states
      setAiSearchQuery('');
      setAiSearchResults([]);
      setIsAiSearching(false);
      setWebSearchQuery('');
      setWebSearchResults([]);
      setIsWebSearching(false);
      setIsEditingGallery(false);
      setNewImageUrl('');
      setActiveTab(currentSrc?.startsWith('http') || !currentSrc ? 'url' : 'generate');
      setDimensions({ width: 896, height: 600 }); // Reset to default size on open
      setIsOpen(true);
    }
  }));

  const handleSelect = () => {
    if (!imageUrl.trim()) {
        toast({ title: "Error", description: "Image URL cannot be empty.", variant: "destructive" });
        return;
    }
    try {
        new URL(imageUrl);
    } catch (_) {
        if (!imageUrl.startsWith('data:image/')) {
            toast({ title: "Invalid URL", description: "Please enter a valid image URL.", variant: "destructive" });
            return;
        }
    }
    onSelectCallback(imageUrl);
    setIsOpen(false);
  };

  const handleImageClick = (url: string) => {
    if (!isEditingGallery) {
      setImageUrl(url);
    }
  };

  const handleImageDoubleClick = (url: string) => {
    if (!isEditingGallery) {
      if (!url.trim()) {
        toast({ title: "Error", description: "Image URL is empty.", variant: "destructive" });
        return;
      }
      onSelectCallback(url);
      setIsOpen(false);
    }
  };

  const handleAddImageUrlToGallery = async () => {
    if (!newImageUrl.trim()) {
      toast({ title: "URL Required", description: "Please enter a URL to add.", variant: "default" });
      return;
    }
    await addImageToGallery(newImageUrl);
    setNewImageUrl(''); // Clear input after adding
  };

  const handleRemoveImageFromGallery = async (id: string) => {
    await removeImageFromGallery(id);
  };
  
  const handleAiSearch = async () => {
    if (!aiSearchQuery.trim()) {
        toast({title: "Search Hint", description: "Please enter a description to generate an image.", variant: "default"});
        return;
    }
    setIsAiSearching(true);
    setAiSearchResults([]);
    try {
        const result = await generateImageFromHintAction(aiSearchQuery);
        if (result.imageUrls && result.imageUrls.length > 0) {
            setAiSearchResults(result.imageUrls);
        } else {
            toast({
                title: "Generation Failed",
                description: result.error || "Could not generate images. Try a different search term.",
                variant: "destructive",
            });
        }
    } catch (error) {
         toast({
            title: "Generation Error",
            description: error instanceof Error ? error.message : "An unexpected error occurred.",
            variant: "destructive",
        });
    } finally {
        setIsAiSearching(false);
    }
  };
  
  const handleWebSearch = async () => {
    if (!webSearchQuery.trim()) {
        toast({title: "Search Term", description: "Please enter a term to search.", variant: "default"});
        return;
    }
    setIsWebSearching(true);
    setWebSearchResults([]);
    try {
        const result = await searchWebForImagesAction(webSearchQuery);
        if (result.imageUrls && result.imageUrls.length > 0) {
            setWebSearchResults(result.imageUrls);
        } else {
            toast({
                title: "Web Search Failed",
                description: result.error || "Could not find images for this search term.",
                variant: "destructive",
            });
        }
    } catch (error) {
         toast({
            title: "Web Search Error",
            description: error instanceof Error ? error.message : "An unexpected error occurred.",
            variant: "destructive",
        });
    } finally {
        setIsWebSearching(false);
    }
  };


  const renderResultsGrid = (
    results: (string | { id: string; url: string })[],
    type: 'ai' | 'web' | 'gallery'
  ) => (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
      {results.map((item, index) => {
        const url = typeof item === 'string' ? item : item.url;
        const id = typeof item === 'string' ? `item-${index}` : item.id;
        return (
          <div key={id} className="relative group">
            <button
              onClick={() => handleImageClick(url)}
              onDoubleClick={() => handleImageDoubleClick(url)}
              className={`relative aspect-square w-full rounded-md overflow-hidden border-2 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                          ${imageUrl === url && !isEditingGallery ? 'border-primary ring-2 ring-primary ring-offset-1' : 'border-transparent'}`}
              aria-label={`Select image ${index + 1}`}
            >
              <img src={url} alt={`Image result ${index + 1}`} className="absolute inset-0 h-full w-full object-contain p-1" loading="lazy" />
            </button>
            {isEditingGallery && type === 'gallery' && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); handleRemoveImageFromGallery(id); }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="sm:max-w-none max-h-none flex flex-col"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" /> Set Image Source
          </DialogTitle>
          <DialogDescription>
            Enter a URL, generate images with AI, search the web, or select from the gallery. Drag the bottom-right corner to resize.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4 mb-3">
            <TabsTrigger value="url"><LinkIcon className="mr-1.5 h-4 w-4" />From URL</TabsTrigger>
            <TabsTrigger value="gallery"><LayoutGrid className="mr-1.5 h-4 w-4" />Gallery</TabsTrigger>
            <TabsTrigger value="generate"><Sparkles className="mr-1.5 h-4 w-4" />Generate AI</TabsTrigger>
            <TabsTrigger value="search"><Globe className="mr-1.5 h-4 w-4" />Search Web</TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="flex-grow flex flex-col space-y-3 min-h-0">
            <Label htmlFor="imageUrlInput">Image URL</Label>
            <Input
              id="imageUrlInput"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.png or data:image/..."
              className="h-9"
            />
            {imageUrl && !imageUrl.startsWith('data:image/') && (
                <div className="mt-2 p-2 border rounded-md bg-muted/30 flex justify-center items-center h-40 overflow-hidden">
                    <img 
                        src={imageUrl} 
                        alt="Preview" 
                        className="object-contain max-h-full max-w-full"
                        onError={() => console.warn("Failed to load image preview from URL")}
                    />
                </div>
            )}
             {imageUrl && imageUrl.startsWith('data:image/') && (
                <div className="mt-2 p-2 border rounded-md bg-muted/30 flex justify-center items-center h-40 overflow-hidden">
                    <p className="text-xs text-muted-foreground">Preview not available for local/data URI images in this modal.</p>
                </div>
            )}
          </TabsContent>

          <TabsContent value="gallery" className="flex-grow flex flex-col min-h-0 space-y-2">
            <div className="flex justify-end items-center shrink-0">
                <Button variant="outline" size="sm" onClick={() => setIsEditingGallery(!isEditingGallery)} className="h-8 px-3">
                    {isEditingGallery ? <Check className="mr-1.5 h-4 w-4"/> : <Pencil className="mr-1.5 h-4 w-4"/>}
                    {isEditingGallery ? 'Done' : 'Edit Gallery'}
                </Button>
            </div>
            {isEditingGallery && (
              <div className="flex gap-2 p-2 border rounded-md bg-muted/30 shrink-0">
                <Input
                  placeholder="https://.../image.png"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter') handleAddImageUrlToGallery(); }}
                />
                <Button onClick={handleAddImageUrlToGallery} size="sm" className="px-3">Add URL</Button>
              </div>
            )}
            <div className="flex-grow min-h-0">
                 <ScrollArea className="h-full border rounded-md p-2 bg-muted/20">
                    {galleryImages.length > 0 ? (
                        renderResultsGrid(galleryImages, 'gallery')
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2">
                            <p>Your gallery is empty.</p>
                            <p className="text-xs">Click "Edit Gallery" to add image URLs.</p>
                        </div>
                    )}
                 </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="generate" className="flex-grow flex flex-col space-y-3 min-h-0">
            <div className="flex gap-2">
                <Input 
                    type="text" 
                    placeholder="e.g., a cat wearing a red hat" 
                    value={aiSearchQuery}
                    onChange={(e) => setAiSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleAiSearch(); e.preventDefault(); } }}
                    className="h-9"
                    disabled={isAiSearching}
                />
                <Button onClick={handleAiSearch} variant="outline" size="sm" className="h-9 px-3" disabled={isAiSearching || !aiSearchQuery.trim()}>
                    {isAiSearching ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin"/> : <Sparkles className="mr-1.5 h-4 w-4"/>}
                    Generate
                </Button>
            </div>
            <div className="flex-grow min-h-0">
                <ScrollArea className="h-full border rounded-md p-2 bg-muted/20">
                  {isAiSearching ? (
                      <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p>Generating images based on your description...</p>
                        <p className="text-xs">(This may take a moment)</p>
                      </div>
                  ) : aiSearchResults.length > 0 ? (
                      renderResultsGrid(aiSearchResults, 'ai')
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2">
                        <p>Enter a description to generate unique images with AI.</p>
                      </div>
                  )}
                </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="search" className="flex-grow flex flex-col space-y-3 min-h-0">
            <div className="flex gap-2">
                <Input 
                    type="text" 
                    placeholder="e.g., city skyline, abstract background" 
                    value={webSearchQuery}
                    onChange={(e) => setWebSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleWebSearch(); e.preventDefault(); } }}
                    className="h-9"
                    disabled={isWebSearching}
                />
                <Button onClick={handleWebSearch} variant="outline" size="sm" className="h-9 px-3" disabled={isWebSearching || !webSearchQuery.trim()}>
                    {isWebSearching ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin"/> : <Search className="mr-1.5 h-4 w-4"/>}
                    Search
                </Button>
            </div>
            <div className="flex-grow min-h-0">
                <ScrollArea className="h-full border rounded-md p-2 bg-muted/20">
                  {isWebSearching ? (
                      <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p>Searching the web for images...</p>
                      </div>
                  ) : webSearchResults.length > 0 ? (
                      renderResultsGrid(webSearchResults, 'web')
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2">
                        <p>Enter a term to search for high-quality photos.</p>
                        <p className="text-xs">(Powered by Pexels)</p>
                      </div>
                  )}
                </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <Button onClick={handleSelect} className="w-full sm:w-auto">
            <ImageIcon className="mr-2 h-4 w-4" /> Use this Image Source
          </Button>
        </DialogFooter>

        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-10"
          aria-label="Resize dialog"
        >
          <svg width="100%" height="100%" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground/50">
            <path d="M12 0V12H0" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
      </DialogContent>
    </Dialog>
  );
});

ImageSourceModal.displayName = 'ImageSourceModal';
