'use client'; // Top-level client component for context and refs

import { useRef } from 'react';
import { DesignProvider } from '@/contexts/DesignContext';
import { Header } from '@/components/compose-builder/Header';
import { ComponentLibraryPanel } from '@/components/compose-builder/ComponentLibraryPanel';
import { DesignSurface } from '@/components/compose-builder/DesignSurface';
import { PropertyPanel } from '@/components/compose-builder/PropertyPanel';
import { GenerateCodeModal, type GenerateCodeModalRef } from '@/components/compose-builder/GenerateCodeModal';

export default function ComposeBuilderPage() {
  const generateModalRef = useRef<GenerateCodeModalRef>(null);

  return (
    <DesignProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <Header generateModalRef={generateModalRef} />
        <div className="flex flex-row flex-grow overflow-hidden">
          <ComponentLibraryPanel />
          <main className="flex-grow flex flex-col overflow-hidden">
            <DesignSurface />
          </main>
          <PropertyPanel />
        </div>
      </div>
      <GenerateCodeModal ref={generateModalRef} />
    </DesignProvider>
  );
}
