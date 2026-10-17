# Exportación para Nominalia

Paquete listo para subir al hosting (cPanel → "Setup Node.js App").
Instrucciones completas en `DESPLIEGUE_NOMINALIA.md`.

| | |
|---|---|
| Versión de la app | Fase 6 (MFA, cifrado de campo, rate limiting, Protección de datos) |
| Generado | 2026-10-17 |
| Uso previsto | **Demo / pruebas con datos ficticios** — no apto aún para pacientes reales |
| Next.js | 14.2.35 (standalone) · Node.js 20 recomendado (mínimo 18.17) |
| SHA-256 del zip | `f62d2c037970dd7ca9db548257af80b4a519407e844362c3202e3559aa5df01a` |

## Contenido

- `odoclinics-nominalia.zip` — app compilada + `migration.sql` + `seed.js`
- `DESPLIEGUE_NOMINALIA.md` — guía paso a paso

## Cómo actualizar esta carpeta

Desde `odoclinics perplexity/`:

```bash
./scripts/empaquetar-nominalia.sh
```

Regenera el zip y copia la guía aquí. Actualiza después la fecha y el SHA-256
de esta ficha (`sha256sum odoclinics-nominalia.zip`) y haz commit.
