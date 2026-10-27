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
  let updateArmed = () => {};
  const pointers = new Map(); /* id -> {x, y, type, x0, y0, t0} */

  window.__touchDebug = () => ({ mode, pointers: [...pointers.keys()], modalArmed });
  /* Modal operators started from the key bar (G/R/S/E…): a finger would orbit instead of moving the
   * cursor, so while "armed" one finger is a TRACKPAD (relative cursor move, tap = confirm click). */
  let modalArmed = false;
  let modalDrag = false;    /* B (box select) needs press-drag-release: pad finger acts as the left button */
  let modalTaps = 1;        /* taps that confirm before the pad switches off (loop cut = 2, knife = until Enter) */
  /* H11b: a modal operator is running (key bar OR hardware keyboard F/G/R/S/E). Pencil down must not press
   * LMB (= confirm at a jumped cursor position, size/transform jumps); it moves the cursor and confirms on lift. */
  let penModal = false;
  window.addEventListener("keydown", (e) => {
    if (!e.isTrusted || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === "Escape" || e.code === "Enter") penModal = false;
    else if (/^Key[FGRSE]$/.test(e.code) && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName || "")) penModal = true;
  }, true);
  let curX = 0, curY = 0;   /* last cursor position we sent to Blender */
  canvas.addEventListener("mousemove", (e) => { if (e.isTrusted) { curX = e.clientX; curY = e.clientY; } }, true);   /* real mouse/trackpad */
  let padNoMods = false;    /* pad moves/taps must not carry the sticky Ctrl/Shift used to start the operator */
  let padBase = null;       /* {bx, by, px, py} for the current trackpad drag */
  /* K2: during a trackpad drag (modal G/R/S…) every pointermove would redraw the edited mesh and allocate
   * ~1000 GPU buffers/s (docs/MEMORY.md K1) — iPad's GPU process dies. Coalesce to one move per
   * MOVE_CAP_MS (default 33 ≈ 30 fps; `?movecap=0` turns it off). */
  const MOVE_CAP_MS = qs.has("movecap") ? +qs.get("movecap") : 33;
  let padPending = null, padTimer = 0, padLast = 0;
  const flushPad = () => {
    padTimer = 0;
    if (!padPending) return;
    const q = padPending; padPending = null; padLast = performance.now();
    mouse("mousemove", q.x, q.y, 0, q.buttons, {}, true);
  };
  const padMove = (x, y, buttons) => {
    if (!MOVE_CAP_MS) { mouse("mousemove", x, y, 0, buttons); return; }
    padPending = { x, y, buttons };
    if (!padTimer) padTimer = setTimeout(flushPad, Math.max(0, MOVE_CAP_MS - (performance.now() - padLast)));
  };
  const mouse = (type, x, y, button, buttons, extra = {}, fromPad = false) => {
    if (padPending && !fromPad) {   /* anything else (press/release/other move) must see the latest pad position first */
      clearTimeout(padTimer); padTimer = 0;
      if (type === "mousemove") padPending = null; else flushPad();
    }
    curX = x; curY = y;
    canvas.dispatchEvent(new MouseEvent(type, {
      bubbles: true, cancelable: true, view: window,
      clientX: x, clientY: y, button, buttons,
      shiftKey: !padNoMods && sticky.shift || !!extra.shift,
      ctrlKey: !padNoMods && sticky.ctrl || !!extra.ctrl,
      altKey: !padNoMods && sticky.alt,
    }));
  };

  /* A click needs real time between press and release: Blender derives CLICK vs DRAG from the
   * press/release events, and events dispatched in one JS tick can be handled as one batch. */
  const click = (x, y, button) => {
    mouse("mousemove", x, y, 0, 0);
    setTimeout(() => mouse("mousedown", x, y, button, 1 << button), 20);
    setTimeout(() => mouse("mouseup", x, y, button, 0), 90);
  };

  /* Pencil pressure/tilt -> GHOST tablet data (see blender_web_pen in GHOST_SystemWeb.cc). */
  const penData = (active, e) => {
    const f = window.Module && window.Module._blender_web_pen;
    if (f) f(active ? 1 : 0, active ? (e.pressure || 0) : 0, (e.tiltX || 0) / 90, (e.tiltY || 0) / 90);
  };

  /* Where are the 3D viewports? Published by Blender (wm_web_publish_viewports in wm_draw.cc).
   * Over a viewport finger gestures navigate; over UI regions (properties, outliner, timeline,
   * headers...) one finger is the LEFT mouse button (drag sliders, resize, box select) and two
   * fingers scroll/zoom the editor (middle mouse drag). Unknown (old build) = viewport. */
  const inViewport = (x, y) => {
    const M = window.Module;
    if (!M || !M._blender_web_viewport_rects || !M.HEAPU8) return true;
    const a = new Int32Array(M.HEAPU8.buffer, M._blender_web_viewport_rects(), 33);
    const n = a[0];
    if (n === 0) return true;
    for (let i = 0; i < n; i++) {
      if (x >= a[1 + 4 * i] && y >= a[2 + 4 * i] && x <= a[3 + 4 * i] && y <= a[4 + 4 * i]) return true;
    }
    return false;
  };
  let area = "view"; /* "view" | "ui" for the current touch gesture */

  /* ---- gesture state ---- */
  let mode = "idle"; /* idle | pending | orbit | uidrag | pen | two | pad | ignore */
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
      const extra = two.kind === "zoom" ? { ctrl: true } : { shift: area === "view" };
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

    if (e.pointerType === "pen" && (penModal || modalArmed) && !modalDrag && inViewport(e.clientX, e.clientY)) {
      mode = "penmodal"; penData(true, e);
      mouse("mousemove", e.clientX, e.clientY, 0, 0);
      return;
    }
    if (e.pointerType === "pen") {
      mode = "pen";
      penData(true, e);
      mouse("mousemove", e.clientX, e.clientY, 0, 0);
      mouse("mousedown", e.clientX, e.clientY, e.button > 0 ? e.button : 0, 1 << (e.button > 0 ? e.button : 0));
      return;
    }
    /* touch */
    const touches = [...pointers.values()].filter((p) => p.type === "touch");
    if (touches.length === 1 && mode === "idle" && modalArmed && inViewport(e.clientX, e.clientY)) {
      mode = "pad"; padNoMods = true;
      padBase = { bx: curX, by: curY, px: e.clientX, py: e.clientY, down: false };
      if (modalDrag) { mouse("mousemove", curX, curY, 0, 0); padBase.down = true; setTimeout(() => { if (mode === "pad") mouse("mousedown", curX, curY, 0, 1); }, 20); }
      return;
    }
    if (touches.length === 1 && mode === "idle") {
      mode = "pending"; longFired = false;
      area = inViewport(e.clientX, e.clientY) ? "view" : "ui";
      /* Let Blender hover-highlight a gizmo under the finger (nav hand/zoom icons, move handles);
       * if one is hot when the drag starts, the drag goes to it (left button) instead of orbiting. */
      if (area === "view") {
        mouse("mousemove", e.clientX, e.clientY, 0, 0);
        /* 3D gizmo highlight resolves one event late (pending until the next mouse event) → repeat the move. */
        setTimeout(() => { if (mode === "pending") mouse("mousemove", e.clientX, e.clientY, 0, 0); }, 35);
      }
      clearTimeout(longTimer);
      longTimer = setTimeout(() => {
        const p = [...pointers.values()][0];
        if (mode === "pending" && p) {
          longFired = true;
          click(p.x, p.y, 2);
        }
      }, LONG_PRESS_MS);
    }
    else if (touches.length === 2 && (mode === "pending" || mode === "orbit" || mode === "uidrag")) {
      clearTimeout(longTimer);
      if (mode === "orbit" || mode === "uidrag") {
        const p = [...pointers.values()][0];
        mouse("mouseup", p.x, p.y, mode === "uidrag" ? 0 : 1, 0, {});
      }
      const c = centroid();
      area = inViewport(c.x, c.y) ? "view" : "ui";
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
      penData(mode === "pen" || mode === "penmodal", e);
      mouse("mousemove", e.clientX, e.clientY, 0, mode === "pen" ? 1 : 0);
      return;
    }
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;

    if (mode === "pad") {
      padMove(padBase.bx + (p.x - padBase.px), padBase.by + (p.y - padBase.py), padBase.down ? 1 : 0);
      return;
    }
    if (mode === "pending") {
      /* In a viewport give Blender ~60 ms to hover-highlight a gizmo under the finger before deciding orbit vs gizmo drag. */
      if (Math.hypot(p.x - p.x0, p.y - p.y0) > MOVE_START_PX && (area !== "view" || performance.now() - p.t0 >= 80)) {
        clearTimeout(longTimer);
        const gizmoHot = area === "view" && window.Module && window.Module._blender_web_gizmo_hot && window.Module._blender_web_gizmo_hot() === 1;
        const left = area === "ui" || gizmoHot;
        mode = left ? "uidrag" : "orbit";
        mouse("mousemove", p.x0, p.y0, 0, 0);
        mouse("mousedown", p.x0, p.y0, left ? 0 : 1, left ? 1 : 4);
        mouse("mousemove", p.x, p.y, 0, left ? 1 : 4);
      }
    }
    else if (mode === "orbit") {
      mouse("mousemove", p.x, p.y, 0, 4);
    }
    else if (mode === "uidrag") {
      mouse("mousemove", p.x, p.y, 0, 1);
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
          const extra = two.kind === "zoom" ? { ctrl: true } : { shift: area === "view" };
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
        mouse("mousemove", c.x, c.y, 0, 4, { shift: area === "view" });
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
      if (mode === "penmodal") {
        const x = p ? p.x : e.clientX, y = p ? p.y : e.clientY;
        penData(false, e);
        click(x, y, 0);   /* lift = confirm the modal operator where the Pencil is */
        penModal = false; modalArmed = false; modalDrag = false; updateArmed();
        mode = pointers.size ? "ignore" : "idle";
      }
      else if (mode === "pen") {
        mouse("mouseup", p ? p.x : e.clientX, p ? p.y : e.clientY, 0, 0);
        penData(false, e);
        mode = pointers.size ? "ignore" : "idle";
      }
      return;
    }
    if (mode === "pad" && padBase && padBase.down) {
      mouse("mouseup", curX, curY, 0, 0);
      modalArmed = false; modalDrag = false; updateArmed();
      mode = "idle";
      setTimeout(() => { if (mode !== "pad") padNoMods = false; }, 150);
    }
    else if (mode === "pad") {
      /* tap = confirm the modal operator (LMB click at the current cursor); a drag just moved it */
      if (p && performance.now() - p.t0 < TAP_MAX_MS && Math.hypot(p.x - p.x0, p.y - p.y0) < TAP_MAX_PX) {
        click(curX, curY, 0);
        if (--modalTaps <= 0) { modalArmed = false; updateArmed(); }
      }
      mode = "idle";
      setTimeout(() => { if (mode !== "pad") padNoMods = false; }, 150);
    }
    else if (mode === "pending") {
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
    else if (mode === "uidrag") {
      mouse("mouseup", p ? p.x : e.clientX, p ? p.y : e.clientY, 0, 0);
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


  /* ---- on-screen keyboard (iPad has none unless an <input> is focused) ----
   * iOS soft-keyboard keydown events usually have an EMPTY `code`; GHOST maps keys by `code`, so
   * such events are dropped. Re-dispatch them with a code derived from `key`. */
  const SYMBOLS = { " ": "Space", "-": "Minus", "_": "Minus", "=": "Equal", "+": "Equal", "[": "BracketLeft", "{": "BracketLeft",
    "]": "BracketRight", "}": "BracketRight", "\\": "Backslash", "|": "Backslash", ";": "Semicolon", ":": "Semicolon",
    "'": "Quote", "\"": "Quote", "`": "Backquote", "~": "Backquote", ",": "Comma", "<": "Comma", ".": "Period", ">": "Period",
    "/": "Slash", "?": "Slash" };
  const NAMED = { Tab: "Tab", Enter: "Enter", Escape: "Escape", Backspace: "Backspace", Delete: "Delete",
    ArrowLeft: "ArrowLeft", ArrowRight: "ArrowRight", ArrowUp: "ArrowUp", ArrowDown: "ArrowDown", Home: "Home", End: "End" };
  const SHIFTED_DIGITS = { "!": "1", "@": "2", "#": "3", "$": "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0" };
  const codeFromKey = (k) => {
    if (NAMED[k]) return NAMED[k];
    if (k.length !== 1) return "";
    if (/[a-z]/i.test(k)) return "Key" + k.toUpperCase();
    if (/[0-9]/.test(k)) return "Digit" + k;
    if (SHIFTED_DIGITS[k]) return "Digit" + SHIFTED_DIGITS[k];
    return SYMBOLS[k] || "";
  };
  const fixKey = (e) => {
    if (e.code || e.__fixed || !e.key) return;
    const code = codeFromKey(e.key);
    if (!code) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    const ev = new KeyboardEvent(e.type, { code, key: e.key, bubbles: true, cancelable: true, repeat: e.repeat,
      shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey });
    ev.__fixed = true;
    window.dispatchEvent(ev);
  };
  window.addEventListener("keydown", fixKey, true);
  window.addEventListener("keyup", fixKey, true);
  window.__touchCodeFromKey = codeFromKey;

  const showKeyboard = () => {
    let inp = document.getElementById("kbd-input");
    if (!inp) {
      inp = document.createElement("input");
      inp.id = "kbd-input";
      inp.type = "text";
      inp.autocapitalize = "off"; inp.autocomplete = "off"; inp.autocorrect = "off"; inp.spellcheck = false;
      /* 16px+ font avoids iOS zoom-on-focus; nearly invisible but focusable. */
      inp.style.cssText = "position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:.01;font-size:16px;border:0;padding:0;z-index:95";
      document.body.appendChild(inp);
      inp.addEventListener("input", () => { inp.value = ""; });   /* keys go to Blender via keydown; keep the field empty */
    }
    inp.focus({ preventScroll: true });
  };


  /* Raise the soft keyboard when Blender starts editing a text/number field (blender_web_text_editing)
   * and lower it when editing ends. iOS only opens the keyboard when focus() runs inside a user
   * gesture; WebKit lets timers started from a gesture (< 1 s) inherit it, so after every tap we poll
   * for ~1 s. Also works for a field that is already being edited when the poll starts. */
  let kbdUp = false;
  /* H7c: touching Module._fn before the runtime is up aborts Emscripten (assertions build), e.g. from a
   * `focus` event fired during startup (seen in a cross-origin iframe) — wait for calledRun. */
  const textEditing = () => { const M = window.Module; const f = M && M.calledRun && M._blender_web_text_editing; return f ? f() === 1 : false; };
  const watchTextEdit = () => {
    const t0 = performance.now();
    const step = () => {
      const te = textEditing();
      if (te && !kbdUp) { kbdUp = true; showKeyboard(); }
      else if (!te && kbdUp) { kbdUp = false; const i = document.getElementById("kbd-input"); if (i) i.blur(); }
      if (performance.now() - t0 < 950) setTimeout(step, 40);
    };
    setTimeout(step, 40);
  };
  window.__touchTextEditing = textEditing;
  canvas.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse" && !qs.get("autokbd")?.startsWith("0")) watchTextEdit(); }, true);
  /* H10: after app/tab switches iPadOS sometimes leaves focus on nothing (or on the hidden kbd-input),
   * and the Magic Keyboard stops reaching Blender. Give focus back to the canvas on return and on tap. */
  const refocusCanvas = () => {
    if (document.hidden || kbdUp || (window.Module && textEditing())) return;
    const a = document.activeElement;
    if (a === canvas || (a && a !== document.body && a.id !== "kbd-input" && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(a.tagName))) return;
    if (a && a.id === "kbd-input") a.blur();
    try { canvas.focus({ preventScroll: true }); } catch (_) {}
  };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(refocusCanvas, 50); });
  window.addEventListener("pageshow", () => setTimeout(refocusCanvas, 50));
  window.addEventListener("focus", () => setTimeout(refocusCanvas, 50));
  canvas.addEventListener("pointerdown", () => setTimeout(refocusCanvas, 0), true);
  /* editing can also end without a tap (Enter/Esc on the key bar): drop the keyboard state then */
  setInterval(() => { if (kbdUp && !textEditing()) { kbdUp = false; const i = document.getElementById("kbd-input"); if (i) i.blur(); } }, 500);

  /* ---- file manager: upload files into /uploads, download anything Blender wrote ----
   * iPad has no Blender-visible filesystem; exports (OBJ/FBX/GLB/...) land in the wasm FS, so the
   * page must hand them to the user as downloads, and imports need an upload path. */
  const fsWalk = (FS, dir, depth, out) => {
    let names = [];
    try { names = FS.readdir(dir); } catch (e) { return; }
    for (const n of names) {
      if (n === "." || n === "..") continue;
      const p = (dir === "/" ? "" : dir) + "/" + n;
      let st; try { st = FS.stat(p); } catch (e) { continue; }
      if ((st.mode & 0o170000) === 0o040000) {   /* WasmFS has no FS.isDir */ if (depth > 0) fsWalk(FS, p, depth - 1, out); }
      else if (!/(\.index\.json$|\/\.)/.test(p)) out.push({ path: p, size: st.size, mtime: st.mtime });
    }
  };
  const openFiles = () => {
    const M = window.Module;
    if (!M || !M.FS) return;
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;" +
      "background:rgba(0,0,0,.6);font:15px system-ui,sans-serif;color:#ddd";
    const box = document.createElement("div");
    box.style.cssText = "width:560px;max-width:92vw;max-height:80vh;overflow:auto;padding:18px;border-radius:12px;background:#1c1c1c;border:1px solid #555";
    ov.appendChild(box);
    const render = () => {
      const files = [];
      for (const root of ["/uploads", "/opfs/home", "/home", "/tmp", "/exports"]) fsWalk(M.FS, root, 4, files);
      files.sort((a, b) => b.mtime - a.mtime);   /* newest first */
      box.innerHTML = "<div style='font-size:18px;font-weight:600;margin-bottom:10px'>Soubory</div>" +
        "<div style='color:#aaa;margin-bottom:12px;line-height:1.4'>Nahraj soubory pro File ▸ Import (jsou v /uploads) a stáhni to, co Blender uložil/exportoval.</div>";
      const up = document.createElement("button");
      up.textContent = "⬆ Nahrát soubory…";
      up.style.cssText = "padding:10px 16px;border:0;border-radius:8px;background:#e87d0d;color:#111;font:600 15px system-ui;margin-right:8px";
      const inp = document.createElement("input"); inp.type = "file"; inp.multiple = true; inp.style.display = "none";
      up.onclick = () => inp.click();
      inp.onchange = async () => {
        try { M.FS.mkdir("/uploads"); } catch (e) { /* exists */ }
        for (const f of inp.files) M.FS.writeFile("/uploads/" + f.name, new Uint8Array(await f.arrayBuffer()));
        render();
      };
      const close = document.createElement("button");
      close.textContent = "Zavřít";
      close.style.cssText = "padding:10px 16px;border:0;border-radius:8px;background:#333;color:#ddd;font:15px system-ui";
      close.onclick = () => ov.remove();
      box.append(up, inp, close);
      const list = document.createElement("div"); list.style.marginTop = "14px";
      if (!files.length) list.innerHTML = "<div style='color:#888'>Zatím žádné soubory (ulož/exportuj něco v Blenderu).</div>";
      for (const f of files) {
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:10px;padding:6px 0;border-top:1px solid #333";
        const name = document.createElement("div");
        name.style.cssText = "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
        name.textContent = f.path + "  (" + (f.size / 1024).toFixed(0) + " KB)";
        const dl = document.createElement("button");
        dl.textContent = "⬇";
        dl.style.cssText = "padding:6px 14px;border:0;border-radius:6px;background:#2a6fd6;color:#fff;font:15px system-ui";
        dl.onclick = () => {
          const data = M.FS.readFile(f.path);
          const a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob([data], { type: "application/octet-stream" }));
          a.download = f.path.split("/").pop();
          document.body.appendChild(a); a.click(); a.remove();
        };
        row.append(name, dl); list.appendChild(row);
      }
      box.appendChild(list);
    };
    render();
    ov.addEventListener("click", (e) => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  };
  window.__openFileManager = openFiles;

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
  const MODAL_CODES = new Set(["KeyG", "KeyR", "KeyS", "KeyE", "KeyB", "KeyK"]);
  const press = (code, k) => {
    if (code === "KeyR" && sticky.ctrl) { modalArmed = true; modalTaps = 2; updateArmed(); }   /* loop cut: place, then slide */
    else if (code === "KeyK" && !sticky.ctrl) { modalArmed = true; modalTaps = 1e9; updateArmed(); }   /* knife: many clicks, Enter ends */
    else if (code === "KeyB" && !sticky.ctrl) { modalArmed = true; modalDrag = true; modalTaps = 1; updateArmed(); }
    else if (MODAL_CODES.has(code) && !sticky.ctrl && !sticky.shift && !sticky.alt) { modalArmed = true; modalTaps = 1; updateArmed(); }
    else if (code === "Enter" || code === "Escape" || code === "Tab") { modalArmed = false; modalDrag = false; updateArmed(); }
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
  updateArmed = () => { bar.style.borderColor = modalArmed ? "#2a6fd6" : "#555"; bar.style.boxShadow = modalArmed ? "0 0 0 2px #2a6fd6" : "none"; };
  bar.style.cssText = "position:fixed;left:0;right:0;margin:0 auto;width:fit-content;bottom:30px;z-index:90;display:flex;" +
    "gap:4px;padding:4px;background:rgba(28,28,28,.88);border:1px solid #555;border-radius:10px;" +
    "font:600 14px system-ui,sans-serif;-webkit-user-select:none;user-select:none;touch-action:manipulation;" +
    "flex-wrap:wrap;max-width:98vw;justify-content:center";
  const btn = (label, onTap) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "min-width:38px;height:36px;padding:0 6px;border-radius:7px;border:1px solid #666;" +
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
  /* second row: the rest of the keys modeling needs (E extrude, Space play, F2 rename, Ctrl+S save...) */
  const MORE = [["E", "KeyE", "e"], ["F", "KeyF", "f"], ["B", "KeyB", "b"], ["C", "KeyC", "c"], ["D", "KeyD", "d"],
    ["H", "KeyH", "h"], ["I", "KeyI", "i"], ["K", "KeyK", "k"], ["M", "KeyM", "m"], ["N", "KeyN", "n"], ["P", "KeyP", "p"],
    ["T", "KeyT", "t"], ["Q", "KeyQ", "q"], ["W", "KeyW", "w"], ["Space", "Space", " "], ["⌫", "Backspace", "Backspace"],
    ["F2", "F2", "F2"], ["F3", "F3", "F3"], [".", "Period", "."], ["-", "Minus", "-"], ["/", "Slash", "/"]];
  const more = document.createElement("div");
  more.id = "touchbar-more";
  more.style.cssText = "display:none;flex-basis:100%;flex-wrap:wrap;gap:4px;justify-content:center";
  const moreBtn = (label, onTap) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "min-width:38px;height:36px;padding:0 6px;border-radius:7px;border:1px solid #666;" +
      "background:#3a3a3a;color:#eee;font:inherit;touch-action:manipulation";
    b.addEventListener("pointerdown", (e) => e.preventDefault());
    b.addEventListener("click", onTap);
    more.appendChild(b);
    return b;
  };
  MORE.forEach(([label, code, k]) => moreBtn(label, () => press(code, k)));
  moreBtn("💾", () => chord([["ControlLeft", "Control"]], "KeyS", "s")).title = "Uložit (Ctrl+S)";
  const toggleMore = btn("⋯", () => { more.style.display = more.style.display === "none" ? "flex" : "none"; });
  toggleMore.title = "Další klávesy (E, Space, F2, Ctrl+S…)";
  btn("📁", openFiles).title = "Soubory: nahrát / stáhnout";
  btn("⌨", showKeyboard).title = "Klávesnice (psaní do polí, přejmenování)";
  const hide = btn("✕", () => bar.remove());
  hide.title = "Skrýt lištu";
  bar.appendChild(more);   /* last, so the 2nd row wraps below ALL first-row buttons */
  /* M6: the bar used to sit on top of the splash / "Launch Blender" screen; show it only once Blender draws. */
  bar.style.display = "none";
  document.body.appendChild(bar);
  const showWhenReady = setInterval(() => {
    if (window.__BGUI__ && window.__BGUI__.window) { bar.style.display = "flex"; clearInterval(showWhenReady); }
  }, 300);
}
