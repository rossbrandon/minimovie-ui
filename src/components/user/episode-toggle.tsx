import { toast } from '@components/starwind/toast/toast-manager';
import { isMarkedAuthed } from '@lib/auth-marker';
import {
  applyEpisodeMutation,
  ensureProgressLoaded,
  isEpisodeWatched,
} from '@lib/series-progress';
import { deleteWatchEvent, recordWatchEvent } from '@lib/user-api';
import { SEASON_COVERED_NOTICE } from '@lib/watch-messages';
import { IconCircleCheck, IconCircleCheckFilled } from '@tabler/icons-solidjs';
import {
  type Component,
  createMemo,
  createSignal,
  onMount,
  Show,
} from 'solid-js';

interface Props {
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeId: number;
  airDate?: string;
}

const EpisodeToggle: Component<Props> = (props) => {
  if (!isMarkedAuthed()) {
    return null;
  }

  const [busy, setBusy] = createSignal(false);

  // Render immediately from whatever's in the store; ensureProgressLoaded
  // refreshes in the background and Solid re-renders when data lands.
  onMount(() => {
    void ensureProgressLoaded(props.seriesId);
  });

  const state = createMemo(() =>
    isEpisodeWatched(
      props.seriesId,
      props.seasonNumber,
      props.episodeNumber,
      props.airDate
    )
  );

  const tempUuid = (): string =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  async function onClick(e: MouseEvent): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    const current = state();
    if (current.coveredBySeason) {
      toast.info(SEASON_COVERED_NOTICE);
      return;
    }
    if (busy()) {
      return;
    }
    setBusy(true);

    if (current.watched && current.episodeEventId) {
      const eventId = current.episodeEventId;
      applyEpisodeMutation(
        props.seriesId,
        props.seasonNumber,
        props.episodeNumber,
        'unmark'
      );
      try {
        await deleteWatchEvent(eventId);
      } catch {
        applyEpisodeMutation(
          props.seriesId,
          props.seasonNumber,
          props.episodeNumber,
          'mark',
          { id: eventId, createdAt: new Date().toISOString() }
        );
        toast.error("Couldn't unmark — try again");
      } finally {
        setBusy(false);
      }
      return;
    }

    const tempId = tempUuid();
    const optimisticCreatedAt = new Date().toISOString();
    applyEpisodeMutation(
      props.seriesId,
      props.seasonNumber,
      props.episodeNumber,
      'mark',
      { id: tempId, createdAt: optimisticCreatedAt }
    );
    try {
      const created = await recordWatchEvent({
        mediaType: 'episode',
        mediaId: props.episodeId,
        seriesId: props.seriesId,
        seasonNumber: props.seasonNumber,
        episodeNumber: props.episodeNumber,
        justWatched: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      applyEpisodeMutation(
        props.seriesId,
        props.seasonNumber,
        props.episodeNumber,
        'mark',
        { id: created.id, createdAt: optimisticCreatedAt }
      );
    } catch {
      applyEpisodeMutation(
        props.seriesId,
        props.seasonNumber,
        props.episodeNumber,
        'unmark'
      );
      toast.error("Couldn't save — try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      data-watched={state().watched ? 'true' : 'false'}
      aria-pressed={state().watched}
      aria-disabled={state().coveredBySeason || undefined}
      aria-label={
        state().watched ? 'Mark episode unwatched' : 'Mark episode watched'
      }
      title={
        state().coveredBySeason
          ? SEASON_COVERED_NOTICE
          : state().watched
            ? 'Mark episode unwatched'
            : 'Mark episode watched'
      }
      disabled={busy()}
      onClick={onClick}
      class={`absolute top-1.5 right-1.5 z-10 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
        state().coveredBySeason
          ? 'cursor-not-allowed opacity-60'
          : 'hover:bg-background/80 hover:backdrop-blur'
      }`}
    >
      <Show
        when={state().watched}
        fallback={<IconCircleCheck class="size-7 text-muted-foreground" />}
      >
        <IconCircleCheckFilled class="size-7 text-green-500" />
      </Show>
    </button>
  );
};

export default EpisodeToggle;
