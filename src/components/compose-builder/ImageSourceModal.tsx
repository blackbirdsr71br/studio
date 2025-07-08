
'use client';

import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Link as LinkIcon, Image as ImageIcon, Search, Loader2, Sparkles, LayoutGrid } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { generateImageFromHintAction, searchWebForImagesAction } from '@/app/actions';

export interface ImageSourceModalRef {
  openModal: (callback: (imageUrl: string) => void, currentSrc?: string) => void;
}

const predefinedImageUrls = [
  "https://gestor-contenido.baz.app/Centro-omercial/logos-Tiendas/directorio/lista/elektra.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/PruebaColorContorno.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/bancoazteca.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/tvazteca.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/segurosazteca.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/comprainternacional.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/elektramotos.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/benelli.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/bfgoodrich.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/firestone.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/hero.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/italika.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/lth.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/michelin.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/uniroyal.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/dbebe.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/evenflo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/joykoo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/juguetibici.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/lego.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/conair.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/dermaline.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/divya.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/gamaprofessional.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/letmex.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/perfumesarabes.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/perfumegallery.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/fragance.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/america.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/dormimundo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/luuna.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/restonic.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/sognare.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/springair.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/benotto.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/teton.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/veloci.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/clevercel.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/edifier.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/hp.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/jvc.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/klipsch.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/macstore.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/motorola.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/nintendo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/oppo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/playstation.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/selectsound.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/sony.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/steren.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/stf.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/vak.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/farmaenvios.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/dewalt.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/gutstark.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/jardimex.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/makita.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/truper.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/gandhi.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/thesaifhouse.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/blackanddecker.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/brother.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/hisense.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/lg.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/mabe.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/ninja.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/tcl.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/tfal.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/teka.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/tramontina.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/vasconia.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/kessamuebles.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/mele.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/mundoin.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/cvdirecto.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/hkpro.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/honor.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/lenovo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/princo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/redlemon.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/roomi.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/carnival.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/coach.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/dcshoes.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/flexi.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/furor.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/joyeriasbizzarro.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/invicta.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/jansport.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/kswiss.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/lee.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/lens.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/lotto.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/marcjacobs.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/michaelkors.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/nike.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/oggi.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/pirma.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/playtex.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/puma.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/reebok.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/roxy.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/salvajetentacion.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/stylo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/swissbrand.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/quiksilver.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/bet365.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/cvdirecto.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/hkpro.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/honor.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/lenovo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/princo.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/redlemon.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/roomi.png",
  "https://gestor-contenido.baz.app/Centro-Comercial/logos-Tiendas/directorio/lista/bet365.png",
];
const uniqueGalleryUrls = [...new Set(predefinedImageUrls)];

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

  const handleImageDoubleClick = (url: string) => {
    if (!url.trim()) {
      toast({ title: "Error", description: "Image URL is empty.", variant: "destructive" });
      return;
    }
    onSelectCallback(url);
    setIsOpen(false);
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


  const renderResultsGrid = (results: string[], type: 'ai' | 'web' | 'gallery') => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {results.map((url, index) => (
        <button
          key={`${type}-result-${index}`}
          onClick={() => handleImageClick(url)}
          onDoubleClick={() => handleImageDoubleClick(url)}
          className={`relative aspect-video rounded-md overflow-hidden border-2 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                      ${imageUrl === url ? 'border-primary ring-2 ring-primary ring-offset-1' : 'border-transparent'}`}
          aria-label={`Select image ${index + 1}`}
        >
          <img src={url} alt={`Image result ${index + 1}`} className="absolute inset-0 h-full w-full object-contain p-1" loading="lazy" />
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
            Enter a URL, generate images with AI, search the web, or select from the gallery.
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

          <TabsContent value="gallery" className="flex-grow flex flex-col min-h-0">
            <ScrollArea className="flex-grow w-full border rounded-md p-2 bg-muted/20">
              {uniqueGalleryUrls.length > 0 ? (
                  renderResultsGrid(uniqueGalleryUrls, 'gallery')
              ) : (
                  <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2">
                    <p>No predefined images available.</p>
                  </div>
              )}
            </ScrollArea>
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

    