import { useLayoutEffect } from 'react';

/*
 * Keeps the page behind a modal from scrolling (wheel, touch, keyboard), on every browser
 * including iPhone Safari: the body is pinned with position: fixed at the current scroll
 * offset, then put back exactly where it was when the last modal closes.
 *
 * Counted, so a modal opened on top of another (walk-in -> claim slip) keeps the lock
 * until both are closed.
 */
let lockCount = 0;
let savedScrollY = 0;
let savedStyle: Partial<Record<'position' | 'top' | 'left' | 'right' | 'width' | 'overflow' | 'paddingRight', string>> = {};

function lock() {
  lockCount += 1;
  if (lockCount > 1) return;

  const body = document.body;
  savedScrollY = window.scrollY;
  // If the scrollbar disappears while locked, pad by its width so nothing shifts sideways.
  // index.css keeps the bar's space reserved (overflow-y: scroll + scrollbar-gutter: stable),
  // so then there is nothing to make up for.
  const htmlStyle = getComputedStyle(document.documentElement);
  const barStaysReserved = htmlStyle.overflowY === 'scroll' || htmlStyle.scrollbarGutter?.includes('stable');
  const scrollbarWidth = barStaysReserved ? 0 : window.innerWidth - document.documentElement.clientWidth;
  savedStyle = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
  };
  body.style.position = 'fixed';
  body.style.top = `-${savedScrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) {
    const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${current + scrollbarWidth}px`;
  }
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;

  Object.assign(document.body.style, savedStyle);
  // 'instant' so a smooth-scroll setting doesn't animate the page back into place
  window.scrollTo({ top: savedScrollY, left: 0, behavior: 'instant' });
}

/** Locks page scrolling while `active` is true (e.g. pass the modal's isOpen). */
export function useLockBodyScroll(active: boolean = true) {
  // Layout effect: lock before the browser paints the modal, so the page never moves
  useLayoutEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}

/** Drop-in version for modals rendered inline: `{open && <div ...><ScrollLock /> ...</div>}` */
export function ScrollLock() {
  useLockBodyScroll(true);
  return null;
}
