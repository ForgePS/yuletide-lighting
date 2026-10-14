import { mapLegacyPortalPathToAppPath } from '@clcrm/types';

/** Normalize app routes for comparison (strip trailing slash, ignore query/hash). */
export function normalizeTourPath(path: string): string {
  const base = path.split('?')[0]?.split('#')[0] ?? path;
  if (base.length > 1 && base.endsWith('/')) {
    return base.slice(0, -1);
  }
  return base || '/';
}

function isElementVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) return true;
  return el.offsetWidth > 0 && el.offsetHeight > 0;
}

export interface WaitOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** Max wait for client-side route transitions (pathname match). */
export const TOUR_ROUTE_TIMEOUT_MS = 12_000;
/** Max wait for portal magic-link exchange + redirect. */
export const TOUR_PORTAL_ROUTE_TIMEOUT_MS = 15_000;
/** Max wait for a required tour target element. */
export const TOUR_TARGET_TIMEOUT_MS = 15_000;
/** Shorter wait before skipping optional steps with missing targets. */
export const TOUR_OPTIONAL_TARGET_TIMEOUT_MS = 8_000;

export async function settleAfterNavigation(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => setTimeout(resolve, 120));
}

function waitUntil<T>(
  check: () => T | null | false,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (value: T | null) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      resolve(value);
    };

    const observer = new MutationObserver(() => {
      const result = check();
      if (result) finish(result as T);
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    }

    const intervalId = window.setInterval(() => {
      const result = check();
      if (result) finish(result as T);
    }, 50);

    const timeoutId = window.setTimeout(() => finish(null), timeoutMs);

    signal?.addEventListener('abort', () => finish(null), { once: true });

    const initial = check();
    if (initial) finish(initial as T);
  });
}

/** Wait until the browser pathname matches the tour step route. */
export async function waitForTourRoute(
  targetRoute: string,
  options: WaitOptions = {},
): Promise<boolean> {
  const timeoutMs = options.timeoutMs ?? TOUR_ROUTE_TIMEOUT_MS;
  const normalizedTarget = normalizeTourPath(targetRoute);

  if (normalizeTourPath(window.location.pathname) === normalizedTarget) {
    return true;
  }

  const result = await waitUntil(
    () => (normalizeTourPath(window.location.pathname) === normalizedTarget ? true : null),
    timeoutMs,
    options.signal,
  );

  return result === true;
}

/** Poll until a reactive ref/value is available (e.g. demo fixtures loading in background). */
export async function waitForRefValue<T>(
  read: () => T | null | undefined,
  options: WaitOptions = {},
): Promise<T | null> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const existing = read();
  if (existing != null) return existing;

  return waitUntil(() => {
    const value = read();
    return value != null ? value : null;
  }, timeoutMs, options.signal);
}

/** Poll the DOM (with MutationObserver) until a tour target is present and visible. */
export async function waitForTourTarget(
  selector: string,
  options: WaitOptions = {},
): Promise<Element | null> {
  const timeoutMs = options.timeoutMs ?? TOUR_TARGET_TIMEOUT_MS;

  const existing = document.querySelector(selector);
  if (existing && isElementVisible(existing)) {
    return existing;
  }

  return waitUntil(() => {
    const el = document.querySelector(selector);
    return el && isElementVisible(el) ? el : null;
  }, timeoutMs, options.signal);
}

function isScrollableContainer(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  const overflow = `${style.overflow} ${style.overflowX} ${style.overflowY}`;
  if (!/(auto|scroll|overlay)/.test(overflow)) return false;
  return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
}

function scrollElementWithinContainer(element: Element, container: HTMLElement): void {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  if (elementRect.left < containerRect.left || elementRect.right > containerRect.right) {
    const targetLeft =
      elementRect.left - containerRect.left + container.scrollLeft - (containerRect.width - elementRect.width) / 2;
    container.scrollLeft = Math.max(0, targetLeft);
  }

  if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
    const targetTop =
      elementRect.top - containerRect.top + container.scrollTop - (containerRect.height - elementRect.height) / 2;
    container.scrollTop = Math.max(0, targetTop);
  }
}

async function waitForLayoutSettle(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => setTimeout(resolve, 16));
}

/** Scroll nested overflow containers and the page so Driver.js measures the correct rect. */
export async function scrollTourTargetIntoView(element: Element): Promise<void> {
  const scrollableAncestors: HTMLElement[] = [];
  let parent = element.parentElement;
  while (parent) {
    if (isScrollableContainer(parent)) scrollableAncestors.push(parent);
    parent = parent.parentElement;
  }

  for (const container of scrollableAncestors) {
    scrollElementWithinContainer(element, container);
  }

  element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
  await waitForLayoutSettle();
}

export async function navigateToTourRoute(
  push: (href: string) => void,
  targetRoute: string,
  options: WaitOptions = {},
): Promise<boolean> {
  const normalizedTarget = normalizeTourPath(targetRoute);
  if (normalizeTourPath(window.location.pathname) === normalizedTarget) {
    return true;
  }

  push(targetRoute);
  const destination = mapLegacyPortalPathToAppPath(targetRoute) ?? targetRoute;
  return waitForTourRoute(destination, options);
}
