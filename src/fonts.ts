/**
 * Display font setup.
 *
 * Requested font: 배달의민족 꾸불림체 (BM Kkubulim). The official distributor
 * is Woowa Brothers (https://www.woowahan.com/fonts). It could not be fetched
 * from this build environment, and the original MVP's jsDelivr mirror is not an
 * official source, so it is NOT bundled.
 *
 * To enable it after downloading it yourself from the official site and
 * checking its licence:
 *   1. put the file at `public/assets/fonts/BMKkubulim.woff2`
 *   2. set KKUBULIM_FONT_FILE below to 'assets/fonts/BMKkubulim.woff2'
 *
 * Fallback: BM JUA (배달의민족 주아체), shipped via the `@fontsource/jua` npm
 * package under the SIL Open Font License 1.1 and bundled locally by Vite.
 */
import '@fontsource/jua/400.css';
import { DRINKS } from './game/drinks';

/** Every glyph painted into canvas textures, so all unicode-range subsets load. */
const CANVAS_TEXT = `${DRINKS.map((d) => d.name).join('')}정답은 이 아래에 숨겨져 있어요 RIGHT! 0123456789:.`;

const KKUBULIM_FONT_FILE: string | null = null;

export async function loadFonts(extraText = ''): Promise<void> {
  const text = CANVAS_TEXT + extraText;
  const tasks: Promise<unknown>[] = [];
  if (KKUBULIM_FONT_FILE) {
    const face = new FontFace('BMKkubulim', `url(${import.meta.env.BASE_URL}${KKUBULIM_FONT_FILE})`, { display: 'swap' });
    document.fonts.add(face);
    tasks.push(face.load().catch(() => console.warn('[nbox] BMKkubulim font failed to load; using Jua')));
  }
  // Make sure Jua is ready before canvas textures (can labels) are painted.
  tasks.push(document.fonts.load('48px Jua', text).catch(() => undefined));
  if (KKUBULIM_FONT_FILE) tasks.push(document.fonts.load('48px BMKkubulim', text).catch(() => undefined));
  const timeout = new Promise((r) => setTimeout(r, 2500));
  await Promise.race([Promise.all(tasks), timeout]);
}
