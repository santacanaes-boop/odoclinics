"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Modulo, NivelPermiso } from "@/lib/rbac";

// 12 módulos — sección 4. Icono SIEMPRE acompañado de texto (nunca solo
// icono) por legibilidad en tablet, tal como fija la sección 2.
// `disponible: false` = todavía no tiene página real (ver README "Qué
// falta a propósito"); se muestra sin enlace para no llevar a un 404, con
// el mismo patrón "· próximamente" que ya usa la ficha de paciente.
const MODULOS: { href: string; modulo: Modulo; label: string; icon: string; disponible: boolean }[] = [
  { href: "/dashboard", modulo: "inicio", label: "Inicio", icon: "🏠", disponible: true },
  { href: "/agenda", modulo: "agenda", label: "Agenda", icon: "📅", disponible: true },
  { href: "/pacientes", modulo: "pacientes", label: "Pacientes", icon: "🧑‍⚕️", disponible: true },
  { href: "/laboratorio", modulo: "laboratorio", label: "Laboratorio", icon: "🧪", disponible: true },
  { href: "/contabilidad", modulo: "contabilidad", label: "Contabilidad", icon: "💶", disponible: true },
  { href: "/stock", modulo: "stock", label: "Stock y compras", icon: "📦", disponible: true },
  { href: "/informes", modulo: "informes", label: "Informes", icon: "📊", disponible: true },
  { href: "/marketing", modulo: "marketing", label: "Marketing", icon: "📣", disponible: true },
  { href: "/seguimiento", modulo: "seguimiento", label: "Seguimiento", icon: "💬", disponible: true },
  { href: "/proteccion-datos", modulo: "proteccion_datos", label: "Protección de datos", icon: "🛡️", disponible: true },
  { href: "/roles", modulo: "roles", label: "Roles y permisos", icon: "🔑", disponible: false },
  { href: "/integraciones", modulo: "integraciones", label: "Integraciones", icon: "🔌", disponible: false },
];

// Solo se listan los módulos a los que el rol del usuario tiene acceso. Es
// cosmético: la barrera real es requierePermiso() en cada página y API.
export default function Sidebar({
  permisos,
}: {
  permisos: Partial<Record<Modulo, NivelPermiso>>;
}) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      {/* Botón hamburguesa — solo visible en tablet/móvil */}
      <button
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setAbierto((v) => !v)}
        className="lg:hidden fixed top-4 left-4 z-30 rounded-lg bg-purple-700 text-white p-2"
      >
        ☰
      </button>

      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen w-64 bg-purple-900 text-purple-100
          flex flex-col z-20 transition-transform
          ${abierto ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        `}
      >
        <div className="px-5 py-6">
          <span className="font-display text-xl font-semibold text-white">
            Odoclinics
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 space-y-1">
          {MODULOS.filter((m) => (permisos[m.modulo] ?? "ninguno") !== "ninguno").map((m) => {
            if (!m.disponible) {
              return (
                <div
                  key={m.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-purple-400/60 cursor-not-allowed"
                  aria-disabled="true"
                >
                  <span aria-hidden>{m.icon}</span>
                  <span>{m.label}</span>
                  <span className="ml-auto text-xs">próximamente</span>
                </div>
              );
            }

            const activo = pathname?.startsWith(m.href);
            return (
              <Link
                key={m.href}
                href={m.href}
                onClick={() => setAbierto(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  activo
                    ? "bg-purple-700 text-white"
                    : "text-purple-200 hover:bg-purple-800"
                }`}
              >
                <span aria-hidden>{m.icon}</span>
                <span>{m.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* No es un módulo de negocio (sección 4) — es la seguridad de la
            propia cuenta del usuario, por eso va aparte del RBAC. */}
        <div className="px-2 pb-4 pt-2 border-t border-purple-800">
          <Link
            href="/mfa"
            onClick={() => setAbierto(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
              pathname?.startsWith("/mfa")
                ? "bg-purple-700 text-white"
                : "text-purple-200 hover:bg-purple-800"
            }`}
          >
            <span aria-hidden>🔐</span>
            <span>Verificación en dos pasos</span>
          </Link>
        </div>
      </aside>

      {/* Overlay al abrir en tablet/móvil */}
      {abierto && (
        <div
          className="fixed inset-0 bg-black/30 z-10 lg:hidden"
          onClick={() => setAbierto(false)}
        />
      )}
    </>
  );
}
