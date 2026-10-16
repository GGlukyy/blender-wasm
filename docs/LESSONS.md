# LESSONS — co nás stálo čas (krátce, jeden řádek na věc)

- iPad Safari potřebuje HTTPS kvůli SharedArrayBuffer (vlákna). LAN http nefunguje → cloudflared tunel.
- WGSL cache je v IndexedDB → pro test „poprvé“ smazat data webu nebo anonymní panel.
- Dlouhé buildy pouštět přes `setsid nohup … &` a číst log; neblokovat terminál.
- Repo klonovat do WSL (`~/`), ne do `/mnt/c/…` — build přes Windows disk je mnohonásobně pomalejší.
