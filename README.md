# Blender in the browser
<img width="1907" height="1076" alt="image" src="https://github.com/user-attachments/assets/04296d56-da28-42b7-bf9d-f703ccf15684" />


## Building

```bash
make all
make blender-web
cd demo
pnpm dev
```

## iPad notes
- Material Preview (EEVEE, "lite" profile) is **on by default** on iPad Safari. Add `?mp=0` to the URL for the lighter "MP Lite" (Solid with textures).
- **Rendered** shading works, but after a long session (10+ min) switching Material Preview → Rendered has frozen Blender once. Save first (autosave runs every 30 s), or reload the tab before switching.
- After a crash/reload Safari may keep the old tab's memory: close the tab fully and open the page again.
- Cmd+key on a hardware keyboard acts as Ctrl (Cmd+Z = undo).
