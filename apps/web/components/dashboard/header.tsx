import { Clock } from "./clock";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-baseline gap-3">
          <span className="font-heading text-lg font-semibold tracking-tight">
            Jarvis
          </span>
          <span className="text-xs text-muted-foreground">
            personal OS
          </span>
        </div>
        <Clock />
      </div>
    </header>
  );
}
