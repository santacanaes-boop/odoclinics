// Con dniNie cifrado (sección 7 — ver src/lib/cifrado.ts), ya no se puede
// hacer una búsqueda parcial (`contains`) sobre ese campo: el cifrado
// determinista solo permite coincidencia EXACTA. Esta función detecta si
// el texto de búsqueda parece un DNI/NIE completo, para en ese caso añadir
// una condición de igualdad exacta en vez de "contains".
const DNI_REGEX = /^\d{8}[A-Za-z]$/;
const NIE_REGEX = /^[XYZxyz]\d{7}[A-Za-z]$/;

export function pareceDniNieCompleto(texto: string): boolean {
  const t = texto.trim();
  return DNI_REGEX.test(t) || NIE_REGEX.test(t);
}
