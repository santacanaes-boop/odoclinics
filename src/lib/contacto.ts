// Enlaces de contacto directo real (sección 4.9.3: "botón de envío
// directo"). En vez de fingir una integración con WhatsApp Business API o
// un proveedor de email que no existe en este scaffold, se usan enlaces
// wa.me/mailto: reales — abren WhatsApp o el cliente de correo del
// profesional con el mensaje ya redactado, sin necesitar ninguna API key.
// El envío automático real (sin intervención humana) queda // TODO Fase 6.
export function enlaceWhatsApp(telefono: string, mensaje: string): string {
  const digitos = telefono.replace(/\D/g, "");
  // Asume España (+34) si el número no trae ya un prefijo de país plausible.
  const conPrefijo = digitos.length === 9 ? `34${digitos}` : digitos;
  return `https://wa.me/${conPrefijo}?text=${encodeURIComponent(mensaje)}`;
}

export function enlaceEmail(email: string, asunto: string, mensaje: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`;
}
