import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { cultureNotes } from '@/db/schema';

// Trivial markdown → HTML (headings, bold, italics, lists). Keeps the worker
// bundle lean; swap for a proper renderer if content gets complex.
function md(src: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let s = esc(src);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  s = s.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // simple table support
  s = s.replace(/^\|(.+)\|\n\|[-|\s]+\|\n((?:\|.*\|\n?)+)/gm, (_m, header: string, rows: string) => {
    const cols = header.split('|').map((x: string) => x.trim()).filter(Boolean);
    const body = rows
      .trim()
      .split('\n')
      .map(
        (row: string) =>
          '<tr>' +
          row
            .split('|')
            .slice(1, -1)
            .map((c) => `<td>${c.trim()}</td>`)
            .join('') +
          '</tr>'
      )
      .join('');
    return (
      '<table class="table"><thead><tr>' +
      cols.map((c: string) => `<th>${c}</th>`).join('') +
      '</tr></thead><tbody>' +
      body +
      '</tbody></table>'
    );
  });
  s = s
    .split(/\n{2,}/)
    .map((p) => (/^<(h\d|table|ul|ol)/.test(p.trim()) ? p : `<p>${p.replace(/\n/g, '<br/>')}</p>`))
    .join('\n');
  return s;
}

export const onRequestGet = async (c: Context) => {
  const db = c.get('db');
  const note = await db.select().from(cultureNotes).where(eq(cultureNotes.slug, c.req.param('slug')!)).get();
  if (!note) return c.notFound();
  return c.render(
    <article class="prose max-w-2xl mx-auto">
      <a href="/culture" class="text-sm link no-underline">← Culture</a>
      <h1 class="font-display">{note.title}</h1>
      {note.summary && <p class="lead text-base-content/70">{note.summary}</p>}
      <div dangerouslySetInnerHTML={{ __html: md(note.body) }} />
    </article>,
    { title: note.title }
  );
};
