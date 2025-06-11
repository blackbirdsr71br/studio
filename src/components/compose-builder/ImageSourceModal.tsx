
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Link as LinkIcon, Image as ImageIcon, Search } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image'; // For displaying example images
import { useToast } from '@/hooks/use-toast';

export interface ImageSourceModalRef {
  openModal: (callback: (imageUrl: string) => void, currentSrc?: string) => void;
}

// Example images (can be expanded or made dynamic later)
const examplePlaceholders = [
  { name: "Tech Abstract", url: "https://placehold.co/600x400/007bff/ffffff.png?text=Tech" , hint: "tech abstract" },
  { name: "Nature Scene", url: "https://placehold.co/600x400/28a745/ffffff.png?text=Nature", hint: "nature scene" },
  { name: "Modern Building", url: "https://placehold.co/600x400/ffc107/343a40.png?text=Architecture", hint: "modern building" },
  { name: "Food Plate", url: "https://placehold.co/600x400/dc3545/ffffff.png?text=Food", hint: "food plate" },
  { name: "People Working", url: "https://placehold.co/600x400/17a2b8/ffffff.png?text=Team", hint: "people working" },
  { name: "Abstract Art", url: "https://placehold.co/600x400/6f42c1/ffffff.png?text=Abstract", hint: "abstract art" },
];


export const ImageSourceModal = forwardRef<ImageSourceModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [onSelectCallback, setOnSelectCallback] = useState<(url: string) => void>(() => () => {});
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({
    openModal: (callback, currentSrc) => {
      setOnSelectCallback(() => callback); // Store the callback
      setImageUrl(currentSrc || '');
      setSearchQuery(''); // Reset search query
      setIsOpen(true);
    }
  }));

  const handleSelect = () => {
    if (!imageUrl.trim()) {
        toast({ title: "Error", description: "Image URL cannot be empty.", variant: "destructive" });
        return;
    }
    try {
        // Basic URL validation
        new URL(imageUrl);
    } catch (_) {
        if (!imageUrl.startsWith('data:image/')) { // Allow data URIs
            toast({ title: "Invalid URL", description: "Please enter a valid image URL.", variant: "destructive" });
            return;
        }
    }
    onSelectCallback(imageUrl);
    setIsOpen(false);
  };

  const handleExampleSelect = (url: string) => {
    setImageUrl(url);
    // Optionally, directly apply if desired, or wait for "Use this Image"
    // onSelectCallback(url);
    // setIsOpen(false);
  };
  
  const handleOnlineSearch = async () => {
    // Placeholder for actual online search functionality
    // For now, it could filter examplePlaceholders or show a message
    if (!searchQuery.trim()) {
        toast({title: "Search Hint", description: "Enter a term to search (feature coming soon).", variant: "default"});
        return;
    }
    toast({title: "Search", description: `Simulating search for: "${searchQuery}" (Full search coming soon).`, variant: "default"});
    // Example: filter placeholders
    const filtered = examplePlaceholders.filter(img => 
        img.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        img.hint.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
        // Maybe show these filtered results in the UI
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" /> Set Image Source
          </DialogTitle>
          <DialogDescription>
            Enter an image URL, search online (coming soon), or choose a placeholder.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="url" className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="url"><LinkIcon className="mr-1.5 h-4 w-4" />From URL</TabsTrigger>
            <TabsTrigger value="search"><Globe className="mr-1.5 h-4 w-4" />Placeholders / Search</TabsTrigger>
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
                    <Image 
                        src={imageUrl} 
                        alt="Preview" 
                        width={150} 
                        height={150} 
                        className="object-contain max-h-full max-w-full"
                        onError={() => console.warn("Failed to load image preview from URL")}
                        unoptimized
                    />
                </div>
            )}
             {imageUrl && imageUrl.startsWith('data:image/') && (
                <div className="mt-2 p-2 border rounded-md bg-muted/30 flex justify-center items-center h-40 overflow-hidden">
                    <p className="text-xs text-muted-foreground">Preview not available for local/data URI images in this modal.</p>
                </div>
            )}
          </TabsContent>

          <TabsContent value="search" className="flex-grow flex flex-col space-y-3 min-h-0">
            <div className="flex gap-2">
                <Input 
                    type="text" 
                    placeholder="Search images (e.g., 'abstract mountains')..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9"
                />
                <Button onClick={handleOnlineSearch} variant="outline" size="sm" className="h-9 px-3">
                    <Search className="mr-1.5 h-4 w-4"/> Search
                </Button>
            </div>
             <p className="text-xs text-muted-foreground text-center py-1">Full online search coming soon! Select from placeholders below:</p>
            <ScrollArea className="flex-grow border rounded-md p-2 bg-muted/20">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {examplePlaceholders.map((img) => (
                  <button
                    key={img.url}
                    onClick={() => handleExampleSelect(img.url)}
                    className={`relative aspect-video rounded-md overflow-hidden border-2 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                                ${imageUrl === img.url ? 'border-primary ring-2 ring-primary ring-offset-1' : 'border-transparent'}`}
                    aria-label={`Select ${img.name}`}
                  >
                    <Image src={img.url} alt={img.name} layout="fill" objectFit="cover" unoptimized />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center truncate">
                        {img.name}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <Button onClick={handleSelect} className="w-full sm:w-auto">
            <ImageIcon className="mr-2 h-4 w-4" /> Use this Image Source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ImageSourceModal.displayName = 'ImageSourceModal';

