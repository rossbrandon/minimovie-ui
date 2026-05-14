import { isMarkedAuthed } from '@lib/auth-marker';
import {
  ensureProgressLoaded,
  getEpisodeEventsForSeason,
  isSeasonComplete,
} from '@lib/series-progress';
import { IconCircleCheckFilled } from '@tabler/icons-solidjs';
import { type Component, createMemo, onMount, Show } from 'solid-js';

interface Props {
  seriesId: number;
  seasonNumber: number;
  totalEpisodes: number;
}

const SeasonStatus: Component<Props> = (props) => {
  if (!isMarkedAuthed()) {
    return null;
  }

  onMount(() => {
    void ensureProgressLoaded(props.seriesId);
  });

  const view = createMemo<'complete' | 'progress' | 'none'>(() => {
    if (
      isSeasonComplete(props.seriesId, props.seasonNumber, props.totalEpisodes)
    ) {
      return 'complete';
    }
    if (getEpisodeEventsForSeason(props.seriesId, props.seasonNumber) > 0) {
      return 'progress';
    }
    return 'none';
  });

  return (
    <>
      <Show when={view() === 'complete'}>
        <span class="inline-flex items-center gap-1 text-xs font-medium text-green-500">
          <IconCircleCheckFilled class="size-4" />
          Watched
        </span>
      </Show>
      <Show when={view() === 'progress'}>
        <span class="text-xs text-muted-foreground">
          {getEpisodeEventsForSeason(props.seriesId, props.seasonNumber)}/
          {props.totalEpisodes} watched
        </span>
      </Show>
    </>
  );
};

export default SeasonStatus;
