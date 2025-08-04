
'use client';

import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useDesign } from "@/contexts/DesignContext";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;

export function ZoomControls() {
    const { zoomLevel, setZoomLevel } = useDesign();

    const handleZoomIn = () => {
        setZoomLevel(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
    };

    const handleZoomOut = () => {
        setZoomLevel(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
    };

    const handleResetZoom = () => {
        setZoomLevel(1);
    };

    return (
        <TooltipProvider delayDuration={200}>
            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-lg bg-background/80 p-1 shadow-lg border backdrop-blur-sm">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoomLevel <= MIN_ZOOM} className="h-8 w-8">
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p>Zoom Out</p>
                    </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" onClick={handleResetZoom} disabled={zoomLevel === 1} className="h-8 w-14 text-xs font-semibold">
                            {Math.round(zoomLevel * 100)}%
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p>Reset Zoom (100%)</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoomLevel >= MAX_ZOOM} className="h-8 w-8">
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p>Zoom In</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}
