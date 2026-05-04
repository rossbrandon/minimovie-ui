import { Button } from '@components/solid';
import { toast } from '@components/starwind/toast/toast-manager';
import { checkAndShowAchievementToast } from '@lib/achievement-toast';
import { isMarkedAuthed } from '@lib/auth-marker';
import {
  addToWatchlist,
  deleteWatchEvent,
  fetchMediaState,
  type MediaState,
  type MediaType,
  recordWatchEvent,
  removeFromWatchlist,
} from '@lib/user-api';
import {
  IconBookmark,
  IconBookmarkFilled,
  IconEye,
  IconEyeCheck,
} from '@tabler/icons-solidjs';
import { type Component, createResource, createSignal, Show } from 'solid-js';

interface Props {
  mediaType: MediaType;
  mediaId: number;
  seriesId?: number;
  seasonNumber?: number;
  episodeNumber?: number;
}

const MediaToolbar: Component<Props> = (props) => {
  // Do not render if user is not authenticated
  if (!isMarkedAuthed()) {
    return null;
  }

  const [ctx, { mutate }] = createResource(() =>
    fetchMediaState({
      mediaType: props.mediaType,
      mediaId: props.mediaId,
      seriesId: props.seriesId,
    })
  );
  const [busy, setBusy] = createSignal(false);

  const showWatchlist = () =>
    props.mediaType === 'movie' || props.mediaType === 'series';

  async function mutateOptimistic(
    optimistic: Partial<MediaState>,
    request: () => Promise<Partial<MediaState>>,
    successMsg: string,
    errorMsg: string,
    after?: () => void
  ): Promise<void> {
    if (busy()) return;
    const prior = ctx();
    if (!prior) return;
    setBusy(true);
    mutate({ ...prior, ...optimistic });
    try {
      const confirmed = await request();
      mutate((c) => (c ? { ...c, ...confirmed } : c));
      toast.success(successMsg);
      after?.();
    } catch {
      mutate(prior);
      toast.error(errorMsg);
    } finally {
      setBusy(false);
    }
  }

  async function toggleWatchlist(): Promise<void> {
    const c = ctx();
    if (!c) return;

    if (c.inWatchlist && c.watchlistItemId) {
      const itemId = c.watchlistItemId;
      await mutateOptimistic(
        { inWatchlist: false, watchlistItemId: null },
        async () => {
          await removeFromWatchlist(itemId);
          return {};
        },
        'Removed from watchlist',
        'Failed to remove from watchlist'
      );
      return;
    }

    const targetType =
      props.mediaType === 'episode' || props.mediaType === 'season'
        ? 'series'
        : props.mediaType;
    const targetId = props.seriesId ?? props.mediaId;

    await mutateOptimistic(
      { inWatchlist: true },
      async () => {
        const created = await addToWatchlist({
          mediaType: targetType,
          mediaId: targetId,
        });
        return { watchlistItemId: created.id };
      },
      'Added to watchlist',
      'Failed to add to watchlist'
    );
  }

  async function recordWatch(): Promise<void> {
    await mutateOptimistic(
      { hasWatched: true, watchEventId: null },
      async () => {
        const created = await recordWatchEvent({
          mediaType: props.mediaType,
          mediaId: props.mediaId,
          seriesId: props.seriesId,
          seasonNumber: props.seasonNumber,
          episodeNumber: props.episodeNumber,
          justWatched: true,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        return { watchEventId: created.id };
      },
      'Marked as watched',
      'Failed to mark as watched',
      // Wait fpr the backend async worker
      () => setTimeout(() => checkAndShowAchievementToast(), 1000)
    );
  }

  async function unwatch(): Promise<void> {
    const c = ctx();
    if (!c?.watchEventId) return;
    const eventId = c.watchEventId;
    await mutateOptimistic(
      { hasWatched: false, watchEventId: null },
      async () => {
        await deleteWatchEvent(eventId);
        return {};
      },
      'Removed from watch history',
      'Failed to remove from watch history'
    );
  }

  return (
    <Show when={ctx()}>
      {(state) => (
        <div class="inline-flex" role="group">
          <Show when={showWatchlist()}>
            <Button
              variant="outline"
              size="icon"
              disabled={busy()}
              aria-label={
                state().inWatchlist
                  ? 'Remove from watchlist'
                  : 'Add to watchlist'
              }
              title={
                state().inWatchlist
                  ? 'Remove from watchlist'
                  : 'Add to watchlist'
              }
              onClick={toggleWatchlist}
            >
              <Show
                when={state().inWatchlist}
                fallback={<IconBookmark class="size-5" />}
              >
                <IconBookmarkFilled class="size-5 text-amber-500" />
              </Show>
            </Button>
          </Show>
          <Show
            when={state().hasWatched}
            fallback={
              <Button
                variant="outline"
                size="icon"
                class={showWatchlist() ? 'rounded-l-none border-l-0' : ''}
                disabled={busy()}
                aria-label="Mark as watched"
                title="Mark as watched"
                onClick={recordWatch}
              >
                <IconEye class="size-5" />
              </Button>
            }
          >
            <Button
              variant="outline"
              size="icon"
              class={`bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20${showWatchlist() ? ' rounded-l-none border-l-0' : ''}`}
              disabled={busy()}
              aria-label="Unmark as watched"
              title="Unmark as watched"
              onClick={unwatch}
            >
              <IconEyeCheck class="size-5" />
            </Button>
          </Show>
        </div>
      )}
    </Show>
  );
};

export default MediaToolbar;
