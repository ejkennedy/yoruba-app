import { Context } from 'hono';
import { buildQueue, type StudyMode } from '@/lib/session-builder';
import { ReviewPanel, SessionComplete } from '@/components/ReviewPanel';

export const onRequestGet = async (c: Context) => {
  const auth = c.get('auth');
  if (!auth?.user) return c.redirect('/auth/login');
  const db = c.get('db');

  const mode = (c.req.query('mode') as StudyMode) || 'mix';
  const size = Math.max(1, Math.min(100, parseInt(c.req.query('size') || '25', 10)));
  const queue = await buildQueue(db, { userId: auth.user.id, mode, size });

  if (queue.length === 0) {
    return c.render(<SessionComplete total={0} />, { title: 'All caught up' });
  }

  const first = queue[0];
  const rest = queue.slice(1).map((q) => ({ phraseId: q.phraseId }));

  return c.render(
    <section class="space-y-6">
      <ReviewPanel env={c.env} item={first} queue={rest} index={0} total={queue.length} stage="prompt" />
      <div class="max-w-xl mx-auto">
        <progress class="progress w-full" value={1} max={queue.length}></progress>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
          // Keyboard shortcuts: space/enter = reveal or submit default, 1-4 = grade, p = replay
          const playPanelAudio = () => {
            const panel = document.getElementById('review-panel');
            const url = panel?.dataset?.autoplayUrl;
            if (url) { try { new Audio(url).play(); } catch (_) {} }
          };
          document.addEventListener('keydown', (e) => {
            if (['INPUT','TEXTAREA','SELECT'].includes((e.target||{}).tagName)) return;
            const panel = document.getElementById('review-panel');
            if (!panel) return;
            const grades = panel.querySelectorAll('button[name="rating"]');
            if (e.key === ' ' || e.key === 'Enter') {
              const show = panel.querySelector('form button:not([name="rating"])');
              if (show) { e.preventDefault(); show.click(); }
            } else if (['1','2','3','4'].includes(e.key) && grades.length) {
              e.preventDefault();
              grades[parseInt(e.key,10)-1]?.click();
            } else if (e.key.toLowerCase() === 'p') {
              e.preventDefault();
              playPanelAudio();
            }
          });
          document.body.addEventListener('htmx:afterSwap', () => playPanelAudio());
          // Autoplay the first card once on page load
          window.addEventListener('DOMContentLoaded', () => setTimeout(playPanelAudio, 120));
        `
        }}
      />
    </section>,
    { title: 'Session' }
  );
};
