import { Button } from '@components/solid';
import { toast } from '@components/starwind/toast/toast-manager';
import { checkAndShowAchievementToast } from '@lib/achievement-toast';
import { isMarkedAuthed } from '@lib/auth-marker';
import {
  ensureMediaStateLoaded,
  getMediaStateFromCache,
  patchMediaStateInCache,
} from '@lib/media-state-cache';
import {
  applyEpisodeMutation,
  applySeasonMutation,
  ensureProgressLoaded,
  getSeasonEvent,
  isEpisodeWatched,
  isSeasonComplete,
  listEpisodeEventsForSeason,
} from '@lib/series-progress';
import {
  addToWatchlist,
  deleteWatchEvent,
  type MediaType,
  recordWatchEvent,
  removeFromWatchlist,
} from '@lib/user-api';
import {
  SEASON_COVERED_ARIA_LABEL,
  SEASON_COVERED_NOTICE,
} from '@lib/watch-messages';
import {
  IconBookmark,
  IconBookmarkFilled,
  IconCircleCheck,
  IconCircleCheckFilled,
} from '@tabler/icons-solidjs';
import {
  type Component,
  createMemo,
  createSignal,
  onMount,
  Show,
} from 'solid-js';

let tempCounter = 0;
const getNextTempId = (): string => `temp-${++tempCounter}`;

interface OptimisticOpts<T> {
  setBusy: (busy: boolean) => void;
  optimistic: () => void;
  api: () => Promise<T>;
  confirm?: (result: T) => void;
  rollback: () => void;
  successToast: string;
  errorToast: string;
  postSuccess?: () => void;
}

async function runOptimistic<T>(opts: OptimisticOpts<T>): Promise<void> {
  opts.setBusy(true);
  opts.optimistic();
  try {
    const result = await opts.api();
    opts.confirm?.(result);
    toast.success(opts.successToast);
    opts.postSuccess?.();
  } catch {
    opts.rollback();
    toast.error(opts.errorToast);
  } finally {
    opts.setBusy(false);
  }
}

interface Props {
  mediaType: MediaType;
  mediaId: number;
  seriesId?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  airDate?: string;
  seasonEpisodeCount?: number;
}

const MediaToolbar: Component<Props> = (props) => {
  // Movie + series toolbars consult media-state for watchlist state.
  // Season + episode toolbars consult the series-progress store for watch state.
  const needsMediaState =
    props.mediaType === 'movie' || props.mediaType === 'series';

  // Both caches hydrate from sessionStorage at module-load time, so the
  // synchronous reads below return real data on second-and-later page views.
  // The ensureXxxLoaded calls below refresh in the background if stale.
  onMount(() => {
    if (!isMarkedAuthed()) {
      return;
    }
    if (needsMediaState) {
      void ensureMediaStateLoaded({
        mediaType: props.mediaType,
        mediaId: props.mediaId,
        seriesId: props.seriesId,
      });
    }
    if (
      (props.mediaType === 'season' || props.mediaType === 'episode') &&
      props.seriesId
    ) {
      void ensureProgressLoaded(props.seriesId);
    }
  });

  const [busy, setBusy] = createSignal(false);

  const mediaState = createMemo(() => {
    if (!needsMediaState) {
      return undefined;
    }
    return getMediaStateFromCache(props.mediaType, props.mediaId);
  });

  const watchState = createMemo<{
    hasWatched: boolean;
    coveredBySeason: boolean;
    watchEventId?: string | null;
  }>(() => {
    if (props.mediaType === 'movie') {
      const ms = mediaState();
      return {
        hasWatched: ms?.hasWatched ?? false,
        coveredBySeason: false,
        watchEventId: ms?.watchEventId,
      };
    }
    if (
      props.mediaType === 'season' &&
      props.seriesId &&
      props.seasonNumber !== undefined
    ) {
      const event = getSeasonEvent(props.seriesId, props.seasonNumber);
      if (event) {
        return {
          hasWatched: true,
          coveredBySeason: false,
          watchEventId: event.id,
        };
      }
      // Mirror SeasonStatus: treat the season as watched when the user has
      // marked enough individual episodes to cover the aired set
      const totalEpisodes = props.seasonEpisodeCount ?? 0;
      if (
        totalEpisodes > 0 &&
        isSeasonComplete(props.seriesId, props.seasonNumber, totalEpisodes)
      ) {
        return {
          hasWatched: true,
          coveredBySeason: false,
          watchEventId: null,
        };
      }
      return {
        hasWatched: false,
        coveredBySeason: false,
      };
    }
    if (
      props.mediaType === 'episode' &&
      props.seriesId &&
      props.seasonNumber !== undefined &&
      props.episodeNumber !== undefined
    ) {
      const result = isEpisodeWatched(
        props.seriesId,
        props.seasonNumber,
        props.episodeNumber,
        props.airDate
      );
      return {
        hasWatched: result.watched,
        coveredBySeason: result.coveredBySeason,
        watchEventId: result.episodeEventId,
      };
    }
    return { hasWatched: false, coveredBySeason: false };
  });

  const showWatchlist = () =>
    props.mediaType === 'movie' || props.mediaType === 'series';

  // TV series mark watched at the season/episode level only.
  const showWatched = () => props.mediaType !== 'series';

  async function toggleWatchlist(): Promise<void> {
    if (busy()) return;
    const ms = mediaState();
    const patch = (changes: Parameters<typeof patchMediaStateInCache>[2]) =>
      patchMediaStateInCache(props.mediaType, props.mediaId, changes);

    if (ms?.inWatchlist && ms.watchlistItemId) {
      const itemId = ms.watchlistItemId;
      await runOptimistic({
        setBusy,
        optimistic: () => patch({ inWatchlist: false, watchlistItemId: null }),
        api: () => removeFromWatchlist(itemId),
        rollback: () => patch({ inWatchlist: true, watchlistItemId: itemId }),
        successToast: 'Removed from watchlist',
        errorToast: 'Failed to remove from watchlist',
      });
      return;
    }

    const targetType =
      props.mediaType === 'episode' || props.mediaType === 'season'
        ? 'series'
        : props.mediaType;
    const targetId = props.seriesId ?? props.mediaId;

    await runOptimistic({
      setBusy,
      optimistic: () => patch({ inWatchlist: true, watchlistItemId: null }),
      api: () => addToWatchlist({ mediaType: targetType, mediaId: targetId }),
      confirm: (created) =>
        patch({ inWatchlist: true, watchlistItemId: created.id }),
      rollback: () => patch({ inWatchlist: false, watchlistItemId: null }),
      successToast: 'Added to watchlist',
      errorToast: 'Failed to add to watchlist',
    });
  }

  async function recordMovieWatch(): Promise<void> {
    if (busy()) return;
    const prior = mediaState();
    const priorInWatchlist = prior?.inWatchlist ?? false;
    const priorWatchlistItemId = prior?.watchlistItemId ?? null;
    const patch = (changes: Parameters<typeof patchMediaStateInCache>[2]) =>
      patchMediaStateInCache(props.mediaType, props.mediaId, changes);
    await runOptimistic({
      setBusy,
      optimistic: () =>
        patch({
          hasWatched: true,
          watchEventId: null,
          inWatchlist: true,
          watchlistItemId: priorWatchlistItemId,
        }),
      api: () =>
        recordWatchEvent({
          mediaType: 'movie',
          mediaId: props.mediaId,
          justWatched: true,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      confirm: (created) =>
        patch({
          hasWatched: true,
          watchEventId: created.id,
          inWatchlist: true,
          watchlistItemId: created.watchlistItemId,
        }),
      rollback: () =>
        patch({
          hasWatched: false,
          watchEventId: null,
          inWatchlist: priorInWatchlist,
          watchlistItemId: priorWatchlistItemId,
        }),
      successToast: 'Marked as watched',
      errorToast: 'Failed to mark as watched',
      postSuccess: () => {
        setTimeout(() => checkAndShowAchievementToast(), 1000);
      },
    });
  }

  async function unwatchMovie(): Promise<void> {
    if (busy()) return;
    const ms = mediaState();
    if (!ms?.watchEventId) return;
    const eventId = ms.watchEventId;
    const patch = (changes: Parameters<typeof patchMediaStateInCache>[2]) =>
      patchMediaStateInCache(props.mediaType, props.mediaId, changes);
    await runOptimistic({
      setBusy,
      optimistic: () => patch({ hasWatched: false, watchEventId: null }),
      api: () => deleteWatchEvent(eventId),
      rollback: () => patch({ hasWatched: true, watchEventId: eventId }),
      successToast: 'Removed from watch history',
      errorToast: 'Failed to remove from watch history',
    });
  }

  async function recordSeasonWatch(): Promise<void> {
    if (busy() || !props.seriesId || props.seasonNumber === undefined) {
      return;
    }
    const seriesId = props.seriesId;
    const seasonNumber = props.seasonNumber;
    const tempId = getNextTempId();
    const now = new Date().toISOString();
    // Caller passes the count of aired episodes so the optimistic cache
    // lands with the correct episodeCount, matching what the server will
    // compute. Defaults to 0 when unavailable.
    const episodeCount = props.seasonEpisodeCount ?? 0;
    const priorSeries = getMediaStateFromCache('series', seriesId);
    const priorSeriesInWatchlist = priorSeries?.inWatchlist ?? false;
    const priorSeriesItemId = priorSeries?.watchlistItemId ?? null;
    await runOptimistic({
      setBusy,
      optimistic: () => {
        applySeasonMutation(seriesId, seasonNumber, 'mark', {
          id: tempId,
          createdAt: now,
          episodeCount,
        });
        patchMediaStateInCache('series', seriesId, {
          inWatchlist: true,
          watchlistItemId: priorSeriesItemId,
        });
      },
      api: () =>
        recordWatchEvent({
          mediaType: 'season',
          mediaId: props.mediaId,
          seriesId,
          seasonNumber,
          justWatched: true,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      confirm: (created) => {
        applySeasonMutation(seriesId, seasonNumber, 'mark', {
          id: created.id,
          createdAt: now,
          episodeCount,
        });
        patchMediaStateInCache('series', seriesId, {
          inWatchlist: true,
          watchlistItemId: created.watchlistItemId,
        });
      },
      rollback: () => {
        applySeasonMutation(seriesId, seasonNumber, 'unmark');
        patchMediaStateInCache('series', seriesId, {
          inWatchlist: priorSeriesInWatchlist,
          watchlistItemId: priorSeriesItemId,
        });
      },
      successToast: 'Marked season as watched',
      errorToast: 'Failed to mark season as watched',
      postSuccess: () => {
        setTimeout(() => checkAndShowAchievementToast(), 1000);
      },
    });
  }

  async function unwatchSeason(): Promise<void> {
    if (busy() || !props.seriesId || props.seasonNumber === undefined) {
      return;
    }
    const seriesId = props.seriesId;
    const seasonNumber = props.seasonNumber;

    // Path A: a real season-level event exists - delete just that row.
    const seasonEvent = getSeasonEvent(seriesId, seasonNumber);
    if (seasonEvent) {
      const prior = seasonEvent;
      await runOptimistic({
        setBusy,
        optimistic: () => applySeasonMutation(seriesId, seasonNumber, 'unmark'),
        api: () => deleteWatchEvent(prior.id),
        rollback: () =>
          applySeasonMutation(seriesId, seasonNumber, 'mark', prior),
        successToast: 'Removed season from watch history',
        errorToast: 'Failed to remove season from watch history',
      });
      return;
    }

    // Path B: season is complete via individual episode marks. Bulk-delete
    // every episode event for the season so the watched indicator clears.
    const priorEpisodeEvents = listEpisodeEventsForSeason(
      seriesId,
      seasonNumber
    );
    if (priorEpisodeEvents.length === 0) {
      return;
    }
    setBusy(true);
    for (const ev of priorEpisodeEvents) {
      applyEpisodeMutation(seriesId, seasonNumber, ev.episodeNumber, 'unmark');
    }
    try {
      await Promise.all(
        priorEpisodeEvents.map((ev) => deleteWatchEvent(ev.id))
      );
      toast.success('Removed season from watch history');
    } catch {
      // Best-effort rollback: re-mark every episode locally. If any of the
      // DELETEs actually succeeded server-side, the next visibility-refresh
      // (or invalidate) will reconcile the lingering "marked" entries away.
      for (const ev of priorEpisodeEvents) {
        applyEpisodeMutation(seriesId, seasonNumber, ev.episodeNumber, 'mark', {
          id: ev.id,
          createdAt: ev.createdAt,
        });
      }
      toast.error('Failed to remove season from watch history');
    } finally {
      setBusy(false);
    }
  }

  async function recordEpisodeWatch(): Promise<void> {
    if (
      busy() ||
      !props.seriesId ||
      props.seasonNumber === undefined ||
      props.episodeNumber === undefined
    ) {
      return;
    }
    const seriesId = props.seriesId;
    const seasonNumber = props.seasonNumber;
    const episodeNumber = props.episodeNumber;
    const tempId = getNextTempId();
    const now = new Date().toISOString();
    const priorSeries = getMediaStateFromCache('series', seriesId);
    const priorSeriesInWatchlist = priorSeries?.inWatchlist ?? false;
    const priorSeriesItemId = priorSeries?.watchlistItemId ?? null;
    await runOptimistic({
      setBusy,
      optimistic: () => {
        applyEpisodeMutation(seriesId, seasonNumber, episodeNumber, 'mark', {
          id: tempId,
          createdAt: now,
        });
        patchMediaStateInCache('series', seriesId, {
          inWatchlist: true,
          watchlistItemId: priorSeriesItemId,
        });
      },
      api: () =>
        recordWatchEvent({
          mediaType: 'episode',
          mediaId: props.mediaId,
          seriesId,
          seasonNumber,
          episodeNumber,
          justWatched: true,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      confirm: (created) => {
        applyEpisodeMutation(seriesId, seasonNumber, episodeNumber, 'mark', {
          id: created.id,
          createdAt: now,
        });
        patchMediaStateInCache('series', seriesId, {
          inWatchlist: true,
          watchlistItemId: created.watchlistItemId,
        });
      },
      rollback: () => {
        applyEpisodeMutation(seriesId, seasonNumber, episodeNumber, 'unmark');
        patchMediaStateInCache('series', seriesId, {
          inWatchlist: priorSeriesInWatchlist,
          watchlistItemId: priorSeriesItemId,
        });
      },
      successToast: 'Marked as watched',
      errorToast: 'Failed to mark as watched',
      postSuccess: () => {
        setTimeout(() => checkAndShowAchievementToast(), 1000);
      },
    });
  }

  async function unwatchEpisode(): Promise<void> {
    if (
      busy() ||
      !props.seriesId ||
      props.seasonNumber === undefined ||
      props.episodeNumber === undefined
    ) {
      return;
    }
    const eventId = watchState().watchEventId;
    if (!eventId) return;
    const seriesId = props.seriesId;
    const seasonNumber = props.seasonNumber;
    const episodeNumber = props.episodeNumber;
    await runOptimistic({
      setBusy,
      optimistic: () =>
        applyEpisodeMutation(seriesId, seasonNumber, episodeNumber, 'unmark'),
      api: () => deleteWatchEvent(eventId),
      rollback: () =>
        applyEpisodeMutation(seriesId, seasonNumber, episodeNumber, 'mark', {
          id: eventId,
          createdAt: new Date().toISOString(),
        }),
      successToast: 'Removed from watch history',
      errorToast: 'Failed to remove from watch history',
    });
  }

  async function onWatchedClick(): Promise<void> {
    if (watchState().coveredBySeason) {
      toast.info(SEASON_COVERED_NOTICE);
      return;
    }
    switch (props.mediaType) {
      case 'movie':
        if (watchState().hasWatched) {
          await unwatchMovie();
        } else {
          await recordMovieWatch();
        }
        break;
      case 'season':
        if (watchState().hasWatched) {
          await unwatchSeason();
        } else {
          await recordSeasonWatch();
        }
        break;
      case 'episode':
        if (watchState().hasWatched) {
          await unwatchEpisode();
        } else {
          await recordEpisodeWatch();
        }
        break;
    }
  }

  return (
    <div class="inline-flex" role="group">
      <Show when={showWatchlist()}>
        <Button
          variant="outline"
          size="icon"
          class={showWatched() ? 'rounded-r-none' : ''}
          disabled={busy()}
          aria-label={
            mediaState()?.inWatchlist
              ? 'Remove from watchlist'
              : 'Add to watchlist'
          }
          title={
            mediaState()?.inWatchlist
              ? 'Remove from watchlist'
              : 'Add to watchlist'
          }
          onClick={toggleWatchlist}
        >
          <Show
            when={mediaState()?.inWatchlist}
            fallback={<IconBookmark class="size-5!" />}
          >
            <IconBookmarkFilled class="size-5! text-amber-500" />
          </Show>
        </Button>
      </Show>
      <Show when={showWatched()}>
        <Show
          when={watchState().hasWatched}
          fallback={
            <Button
              variant="outline"
              size="icon"
              class={showWatchlist() ? 'rounded-l-none border-l-0' : ''}
              disabled={busy()}
              aria-label="Mark as watched"
              title="Mark as watched"
              onClick={onWatchedClick}
            >
              <IconCircleCheck class="size-5!" />
            </Button>
          }
        >
          <Button
            variant="outline"
            size="icon"
            class={`bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20${
              showWatchlist() ? ' rounded-l-none border-l-0' : ''
            }${watchState().coveredBySeason ? ' opacity-60' : ''}`}
            disabled={busy()}
            aria-disabled={watchState().coveredBySeason || undefined}
            aria-label={
              watchState().coveredBySeason
                ? SEASON_COVERED_ARIA_LABEL
                : 'Unmark as watched'
            }
            title={
              watchState().coveredBySeason
                ? SEASON_COVERED_NOTICE
                : 'Unmark as watched'
            }
            onClick={onWatchedClick}
          >
            <IconCircleCheckFilled class="size-5!" />
          </Button>
        </Show>
      </Show>
    </div>
  );
};

export default MediaToolbar;
