import { NextRequest, NextResponse } from "next/server";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";
import { leerArchivo } from "@/lib/storage";

// Entrega radiografías, firmas y fotos de simulación. Son datos de salud:
// exige permiso de lectura en Pacientes y registra quién los consulta
// (LOPD-GDD, sección 7), igual que la ficha del paciente.
export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ ruta: string[] }> }
) {
  const { ruta } = await props.params;
  const { autorizado, session } = await requierePermiso("pacientes", "lectura");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (ruta.length !== 2) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }
  const [subcarpeta, nombre] = ruta;
  const archivo = await leerArchivo(subcarpeta, nombre);
  if (!archivo) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "VER_ARCHIVO_CLINICO",
    entidad: "Archivo",
    entidadId: `${subcarpeta}/${nombre}`,
  });

  return new NextResponse(new Uint8Array(archivo.contenido), {
    headers: {
      "Content-Type": archivo.tipo,
      "Content-Disposition": "inline",
      // El navegador no debe "adivinar" otro tipo ni ejecutar nada.
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      // Datos de salud: nunca en cachés compartidas.
      "Cache-Control": "private, no-store",
    },
  });
}
