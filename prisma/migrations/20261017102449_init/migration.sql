-- CreateTable
CREATE TABLE "Rol" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "permisos" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rolId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAuditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "detalle" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "dniNie" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "direccion" TEXT,
    "alertasMedicas" TEXT[],
    "origen" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anamnesis" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "patologiasPrevias" TEXT[],
    "alergiasMedicamentosas" TEXT[],
    "medicacionHabitual" TEXT[],
    "habitos" TEXT[],
    "completadoPorPaciente" BOOLEAN NOT NULL DEFAULT false,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anamnesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialTratamiento" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "concepto" TEXT NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "estadoPago" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialTratamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PiezaOdontograma" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "piezaFdi" INTEGER NOT NULL,
    "estado" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PiezaOdontograma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receta" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "medicamento" TEXT NOT NULL,
    "pauta" TEXT NOT NULL,
    "prescriptorId" TEXT NOT NULL,
    "estado" TEXT NOT NULL,

    CONSTRAINT "Receta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Radiografia" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivoUrl" TEXT NOT NULL,
    "dispositivoOrigen" TEXT,

    CONSTRAINT "Radiografia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consentimiento" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "fechaFirma" TIMESTAMP(3),
    "firmaImagenUrl" TEXT,

    CONSTRAINT "Consentimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presupuesto" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lineas" JSONB NOT NULL,
    "importeTotal" DECIMAL(10,2) NOT NULL,
    "estado" TEXT NOT NULL,
    "pdfUrl" TEXT,

    CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulacionIA" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tratamiento" TEXT NOT NULL,
    "tono" TEXT,
    "imagenAntesUrl" TEXT NOT NULL,
    "imagenDespuesUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulacionIA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Laboratorio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Laboratorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncargoLaboratorio" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "laboratorioId" TEXT NOT NULL,
    "trabajo" TEXT NOT NULL,
    "coste" DECIMAL(10,2) NOT NULL,
    "estado" TEXT NOT NULL,
    "fechaEnvio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEntregaEstimada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EncargoLaboratorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Factura" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "lineas" JSONB NOT NULL,
    "importe" DECIMAL(10,2) NOT NULL,
    "estado" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hashVerifactu" TEXT,
    "fechaEnvioAeat" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "importe" DECIMAL(10,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "stockActual" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "proveedorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoCompra" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "lineas" JSONB NOT NULL,
    "estado" TEXT NOT NULL,
    "fechaPedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEntregaEstimada" TIMESTAMP(3),

    CONSTRAINT "PedidoCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomatizacionMensaje" (
    "id" TEXT NOT NULL,
    "disparador" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "plantilla" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomatizacionMensaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContenidoMarketing" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContenidoMarketing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "gabinete" INTEGER NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "duracionMin" INTEGER NOT NULL,
    "tratamiento" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "profesionalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CicloEsterilizacion" (
    "id" TEXT NOT NULL,
    "equipo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "controlBiologico" TEXT NOT NULL,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CicloEsterilizacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rol_nombre_key" ON "Rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_entidad_entidadId_idx" ON "RegistroAuditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_usuarioId_idx" ON "RegistroAuditoria"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_dniNie_key" ON "Paciente"("dniNie");

-- CreateIndex
CREATE UNIQUE INDEX "Anamnesis_pacienteId_key" ON "Anamnesis"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "PiezaOdontograma_pacienteId_piezaFdi_key" ON "PiezaOdontograma"("pacienteId", "piezaFdi");

-- CreateIndex
CREATE UNIQUE INDEX "Laboratorio_nombre_key" ON "Laboratorio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_nombre_key" ON "Proveedor"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "AutomatizacionMensaje_disparador_key" ON "AutomatizacionMensaje"("disparador");

-- CreateIndex
CREATE INDEX "Cita_gabinete_fechaHora_idx" ON "Cita"("gabinete", "fechaHora");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItem_categoria_texto_key" ON "ChecklistItem"("categoria", "texto");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAuditoria" ADD CONSTRAINT "RegistroAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anamnesis" ADD CONSTRAINT "Anamnesis_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialTratamiento" ADD CONSTRAINT "HistorialTratamiento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiezaOdontograma" ADD CONSTRAINT "PiezaOdontograma_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receta" ADD CONSTRAINT "Receta_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Radiografia" ADD CONSTRAINT "Radiografia_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consentimiento" ADD CONSTRAINT "Consentimiento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presupuesto" ADD CONSTRAINT "Presupuesto_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulacionIA" ADD CONSTRAINT "SimulacionIA_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncargoLaboratorio" ADD CONSTRAINT "EncargoLaboratorio_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncargoLaboratorio" ADD CONSTRAINT "EncargoLaboratorio_laboratorioId_fkey" FOREIGN KEY ("laboratorioId") REFERENCES "Laboratorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoCompra" ADD CONSTRAINT "PedidoCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
