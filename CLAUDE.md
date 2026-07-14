# CLAUDE.md — Librex Frontend

## Descripción
Sistema de distribución de libros — interfaz de usuario React.

> 📖 Para la arquitectura completa (los 2 repos, capas del backend, modelo de dominio y cómo correr
> todo) ver [ONBOARDING.md](ONBOARDING.md). Léelo al iniciar un chat nuevo.

## Arquitectura (resumen)
- **Dos repos**: este frontend (`librex-frontend`, puerto 5173) y el backend **vigente**
  `../librex-backend` (.NET 9 + EF Core + PostgreSQL local en `localhost:5433`, puerto 5176).
  ⚠️ Ignorar la copia vieja `../Librex/backend`.
- **Backend** en Clean Architecture: `Librex.Domain` (entidades/interfaces), `Librex.Application`
  (`UseCases/` + `DTOs/`), `Librex.Infrastructure` (EF: `LibrexDbContext`, `Configurations/`,
  `Migrations/`, `Repositories/`), `Librex.API` (`Controllers/`, `api/<área>`).
- **Frontend**: `src/paginas`, `src/componentes`, `src/servicios` (axios + DTOs), `src/contextos`
  (auth JWT). Tablas con `@tanstack/react-table`.
- **Dominio**: Customer · Supplier (proveedor) · Product · Remission (= factura, `Discount` es **monto**)
  · ReturnNote (devolución) · Payment + **PaymentAllocation** (un pago se reparte en remisiones; el
  remanente es anticipo). Saldo CxC = `total − devoluciones − pagos aplicados`.

## Stack
- React + Vite + TypeScript
- Package manager: **pnpm**
- Puerto de desarrollo: 5173
- Proxy `/api` → `http://localhost:5176` (configurado en Vite)

## Idioma de la UI
- **Todo el código en inglés**: nombres de componentes, variables, funciones, props, servicios
- **Todo el texto visible al usuario en español**: labels, botones, mensajes de error, títulos, placeholders
- Proper nouns como "Librex" se mantienen igual en ambos idiomas

## Configuración
En esta máquina, pnpm requiere `NODE_OPTIONS=--use-system-ca` por certificados SSL corporativos:
```powershell
$env:NODE_OPTIONS = "--use-system-ca"
pnpm install
```

## Comandos frecuentes
```powershell
pnpm dev          # servidor de desarrollo (puerto 5173)
pnpm build        # compilar para producción
npx tsc --noEmit  # verificar tipos sin compilar
```

## Lo que NO hacer
- No usar npm o yarn — siempre pnpm
- No olvidar `NODE_OPTIONS=--use-system-ca` antes de instalar paquetes en esta máquina
