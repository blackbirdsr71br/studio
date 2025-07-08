
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Link as LinkIcon, Image as ImageIcon, Search, Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image'; // For displaying example images
import { useToast } from '@/hooks/use-toast';
import { generateImageFromHintAction } from '@/app/actions';

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

  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);


  useImperativeHandle(ref, () => ({
    openModal: (callback, currentSrc) => {
      setOnSelectCallback(() => callback); // Store the callback
      setImageUrl(currentSrc || '');
      setSearchQuery(''); // Reset search query
      setSearchResults([]); // Reset search results
      setIsSearching(false);
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
    if (!searchQuery.trim()) {
        toast({title: "Search Hint", description: "Please enter a search term.", variant: "default"});
        return;
    }
    setIsSearching(true);
    setSearchResults([]);
    try {
        const result = await generateImageFromHintAction(searchQuery);
        if (result.imageUrls && result.imageUrls.length > 0) {
            setSearchResults(result.imageUrls);
        } else {
            toast({
                title: "Search Failed",
                description: result.error || "Could not generate images. Try a different search term.",
                variant: "destructive",
            });
        }
    } catch (error) {
         toast({
            title: "Search Error",
            description: error instanceof Error ? error.message : "An unexpected error occurred.",
            variant: "destructive",
        });
    } finally {
        setIsSearching(false);
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
            Enter a URL, generate images with AI, or choose a placeholder.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="url" className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="url"><LinkIcon className="mr-1.5 h-4 w-4" />From URL</TabsTrigger>
            <TabsTrigger value="search"><Globe className="mr-1.5 h-4 w-4" />Generate / Placeholders</TabsTrigger>
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
                    placeholder="Generate images from a description..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleOnlineSearch(); e.preventDefault(); } }}
                    className="h-9"
                    disabled={isSearching}
                />
                <Button onClick={handleOnlineSearch} variant="outline" size="sm" className="h-9 px-3" disabled={isSearching || !searchQuery.trim()}>
                    {isSearching ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin"/> : <Search className="mr-1.5 h-4 w-4"/>}
                    Generate
                </Button>
            </div>
            <ScrollArea className="flex-grow border rounded-md p-2 bg-muted/20">
              {isSearching ? (
                  <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p>Generating images based on your search...</p>
                    <p className="text-xs">(This may take a moment)</p>
                  </div>
              ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {searchResults.map((url, index) => (
                      <button
                        key={`search-result-${index}`}
                        onClick={() => handleExampleSelect(url)}
                        className={`relative aspect-video rounded-md overflow-hidden border-2 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                                    ${imageUrl === url ? 'border-primary ring-2 ring-primary ring-offset-1' : 'border-transparent'}`}
                        aria-label={`Select generated image ${index + 1}`}
                      >
                        <Image src={url} alt={`Generated image for "${searchQuery}"`} layout="fill" objectFit="cover" unoptimized />
                      </button>
                    ))}
                  </div>
              ) : (
                <>
                    <p className="text-xs text-muted-foreground text-center mb-2">
                        Enter a description to generate images, or select a placeholder below.
                    </p>
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
                </>
              )}
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
