# Video promocional (Remotion)

Video de 15 s del producto. Ver la spec en `docs/superpowers/specs/`.

> **Audio:** por ahora el video se renderiza **sin audio** (decisión tomada en
> `feature/inc-21-video-promocional-remotion`; edge-tts devolvía 403). Los scripts
> `npm run tts` (voces `es-*` de Microsoft Edge) y `npm run musica` (síntesis tipo
> "aura") quedan listos para reactivar la pista cuando haya locución disponible.

```bash
npm install
npm run tts        # opcional: requiere pip install edge-tts (y red)
npm run musica     # opcional
npm run render     # out/promo.mp4 (sin audio)
npm run lint
npm run studio     # previsualización
```

## Salida

- `out/promo.mp4` — 15 s, 1920×1080, H.264 (sin audio).
- Entrega copiada a `docs/presentacion/promo-remotion.mp4`.
