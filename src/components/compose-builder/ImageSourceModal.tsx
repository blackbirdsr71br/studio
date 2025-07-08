
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Link as LinkIcon, Image as ImageIcon, Search, Loader2, Sparkles } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { generateImageFromHintAction, searchWebForImagesAction } from '@/app/actions';

export interface ImageSourceModalRef {
  openModal: (callback: (imageUrl: string) => void, currentSrc?: string) => void;
}

export const ImageSourceModal = forwardRef<ImageSourceModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('url');
  const [imageUrl, setImageUrl] = useState('');
  const [onSelectCallback, setOnSelectCallback] = useState<(url: string) => void>(() => () => {});
  const { toast } = useToast();

  // State for AI Generation
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchResults, setAiSearchResults] = useState<string[]>([]);
  const [isAiSearching, setIsAiSearching] = useState(false);
  
  // State for Web Search
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const [webSearchResults, setWebSearchResults] = useState<string[]>([]);
  const [isWebSearching, setIsWebSearching] = useState(false);

  useImperativeHandle(ref, () => ({
    openModal: (callback, currentSrc) => {
      setOnSelectCallback(() => callback);
      setImageUrl(currentSrc || '');
      setAiSearchQuery('');
      setAiSearchResults([]);
      setIsAiSearching(false);
      setWebSearchQuery('');
      setWebSearchResults([]);
      setIsWebSearching(false);
      setActiveTab(currentSrc?.startsWith('http') || !currentSrc ? 'url' : 'generate');
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

  const handleImageClick = (url: string) => {
    setImageUrl(url);
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


  const renderResultsGrid = (results: string[], type: 'ai' | 'web') => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {results.map((url, index) => (
        <button
          key={`${type}-result-${index}`}
          onClick={() => handleImageClick(url)}
          className={`relative aspect-video rounded-md overflow-hidden border-2 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                      ${imageUrl === url ? 'border-primary ring-2 ring-primary ring-offset-1' : 'border-transparent'}`}
          aria-label={`Select image ${index + 1}`}
        >
          <img src={url} alt={`Image result ${index + 1}`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        </button>
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" /> Set Image Source
          </DialogTitle>
          <DialogDescription>
            Enter a URL, generate images with AI, or search the web for photos.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 mb-3">
            <TabsTrigger value="url"><LinkIcon className="mr-1.5 h-4 w-4" />From URL</TabsTrigger>
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
            <ScrollArea className="flex-grow border rounded-md p-2 bg-muted/20">
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
            <ScrollArea className="flex-grow border rounded-md p-2 bg-muted/20">
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
