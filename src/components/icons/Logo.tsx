import Image from 'next/image';

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="UI Compose Architect Logo"
        width={32}
        height={32}
        className="rounded-sm"
      />
      <span className="text-xl font-semibold text-foreground font-headline hidden md:inline">
        UI Compose Architect
      </span>
    </div>
  );
}
