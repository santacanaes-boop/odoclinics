# Exportación para Nominalia

Paquete listo para subir al hosting (cPanel → "Setup Node.js App").
Instrucciones completas en `DESPLIEGUE_NOMINALIA.md`.

| | |
|---|---|
| Versión de la app | Fases 1-6 + Informes, MFA obligatorio, permisos en páginas, Inicio |
| Generado | 2026-10-17 |
| Uso previsto | **Demo / pruebas con datos ficticios** — no apto aún para pacientes reales |
| Next.js | 16 (standalone) · requiere Node.js 20.9 o superior |
| SHA-256 del zip | `f69a8f1d9075597d0acc83f705267d4350bd409c55eb254919fff49d1f69764f` |

## Contenido

- `odoclinics-nominalia.zip` — app compilada + `migration.sql` + `seed.js` + `reiniciarMfa.js`
- `DESPLIEGUE_NOMINALIA.md` — guía paso a paso

## Cómo actualizar esta carpeta

Desde la raíz del repositorio:

```bash
./scripts/empaquetar-nominalia.sh
```

Regenera el zip y copia la guía aquí. Actualiza después la fecha y el SHA-256
de esta ficha (el script lo imprime al terminar) y haz commit.
