import { audioUrl } from '@/lib/audio-url';

export interface ReviewPanelProps {
  env: any;
  item: {
    phraseId: string;
    cardId: string | null;
    yoruba: string;
    english: string;
    audioKey: string | null;
    deckSlug: string;
    kind: 'new' | 'review';
  };
  queue: { phraseId: string }[];
  index: number;
  total: number;
  stage: 'prompt' | 'answer';
}

// Focus-mode review card. Generous whitespace, enormous Yorùbá type, the
// grade row appears only after reveal. Everything the user touches is one
// keystroke away.
export const ReviewPanel = ({ env, item, queue, index, total, stage }: ReviewPanelProps) => {
  const url = audioUrl(env, item.audioKey);
  const remaining = encodeURIComponent(JSON.stringify(queue));
  const progress = Math.round(((index + 1) / total) * 100);

  return (
    <div id="review-panel" class="max-w-2xl mx-auto" data-autoplay-url={url || ''}>
      {/* Progress + meta strip */}
      <div class="flex items-center justify-between text-xs text-base-content/60 mb-6">
        <span class={`badge ${item.kind === 'new' ? 'badge-primary' : 'badge-ghost'} badge-sm`}>
          {item.kind === 'new' ? 'New phrase' : 'Review'}
        </span>
        <span class="tabular-nums">
          {index + 1} / {total}
        </span>
      </div>
      <progress class="progress progress-primary h-1 mb-10" value={progress} max={100}></progress>

      {/* The phrase itself */}
      <div class="text-center py-10">
        <div
          lang="yo"
          class="yo font-display font-semibold text-6xl sm:text-7xl leading-[1.1] tracking-tight"
        >
          {item.yoruba}
        </div>
        {url && (
          <button
            class="btn btn-ghost btn-sm mt-6 gap-2"
            onclick={`(new Audio('${url}')).play()`}
            aria-label="Play audio"
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.5 6.5a.5.5 0 01.82-.39l4 3a.5.5 0 010 .78l-4 3a.5.5 0 01-.82-.39v-6z"/>
            </svg>
            Play
            <kbd class="kbd kbd-sm">P</kbd>
          </button>
        )}

        <div
          class={`transition-all duration-300 ${
            stage === 'answer' ? 'opacity-100 max-h-40 mt-10' : 'opacity-0 max-h-0 overflow-hidden'
          }`}
        >
          <div class="text-2xl sm:text-3xl text-base-content/80 font-display">
            {item.english}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div class="mt-10 min-h-[5rem]">
        {stage === 'prompt' ? (
          <form
            hx-post="/study/grade"
            hx-target="#review-panel"
            hx-swap="outerHTML"
            class="text-center"
          >
            <input type="hidden" name="phraseId" value={item.phraseId} />
            <input type="hidden" name="cardId" value={item.cardId ?? ''} />
            <input type="hidden" name="kind" value={item.kind} />
            <input type="hidden" name="queue" value={remaining} />
            <input type="hidden" name="index" value={String(index)} />
            <input type="hidden" name="total" value={String(total)} />
            <input type="hidden" name="action" value="reveal" />
            <button class="btn btn-primary btn-lg gap-3 glow-primary" autofocus>
              Show answer
              <kbd class="kbd">Space</kbd>
            </button>
          </form>
        ) : (
          <form
            hx-post="/study/grade"
            hx-target="#review-panel"
            hx-swap="outerHTML"
            class="grid grid-cols-2 sm:grid-cols-4 gap-2"
          >
            <input type="hidden" name="phraseId" value={item.phraseId} />
            <input type="hidden" name="cardId" value={item.cardId ?? ''} />
            <input type="hidden" name="kind" value={item.kind} />
            <input type="hidden" name="queue" value={remaining} />
            <input type="hidden" name="index" value={String(index)} />
            <input type="hidden" name="total" value={String(total)} />
            <input type="hidden" name="action" value="grade" />

            {[
              { v: 1, label: 'Again', cls: 'border-error text-error hover:bg-error hover:text-error-content', hint: '< 1 min' },
              { v: 2, label: 'Hard', cls: 'border-warning text-warning hover:bg-warning hover:text-warning-content', hint: 'soon' },
              { v: 3, label: 'Good', cls: 'border-success text-success hover:bg-success hover:text-success-content', hint: 'days' },
              { v: 4, label: 'Easy', cls: 'border-primary text-primary hover:bg-primary hover:text-primary-content', hint: 'weeks' }
            ].map((b) => (
              <button
                name="rating"
                value={String(b.v)}
                class={`btn btn-outline flex-col h-auto py-3 ${b.cls} transition-colors`}
              >
                <span class="font-semibold text-base">{b.label}</span>
                <span class="flex items-center gap-1 text-[11px] opacity-70 font-normal">
                  <kbd class="kbd kbd-sm">{b.v}</kbd>
                  <span>{b.hint}</span>
                </span>
              </button>
            ))}
          </form>
        )}
      </div>
    </div>
  );
};

export const SessionComplete = ({ total }: { total: number }) => (
  <div id="review-panel" class="max-w-xl mx-auto text-center py-16">
    <div class="text-7xl mb-4">🎉</div>
    <h2 class="font-display text-4xl font-bold">Ẹ ṣeun!</h2>
    <p class="text-lg text-base-content/70 mt-2">
      Session complete{total > 0 ? ` — ${total} phrase${total === 1 ? '' : 's'}` : ''}.
    </p>
    <div class="mt-8 flex gap-2 justify-center">
      <a href="/study" class="btn btn-primary glow-primary">Another session</a>
      <a href="/progress" class="btn btn-ghost">See progress</a>
    </div>
  </div>
);
