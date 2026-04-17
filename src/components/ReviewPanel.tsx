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
  queue: { phraseId: string }[]; // remaining after this one
  index: number; // position in session
  total: number;
  stage: 'prompt' | 'answer';
}

// A single review card. Two stages:
//  - prompt: show Yoruba + audio, hide English, only 'Show answer' button
//  - answer: reveal English + 4 grade buttons, which POST to /study/grade
export const ReviewPanel = ({ env, item, queue, index, total, stage }: ReviewPanelProps) => {
  const url = audioUrl(env, item.audioKey);
  const remaining = encodeURIComponent(JSON.stringify(queue));

  return (
    <div
      id="review-panel"
      class="card bg-base-200 max-w-xl mx-auto"
      data-autoplay-url={url || ''}
    >
      <div class="card-body">
        <div class="flex items-center justify-between text-xs text-base-content/60">
          <span class="badge badge-ghost">{item.kind === 'new' ? 'New' : 'Review'} · {item.deckSlug}</span>
          <span>
            {index + 1} / {total}
          </span>
        </div>

        <div class="py-8 text-center">
          <div class="yo text-5xl font-display" lang="yo">{item.yoruba}</div>
          {url && (
            <button
              class="btn btn-ghost mt-4"
              onclick={`(new Audio('${url}')).play()`}
              aria-label="Play audio"
            >
              ▶ Play
            </button>
          )}
          {stage === 'answer' && (
            <div class="mt-6 text-xl text-base-content/80">{item.english}</div>
          )}
        </div>

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
            <button class="btn btn-primary btn-lg" autofocus>
              Show answer <kbd class="kbd kbd-sm ml-2">space</kbd>
            </button>
          </form>
        ) : (
          <form
            hx-post="/study/grade"
            hx-target="#review-panel"
            hx-swap="outerHTML"
            class="grid grid-cols-4 gap-2"
          >
            <input type="hidden" name="phraseId" value={item.phraseId} />
            <input type="hidden" name="cardId" value={item.cardId ?? ''} />
            <input type="hidden" name="kind" value={item.kind} />
            <input type="hidden" name="queue" value={remaining} />
            <input type="hidden" name="index" value={String(index)} />
            <input type="hidden" name="total" value={String(total)} />
            <input type="hidden" name="action" value="grade" />
            <button name="rating" value="1" class="btn btn-error btn-outline flex-col">
              Again <kbd class="kbd kbd-sm">1</kbd>
            </button>
            <button name="rating" value="2" class="btn btn-warning btn-outline flex-col">
              Hard <kbd class="kbd kbd-sm">2</kbd>
            </button>
            <button name="rating" value="3" class="btn btn-success btn-outline flex-col">
              Good <kbd class="kbd kbd-sm">3</kbd>
            </button>
            <button name="rating" value="4" class="btn btn-info btn-outline flex-col">
              Easy <kbd class="kbd kbd-sm">4</kbd>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export const SessionComplete = ({ total }: { total: number }) => (
  <div id="review-panel" class="card bg-base-200 max-w-xl mx-auto text-center">
    <div class="card-body items-center">
      <div class="text-5xl">🎉</div>
      <h2 class="font-display text-2xl mt-2">Ẹ ṣeun! Session complete.</h2>
      <p class="text-base-content/70">You reviewed {total} phrase{total === 1 ? '' : 's'}.</p>
      <div class="mt-4 flex gap-2">
        <a href="/study" class="btn btn-primary">Another session</a>
        <a href="/progress" class="btn btn-ghost">See progress</a>
      </div>
    </div>
  </div>
);
