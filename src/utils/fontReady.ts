/**
 * 首屏字体闸门。
 *
 * 问题：SPA 的 #root 在 React 挂载前是空的，浏览器要等首屏真正有文字才开始下载
 * woff2；也就是说字体下载永远晚于第一次绘制，配合 font-display: swap 就会出现
 * "系统字体先渲染 -> 字体到达 -> 换字 -> 数字/标题重排"的抖动。
 *
 * 做法：
 * 1. index.html 里直接给 <html> 写 class="fonts-pending"（不依赖 JS，先于首帧生效）；
 * 2. 这里主动 document.fonts.load() 触发关键字符集的下载（不依赖文字是否已上屏）；
 * 3. 字体就绪（或超时）后移除 class，内容淡入。
 *
 * 超时兜底：弱网下不让用户一直看黑屏，宁可接受一次替换。
 */

const FONT_TIMEOUT_MS = 700;

/**
 * 首屏会用到、且视觉影响最大的字重（与 index.html 的 preload 列表保持一致）。
 * 只闸门这几个：Roboto 400/500/700 撑起全部文字与标签，
 * Roboto Condensed 900 是 Dashboard 里那几个超大数字。
 * Condensed 400/700 主要在折叠线以下的表格里，晚一点到也看不出来。
 */
const CRITICAL_FACES = [
  '400 1em Roboto',
  '500 1em Roboto',
  '700 1em Roboto',
  '900 1em "Roboto Condensed"',
];

export function revealAppAfterFontsReady(timeoutMs = FONT_TIMEOUT_MS): void {
  const root = document.documentElement;
  const reveal = () => root.classList.remove('fonts-pending');

  if (typeof document === 'undefined' || !document.fonts) {
    reveal();
    return;
  }

  // 主动请求字体，避免依赖"文字上屏后才触发下载"
  const loads = CRITICAL_FACES.map((face) => document.fonts.load(face).catch(() => []));

  const timeout = new Promise<void>((resolve) => {
    window.setTimeout(resolve, timeoutMs);
  });

  Promise.race([Promise.all(loads).then(() => undefined), timeout]).then(reveal, reveal);
}
