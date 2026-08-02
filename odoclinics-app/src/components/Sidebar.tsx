"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// 12 módulos — sección 4. Icono SIEMPRE acompañado de texto (nunca solo
// icono) por legibilidad en tablet, tal como fija la sección 2.
const MODULOS = [
  { href: "/dashboard", label: "Inicio", icon: "🏠" },
  { href: "/agenda", label: "Agenda", icon: "📅" },
  { href: "/pacientes", label: "Pacientes", icon: "🧑‍⚕️" },
  { href: "/laboratorio", label: "Laboratorio", icon: "🧪" },
  { href: "/contabilidad", label: "Contabilidad", icon: "💶" },
  { href: "/stock", label: "Stock y compras", icon: "📦" },
  { href: "/informes", label: "Informes", icon: "📊" },
  { href: "/marketing", label: "Marketing", icon: "📣" },
  { href: "/seguimiento", label: "Seguimiento", icon: "💬" },
  { href: "/proteccion-datos", label: "Protección de datos", icon: "🛡️" },
  { href: "/roles", label: "Roles y permisos", icon: "🔑" },
  { href: "/integraciones", label: "Integraciones", icon: "🔌" },
];

export default function Sidebar() {
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
          {MODULOS.map((m) => {
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
