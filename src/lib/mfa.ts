import { authenticator } from "otplib";
import QRCode from "qrcode";

// MFA real con TOTP (sección 7: "Autenticación multifactor (MFA), obligatoria
// para roles con acceso a historiales clínicos"). Usa los campos
// Usuario.mfaEnabled/mfaSecret ya preparados en el schema desde la Fase 1.
authenticator.options = { window: 1 }; // tolera 1 paso (±30s) de desfase de reloj

export function generarSecreto(): string {
  return authenticator.generateSecret();
}

export async function generarCodigoQR(secreto: string, email: string): Promise<string> {
  const uri = authenticator.keyuri(email, "Odoclinics", secreto);
  return QRCode.toDataURL(uri);
}

export function verificarCodigo(secreto: string, codigo: string): boolean {
  try {
    return authenticator.check(codigo, secreto);
  } catch {
    return false;
  }
}
