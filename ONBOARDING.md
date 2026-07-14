# Onboarding — Librex

Sistema de distribución de libros. Este documento orienta a cualquiera (humano o IA) que llegue
nuevo al proyecto.

## Los dos repositorios
Librex son **dos proyectos** que corren juntos en local:

| Proyecto | Carpeta | Stack | Puerto |
|---|---|---|---|
| Frontend (este repo) | `librex-frontend` | React + Vite + TypeScript, pnpm | 5173 |
| Backend (vigente) | `../librex-backend` | .NET 9 (ASP.NET Core) + EF Core + PostgreSQL | 5176 |

> ⚠️ Existe una copia vieja del backend en `../Librex/backend` que **no se usa**. El backend
> vigente es `../librex-backend`.

El frontend en dev llama a `/api/...` (relativo) y Vite hace proxy a `http://localhost:5176`
(ver `vite.config.ts` y `.env.development.local`). La base de datos local es PostgreSQL en
`localhost:5433` (`librex_dev`).

## Arquitectura del backend (Clean Architecture)
`../librex-backend` está en capas:
- **Librex.Domain** — entidades puras (`Entities/`) e interfaces de repositorio (`Interfaces/`).
- **Librex.Application** — casos de uso (`UseCases/<Área>/`) y DTOs (`DTOs/<Área>/`). Cada área
  tiene un `Service` + `IService`.
- **Librex.Infrastructure** — EF Core: `Data/LibrexDbContext.cs`, `Data/Configurations/`
  (mapeo por entidad), `Data/Migrations/`, y `Repositories/`.
- **Librex.API** — controladores REST (`Controllers/`, ruta `api/<área>`), `Program.cs` (DI/JWT).

Convención de BD: tablas en minúscula/plural (`remissions`), columnas en PascalCase (`FolioNumber`).
Migraciones con `dotnet ef` (ver "Cómo correr").

## Estructura del frontend
- `src/paginas/` — páginas (una por ruta). `src/componentes/` — componentes (formularios en modal,
  PDFs con `@react-pdf/renderer`, etc.). `src/servicios/` — clientes de la API (axios) con sus DTOs.
  `src/contextos/` — `AuthContexto` (login con JWT en localStorage).
- Ruteo en `src/App.tsx`; navegación en `src/componentes/Sidebar.tsx`.
- Tablas con `@tanstack/react-table`; estilos mayormente inline + algo de react-bootstrap.
- API base: `src/servicios/apiCliente.ts` (en dev usa `/api` vía proxy).

## Modelo de dominio
- **Customer** — cliente (incluye `Contact` opcional).
- **Supplier** — proveedor (antes "Publisher/Editorial"). Un `Product` pertenece a un `Supplier`.
- **Product** — producto/título.
- **Remission** (remisión) — funciona como **factura**: tiene `Details`, `PaymentDueDate`
  (vencimiento) y `Discount` (**monto fijo**). Total = subtotal − Discount.
- **ReturnNote** (devolución) — ligada a una remisión; su `Discount` también es monto fijo.
- **Payment** (pago) — encabezado con `Amount` (recibido) y varias **`PaymentAllocation`**
  (remisión + monto). El remanente no asignado (`Amount − Σ asignaciones`) es un **anticipo**.
- **CompanySettings** — datos de la empresa (logo, etc.) para los PDFs.

### Fórmula de cuentas por cobrar (CxC)
Por remisión: `saldo = total − Σ devoluciones − Σ asignaciones de pago`.
Una remisión está **liquidada** cuando el saldo ≈ 0; **vencida** si saldo > 0 y hoy > `PaymentDueDate`.
La pantalla **Cuentas por cobrar** (`/receivables`) calcula esto en el frontend
(`src/servicios/cobranzaServicio.ts`) cruzando remisiones + pagos + devoluciones, y permite
registrar un cobro repartido entre varias remisiones (`CobranzaClienteModal`).

## Convenciones
- **Código en inglés** (componentes, funciones, props, servicios); **texto de UI en español**.
  Nombres de archivo en español (`ProveedoresPagina.tsx`), identificadores en inglés (`SuppliersPage`).
- Package manager **pnpm** (no npm/yarn). En esta máquina, instalar con
  `NODE_OPTIONS=--use-system-ca` por los certificados SSL corporativos.

## Cómo correr (local)
Backend (`../librex-backend`):
```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet ef database update --project Librex.Infrastructure --startup-project Librex.API  # migraciones
dotnet run --project Librex.API --launch-profile http   # http://localhost:5176 (Swagger en /swagger)
```
Frontend (este repo):
```powershell
pnpm dev    # http://localhost:5173
```
Verificar tipos: `npx tsc -b` (frontend) · `dotnet build` (backend).
