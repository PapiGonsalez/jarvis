import { Header } from "@/components/dashboard/header";
import { BentoGrid } from "@/components/dashboard/bento-grid";
import { ChatBar } from "@/components/dashboard/chat-bar";
import { SkillButtons } from "@/components/dashboard/skill-buttons";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />

      <main className="flex flex-1 flex-col px-4 pb-44 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl flex-1">
          <BentoGrid />
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 sm:px-6 lg:px-8">
          <SkillButtons />
          <ChatBar />
        </div>
      </div>
    </div>
  );
}
