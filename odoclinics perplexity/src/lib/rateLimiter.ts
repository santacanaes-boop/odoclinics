// Rate limiting básico (sección 7: "Rate limiting frente a fuerza bruta").
// Defensa adicional al bloqueo por cuenta ya existente (sección 7 /
// src/lib/auth.ts): el bloqueo por cuenta detiene a quien ataca UNA cuenta
// conocida, pero no a quien prueba contraseñas contra muchos emails
// distintos desde la misma IP. Aquí se limita por IP.
//
// Limitación consciente: esto vive en memoria del proceso Node. Sirve para
// una única instancia (como este scaffold), pero en un despliegue con
// varias instancias/serverless cada una tendría su propio contador — hace
// falta un almacén compartido (Redis) para que el límite sea real en
// producción multi-instancia.
type Entrada = { intentos: number; reiniciaEn: number };

const VENTANA_MS = 5 * 60 * 1000;
const MAX_INTENTOS = 20;

const almacen = new Map<string, Entrada>();

export function demasiadosIntentos(clave: string): boolean {
  const ahora = Date.now();
  const entrada = almacen.get(clave);

  if (!entrada || entrada.reiniciaEn < ahora) {
    almacen.set(clave, { intentos: 1, reiniciaEn: ahora + VENTANA_MS });
    return false;
  }

  entrada.intentos += 1;
  return entrada.intentos > MAX_INTENTOS;
}
