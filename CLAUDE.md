# CLAUDE.md — Librex Frontend

## Descripción
Sistema de distribución de libros — interfaz de usuario React.

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
