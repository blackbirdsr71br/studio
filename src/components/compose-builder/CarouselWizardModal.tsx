
'use client';

import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Input } from "@/components/ui/input";
import { useDesign } from '@/contexts/DesignContext';
import { useToast } from '@/hooks/use-toast';
import { getComponentDisplayName, type ComponentType, CUSTOM_COMPONENT_TYPE_PREFIX, propertyDefinitions } from '@/types/compose-spec';
import { cn } from '@/lib/utils';
import { View, Rows } from 'lucide-react';

export interface CarouselWizardModalRef {
  openModal: (carouselId: string) => void;
}

export const CarouselWizardModal = forwardRef<CarouselWizardModalRef, {}>((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [carouselId, setCarouselId] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Form State
  const [carouselStyle, setCarouselStyle] = useState<'Pager' | 'MultiBrowse'>('Pager');
  const [orientation, setOrientation] = useState<'Horizontal' | 'Vertical'>('Horizontal');
  const [preferredItemWidth, setPreferredItemWidth] = useState(186);
  const [itemSpacing, setItemSpacing] = useState(8);
  const [generateContent, setGenerateContent] = useState(false);
  const [childType, setChildType] = useState<string>('Card');
  const [childCount, setChildCount] = useState(3);

  const { updateComponent, generateStaticChildren, customComponentTemplates } = useDesign();
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({
    openModal: (id) => {
      setCarouselId(id);
      // Reset form to defaults when opening
      setStep(1);
      setCarouselStyle('Pager');
      setOrientation('Horizontal');
      setPreferredItemWidth(186);
      setItemSpacing(8);
      setGenerateContent(false);
      setChildType('Card');
      setChildCount(3);
      setIsOpen(true);
    }
  }));

  const handleFinish = () => {
    if (!carouselId) return;

    const propertiesToUpdate: any = {
      carouselStyle,
      itemSpacing,
    };

    if (carouselStyle === 'Pager') {
      propertiesToUpdate.carouselOrientation = orientation;
    } else { // MultiBrowse
      propertiesToUpdate.preferredItemWidth = preferredItemWidth;
      // Multi-browse in our context is always horizontal for simplicity
      propertiesToUpdate.carouselOrientation = 'Horizontal';
    }

    updateComponent(carouselId, { properties: propertiesToUpdate });

    if (generateContent && childCount > 0) {
      generateStaticChildren(carouselId, childType, childCount);
    }
    
    toast({ title: "Carousel Configured", description: `The carousel has been set up as a ${carouselStyle}.` });
    setIsOpen(false);
  };
  
  const availableChildTypes = Object.keys(propertyDefinitions).filter(type => !['Scaffold', 'TopAppBar', 'BottomNavigationBar', 'Carousel'].includes(type));

  const renderStepOne = () => (
    <div className="space-y-4">
        <DialogDescription>
            Choose the primary behavior for your carousel. This determines how users will interact with its content.
        </DialogDescription>
        <RadioGroup value={carouselStyle} onValueChange={(v) => setCarouselStyle(v as any)} className="grid grid-cols-2 gap-4">
           <Label htmlFor="style-pager" className={cn("cursor-pointer rounded-lg border-2 p-4 text-center transition-colors", carouselStyle === 'Pager' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50')}>
                <RadioGroupItem value="Pager" id="style-pager" className="sr-only" />
                <View className="mx-auto mb-2 h-8 w-8" />
                <h3 className="font-semibold">Paginador (Pager)</h3>
                <p className="text-xs text-muted-foreground">Muestra un ítem a la vez, ideal para tutoriales o vistas de página completa.</p>
           </Label>
           <Label htmlFor="style-multibrowse" className={cn("cursor-pointer rounded-lg border-2 p-4 text-center transition-colors", carouselStyle === 'MultiBrowse' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50')}>
               <RadioGroupItem value="MultiBrowse" id="style-multibrowse" className="sr-only" />
                <Rows className="mx-auto mb-2 h-8 w-8" />
                <h3 className="font-semibold">Multi-Navegación</h3>
                <p className="text-xs text-muted-foreground">Muestra múltiples ítems a la vez, ideal para galerías de productos.</p>
           </Label>
        </RadioGroup>
    </div>
  );

  const renderStepTwo = () => (
     <div className="space-y-4">
        <DialogDescription>
            Configure the specific layout properties for your chosen carousel style.
        </DialogDescription>
        {carouselStyle === 'Pager' ? (
             <div className="space-y-2">
                <Label>Orientation</Label>
                 <Select value={orientation} onValueChange={(v) => setOrientation(v as any)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Horizontal">Horizontal</SelectItem>
                        <SelectItem value="Vertical">Vertical</SelectItem>
                    </SelectContent>
                </Select>
             </div>
        ) : (
             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="item-width">Ancho Preferido del Ítem (dp)</Label>
                    <Input id="item-width" type="number" value={preferredItemWidth} onChange={e => setPreferredItemWidth(Number(e.target.value))} />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="item-spacing">Espaciado (dp)</Label>
                    <Input id="item-spacing" type="number" value={itemSpacing} onChange={e => setItemSpacing(Number(e.target.value))} />
                 </div>
             </div>
        )}
     </div>
  );
  
  const renderStepThree = () => (
      <div className="space-y-4">
        <DialogDescription>
            Optionally, generate some placeholder content to populate your carousel.
        </DialogDescription>
        <div className="flex items-center space-x-2">
            <input type="checkbox" id="generate-content" checked={generateContent} onChange={e => setGenerateContent(e.target.checked)} />
            <Label htmlFor="generate-content">Generate placeholder content</Label>
        </div>
        {generateContent && (
             <div className="grid grid-cols-2 gap-4 rounded-md border p-4">
                <div className="space-y-2">
                    <Label htmlFor="child-type">Componente hijo</Label>
                     <Select value={childType} onValueChange={setChildType}>
                        <SelectTrigger id="child-type"><SelectValue/></SelectTrigger>
                        <SelectContent>
                             <SelectGroup>
                                <SelectLabel>Standard Components</SelectLabel>
                                {availableChildTypes.map(type => (
                                    <SelectItem key={type} value={type}>{getComponentDisplayName(type as ComponentType)}</SelectItem>
                                ))}
                            </SelectGroup>
                             {customComponentTemplates.length > 0 && (
                                <SelectGroup>
                                    <SelectLabel>Custom Components</SelectLabel>
                                    {customComponentTemplates.map(template => (
                                    <SelectItem key={template.templateId} value={template.templateId}>{template.name}</SelectItem>
                                    ))}
                                </SelectGroup>
                            )}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="child-count">Número de ítems</Label>
                    <Input id="child-count" type="number" min="1" value={childCount} onChange={e => setChildCount(Number(e.target.value))} />
                 </div>
             </div>
        )}
      </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">Asistente de Configuración de Carrusel (Paso {step} de 3)</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
            {step === 1 && renderStepOne()}
            {step === 2 && renderStepTwo()}
            {step === 3 && renderStepThree()}
        </div>
        
        <DialogFooter className="justify-between">
            <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>
                Anterior
            </Button>
             {step < 3 ? (
                <Button onClick={() => setStep(s => s + 1)}>Siguiente</Button>
            ) : (
                <Button onClick={handleFinish}>Finalizar</Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

CarouselWizardModal.displayName = 'CarouselWizardModal';
