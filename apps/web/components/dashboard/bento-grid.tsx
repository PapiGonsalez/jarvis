import { Suspense } from "react";
import {
  TokensTile,
  ScratchpadTile,
  PinnedNotesTile,
} from "./tiles";
import { TasksTile, TasksTileSkeleton } from "./tasks-tile";
import { CalendarTile, CalendarTileSkeleton } from "./calendar-tile";
import { IdeasTile, IdeasTileSkeleton } from "./ideas-tile";

export function BentoGrid() {
  return (
    <div className="grid auto-rows-[minmax(160px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Tasks — largest, top-left, the focal tile */}
      <div className="lg:col-span-2 lg:row-span-2">
        <Suspense fallback={<TasksTileSkeleton />}>
          <TasksTile />
        </Suspense>
      </div>

      {/* Calendar — top-right pair */}
      <div className="lg:col-span-2">
        <Suspense fallback={<CalendarTileSkeleton />}>
          <CalendarTile />
        </Suspense>
      </div>

      {/* Ideas */}
      <div>
        <Suspense fallback={<IdeasTileSkeleton />}>
          <IdeasTile />
        </Suspense>
      </div>

      {/* Tokens */}
      <div>
        <TokensTile />
      </div>

      {/* Scratchpad */}
      <div className="lg:col-span-2">
        <ScratchpadTile />
      </div>

      {/* Pinned Notes */}
      <div className="lg:col-span-2">
        <PinnedNotesTile />
      </div>
    </div>
  );
}
