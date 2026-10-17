/* Touch + Apple Pencil input for Blender-wasm (iPad Safari).
 *
 * Safari fires compatibility mouse events only for TAPS, never for finger/Pencil drags, and
 * Blender (GHOST_SystemWeb) only listens to mouse events. So we translate Pointer Events into
 * synthetic MouseEvents on the canvas (GHOST reads shift/ctrl/alt from the event flags):
 *
 *   Pencil (pointerType "pen")   = left mouse button (draw / select / transform), hover = mouse move
 *   1 finger drag                = orbit   (middle mouse drag; with sticky Shift = pan)
 *   1 finger tap                 = left click (select)
 *   1 finger long press (0.5 s)  = right click (context menu)
 *   2 fingers pinch              = zoom    (Ctrl + middle mouse drag, smooth)
 *   2 fingers drag               = pan     (Shift + middle mouse drag)
 *   real mouse / trackpad        = untouched (native mouse events)
 *
 * Plus a floating key bar (Esc/Enter/Tab/A/G/R/S/X/Y/Z/Del/Undo/Redo + sticky Shift/Ctrl/Alt) for
 * shortcuts a touch screen has no keyboard for. Shown on touch devices or with ?touch=1;
 * hidden with ?touch=0.
 */

const TAP_MAX_MS = 350;
const TAP_MAX_PX = 8;
const LONG_PRESS_MS = 500;
const MOVE_START_PX = 6;
const GESTURE_START_PX = 10;
/* Pixels of synthetic Ctrl+MMB drag per e-fold of pinch scale (tuned by feel; sign checked in the
 * test: pinch-out must zoom in). */
const PINCH_PX_PER_LN_IN = 120;
const PINCH_PX_PER_LN_OUT = 210;

export function installTouch(canvas) {
  const qs = new URLSearchParams(location.search);
  const sticky = { shift: false, ctrl: false, alt: false };
  const pointers = new Map(); /* id -> {x, y, type, x0, y0, t0} */

  window.__touchDebug = () => ({ mode, pointers: [...pointers.keys()] });
  const mouse = (type, x, y, button, buttons, extra = {}) => {
    canvas.dispatchEvent(new MouseEvent(type, {
      bubbles: true, cancelable: true, view: window,
      clientX: x, clientY: y, button, buttons,
      shiftKey: sticky.shift || !!extra.shift,
      ctrlKey: sticky.ctrl || !!extra.ctrl,
      altKey: sticky.alt,
    }));
  };

  /* A click needs real time between press and release: Blender derives CLICK vs DRAG from the
   * press/release events, and events dispatched in one JS tick can be handled as one batch. */
  const click = (x, y, button) => {
    mouse("mousemove", x, y, 0, 0);
    setTimeout(() => mouse("mousedown", x, y, button, 1 << button), 20);
    setTimeout(() => mouse("mouseup", x, y, button, 0), 90);
  };

  /* ---- gesture state ---- */
  let mode = "idle"; /* idle | pending | orbit | pen | two | ignore */
  let longTimer = 0;
  let longFired = false;
  let two = null; /* {d0, cx0, cy0, kind: null|"zoom"|"pan", ax, ay, dragY} */

  const centroid = () => {
    const p = [...pointers.values()];
    return { x: p.reduce((s, q) => s + q.x, 0) / p.length, y: p.reduce((s, q) => s + q.y, 0) / p.length };
  };
  const dist = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const endTwo = () => {
    if (two && two.kind) {
      const extra = two.kind === "zoom" ? { ctrl: true } : { shift: true };
      mouse("mouseup", two.ax, two.ay, 1, 0, extra);
      /* GHOST takes shift/ctrl/alt from the LAST mouse event: clear the gesture's temporary
       * Ctrl/Shift so later keyboard shortcuts (Tab, Ctrl+Z...) are not seen as Ctrl+Tab etc. */
      mouse("mousemove", two.ax, two.ay, 0, 0);
    }
    two = null;
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType, x0: e.clientX, y0: e.clientY, t0: performance.now() });

    if (e.pointerType === "pen") {
      mode = "pen";
      mouse("mousemove", e.clientX, e.clientY, 0, 0);
      mouse("mousedown", e.clientX, e.clientY, e.button > 0 ? e.button : 0, 1 << (e.button > 0 ? e.button : 0));
      return;
    }
    /* touch */
    const touches = [...pointers.values()].filter((p) => p.type === "touch");
    if (touches.length === 1 && mode === "idle") {
      mode = "pending"; longFired = false;
      clearTimeout(longTimer);
      longTimer = setTimeout(() => {
        const p = [...pointers.values()][0];
        if (mode === "pending" && p) {
          longFired = true;
          click(p.x, p.y, 2);
        }
      }, LONG_PRESS_MS);
    }
    else if (touches.length === 2 && (mode === "pending" || mode === "orbit")) {
      clearTimeout(longTimer);
      if (mode === "orbit") {
        const p = [...pointers.values()][0];
        mouse("mouseup", p.x, p.y, 1, 0, {});
      }
      const c = centroid();
      two = { d0: dist(), cx0: c.x, cy0: c.y, kind: null, ax: c.x, ay: c.y, dragY: c.y };
      mode = "two";
    }
    else if (touches.length >= 3) {
      clearTimeout(longTimer);
      if (mode === "two") endTwo();
      mode = "ignore";
    }
  }, { passive: false });

  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") return;
    e.preventDefault();
    const p = pointers.get(e.pointerId);
    if (e.pointerType === "pen") {
      if (p) { p.x = e.clientX; p.y = e.clientY; }
      /* Hover (no contact) moves the cursor too. */
      mouse("mousemove", e.clientX, e.clientY, 0, mode === "pen" ? 1 : 0);
      return;
    }
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;

    if (mode === "pending") {
      if (Math.hypot(p.x - p.x0, p.y - p.y0) > MOVE_START_PX) {
        clearTimeout(longTimer);
        mode = "orbit";
        mouse("mousemove", p.x0, p.y0, 0, 0);
        mouse("mousedown", p.x0, p.y0, 1, 4);
        mouse("mousemove", p.x, p.y, 0, 4);
      }
    }
    else if (mode === "orbit") {
      mouse("mousemove", p.x, p.y, 0, 4);
    }
    else if (mode === "two" && two && pointers.size === 2) {
      const c = centroid();
      const d = dist();
      if (!two.kind) {
        const dd = Math.abs(d - two.d0);
        const dc = Math.hypot(c.x - two.cx0, c.y - two.cy0);
        if (dd > GESTURE_START_PX || dc > GESTURE_START_PX) {
          two.kind = dd > dc ? "zoom" : "pan";
          two.ax = c.x; two.ay = c.y; two.dragY = c.y; two.d0 = d; two.cx0 = c.x; two.cy0 = c.y;
          const extra = two.kind === "zoom" ? { ctrl: true } : { shift: true };
          mouse("mousemove", c.x, c.y, 0, 0, extra);
          mouse("mousedown", c.x, c.y, 1, 4, extra);
        }
      }
      else if (two.kind === "zoom") {
        /* pinch out (d grows) -> Ctrl+MMB drag toward ZOOM-IN direction (sign set by test). */
        /* Blender's Ctrl+MMB zoom accelerates when dragging up (in) and is slower going down (out). */
        const ln = Math.log(d / two.d0);
        const y = two.ay - (ln > 0 ? PINCH_PX_PER_LN_IN : PINCH_PX_PER_LN_OUT) * ln;
        mouse("mousemove", two.ax, y, 0, 4, { ctrl: true });
      }
      else {
        mouse("mousemove", c.x, c.y, 0, 4, { shift: true });
      }
    }
  }, { passive: false });

  const up = (e) => {
    if (e.pointerType === "mouse") return;
    e.preventDefault();
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) { /* already released */ }

    if (e.pointerType === "pen") {
      if (mode === "pen") {
        mouse("mouseup", p ? p.x : e.clientX, p ? p.y : e.clientY, 0, 0);
        mode = pointers.size ? "ignore" : "idle";
      }
      return;
    }
    if (mode === "pending") {
      clearTimeout(longTimer);
      if (p && !longFired && performance.now() - p.t0 < TAP_MAX_MS && Math.hypot(p.x - p.x0, p.y - p.y0) < TAP_MAX_PX) {
        click(p.x0, p.y0, 0);
      }
      mode = "idle";
    }
    else if (mode === "orbit") {
      mouse("mouseup", p ? p.x : e.clientX, p ? p.y : e.clientY, 1, 0);
      mode = "idle";
    }
    else if (mode === "two") {
      endTwo();
      mode = pointers.size ? "ignore" : "idle";
    }
    else if (pointers.size === 0) {
      mode = "idle";
    }
    if (pointers.size === 0) mode = "idle";
  };
  canvas.addEventListener("pointerup", up, { passive: false });
  canvas.addEventListener("pointercancel", up, { passive: false });

  /* Belt and braces for Safari: cancelling the touch events guarantees it does NOT synthesize its
   * own compatibility mouse events/click after a tap (they would double our synthetic click). */
  for (const t of ["touchstart", "touchmove", "touchend", "touchcancel"]) {
    canvas.addEventListener(t, (e) => e.preventDefault(), { passive: false });
  }

  /* ---- floating key bar ---- */
  const show = qs.get("touch") === "1" || (qs.get("touch") !== "0" && (navigator.maxTouchPoints || 0) > 0);
  if (!show) return;

  const KEYS = [
    ["Esc", "Escape", "Escape"], ["Enter", "Enter", "Enter"], ["Tab", "Tab", "Tab"],
    ["A", "KeyA", "a"], ["G", "KeyG", "g"], ["R", "KeyR", "r"], ["S", "KeyS", "s"],
    ["X", "KeyX", "x"], ["Y", "KeyY", "y"], ["Z", "KeyZ", "z"], ["Del", "Delete", "Delete"],
    ["1", "Digit1", "1"], ["2", "Digit2", "2"], ["3", "Digit3", "3"],
    ["⌂", "Home", "Home"],
  ];
  const MODS = [["Shift", "shift", "ShiftLeft"], ["Ctrl", "ctrl", "ControlLeft"], ["Alt", "alt", "AltLeft"]];

  const key = (type, code, k) => window.dispatchEvent(new KeyboardEvent(type, { code, key: k, bubbles: true, cancelable: true }));
  const press = (code, k) => {
    const ch = k.length === 1 && sticky.shift ? k.toUpperCase() : k;
    key("keydown", code, ch);
    setTimeout(() => key("keyup", code, ch), 40);
  };
  const chord = (mods, code, k) => {
    mods.forEach(([c, kk]) => key("keydown", c, kk));
    key("keydown", code, k);
    setTimeout(() => { key("keyup", code, k); mods.forEach(([c, kk]) => key("keyup", c, kk)); }, 60);
  };

  const bar = document.createElement("div");
  bar.id = "touchbar";
  bar.style.cssText = "position:fixed;left:50%;bottom:34px;transform:translateX(-50%);z-index:90;display:flex;" +
    "gap:6px;padding:6px;background:rgba(28,28,28,.88);border:1px solid #555;border-radius:12px;" +
    "font:600 15px system-ui,sans-serif;-webkit-user-select:none;user-select:none;touch-action:manipulation;" +
    "flex-wrap:wrap;max-width:96vw;justify-content:center";
  const btn = (label, onTap) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "min-width:46px;height:42px;padding:0 10px;border-radius:8px;border:1px solid #666;" +
      "background:#3a3a3a;color:#eee;font:inherit;touch-action:manipulation";
    b.addEventListener("pointerdown", (e) => e.preventDefault());   /* don't steal focus from canvas */
    b.addEventListener("click", onTap);
    bar.appendChild(b);
    return b;
  };
  KEYS.forEach(([label, code, k]) => btn(label, () => press(code, k)));
  btn("↶", () => chord([["ControlLeft", "Control"]], "KeyZ", "z")).title = "Undo (Ctrl+Z)";
  btn("↷", () => chord([["ControlLeft", "Control"], ["ShiftLeft", "Shift"]], "KeyZ", "z")).title = "Redo (Ctrl+Shift+Z)";
  MODS.forEach(([label, name, code]) => {
    const b = btn(label, () => {
      sticky[name] = !sticky[name];
      b.style.background = sticky[name] ? "#2a6fd6" : "#3a3a3a";
      key(sticky[name] ? "keydown" : "keyup", code, label);
    });
  });
  const hide = btn("✕", () => bar.remove());
  hide.title = "Skrýt lištu";
  document.body.appendChild(bar);
}
