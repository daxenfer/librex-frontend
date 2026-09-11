---
name: run-librex
description: Levantar, correr, manejar y tomar capturas de Librex (frontend React + API .NET). Úsalo cuando pidan arrancar la app, verificar un cambio en la app real, probar un endpoint, sembrar datos de prueba, o screenshot de una pantalla.
---

# Correr Librex

Librex son **dos repos que solo funcionan juntos**: este frontend (React + Vite, puerto
5173) y `../librex-backend` (.NET 9 + Postgres, puerto 5176). El frontend proxea `/api`
al backend, así que levantar uno solo no sirve de nada.

Se maneja con dos drivers que viven aquí:

| Driver | Para qué |
|---|---|
| `.claude/skills/run-librex/driver.mjs` | La API real vía HTTP+JWT: siembra, asercione, limpia. **Empieza aquí.** |
| `.claude/skills/run-librex/browser.mjs` | La UI en Chromium headless por CDP: capturas y texto de pantallas autenticadas. |

Las rutas de este documento son relativas a `librex-frontend/`.

## Prerrequisitos

Node 20+, pnpm y .NET 9 SDK. Postgres local escuchando en **5433** con la base `librex_dev`.

```bash
export NODE_OPTIONS=--use-system-ca   # certificados corporativos: sin esto pnpm falla
pnpm install
cd ../librex-backend && dotnet ef database update -p Librex.Infrastructure -s Librex.API
```

Para las capturas hace falta un Chromium (se descarga fuera del repo, a `~/AppData/Local/ms-playwright`):

```bash
npx --yes playwright@latest install chromium
```

## Levantar (los dos, en segundo plano)

```bash
cd ../librex-backend && dotnet run --project Librex.API   # 5176
cd ../librex-frontend && NODE_OPTIONS=--use-system-ca pnpm dev   # 5173
node .claude/skills/run-librex/driver.mjs health
```

`health` responde `PASS` por cada servidor. El backend tarda ~10 s en el primer arranque.

## Manejar la app (ruta del agente)

```bash
node .claude/skills/run-librex/driver.mjs smoke
```

Siembra su propio escenario (proveedor, producto, 2 clientes, 2 remisiones), corre **33
aserciones** sobre las reglas de negocio y de autorización que más se rompen, y limpia solo.
Cubre: la resolución de renglones, el motivo obligatorio en devoluciones sueltas, las guardas
de "remisión de otro cliente", la separación de lo ligado vs lo suelto en reportes, el reparto
de pagos, que el borrado lógico no mutile documentos, y qué responde la API a cada rol (crea
un `User` y un `Administrator` al vuelo y verifica los 403). Sale con código 1 si algo falla.

Otros comandos:

```bash
node .claude/skills/run-librex/driver.mjs seed     # deja datos [E2E] para navegar a mano
node .claude/skills/run-librex/driver.mjs clean    # borra todo lo marcado [E2E]
MSYS_NO_PATHCONV=1 node .claude/skills/run-librex/driver.mjs api GET /api/reports/unlinked-returns
```

Todo lo que crea lleva el prefijo `[E2E]` en el nombre; `clean` lo busca por ahí.

### Capturas y texto de la UI

```bash
node .claude/skills/run-librex/browser.mjs shot reports reportes.png
node .claude/skills/run-librex/browser.mjs text returns/new
```

Inyecta la sesión en `localStorage` antes de navegar, así que entra directo a pantallas
protegidas sin pasar por el login. **Después de `shot`, abre el PNG y míralo** — un marco en
blanco es un fallo de arranque, no un éxito.

Para ver una pantalla con otro rol, pásale credenciales por ambiente: la sesión que inyecta sale
del login real, así que trae los permisos que le correspondan.

```bash
LIBREX_USER=operativo LIBREX_PASS=Password123! node .claude/skills/run-librex/browser.mjs shot products operativo.png
```

Combinación típica para revisar un cambio de UI:

```bash
node .claude/skills/run-librex/driver.mjs seed
node .claude/skills/run-librex/browser.mjs shot reports antes.png
node .claude/skills/run-librex/driver.mjs clean
```

## Ruta humana

`pnpm dev` y abrir http://localhost:5173. Login: `superadmin` / `Admin1234!*`, rol `SuperAdmin` (viene de
`DbInitializer.cs`). El backend abre una pestaña de Swagger solo en Development.

## Gotchas

- **Git Bash destroza las rutas que empiezan con `/`.** `browser.mjs shot /reports` llega a
  Node como `C:/Program Files/Git/reports` y Chromium responde *"Cannot navigate to invalid
  URL"*. Usa la forma **sin diagonal inicial** (`reports`) o antepón `MSYS_NO_PATHCONV=1`.
  Aplica igual a `driver.mjs api GET /api/...`.
- **Los secretos ya no están en `appsettings.json`.** `Jwt:Key` y la cadena de conexión salen de
  `dotnet user-secrets` en local y de variables de entorno (`Jwt__Key`, `ConnectionStrings__Default`)
  fuera de desarrollo. Si la API no arranca quejándose de `Jwt:Key`, es que faltan.
  Ojo: la cadena vieja apuntaba a `...db.kubiy.com` y **su contraseña sigue en el historial de
  git**, así que hay que rotarla en el proveedor.
- **El historial de migraciones local se compactó a `InitialCreate` + `LoginSecurity`; la base
  remota sigue con las 25 viejas**, así que antes de desplegar hay que realinear su
  `__EFMigrationsHistory` o el `MigrateAsync()` del arranque truena.
- **El login tiene bloqueo y límite de peticiones.** 10 intentos fallidos bloquean la cuenta 15
  minutos, y son 20 peticiones por minuto por IP. Si al probar a mano empiezas a ver 401 con la
  contraseña buena, o 429, es eso: reinicia la API para vaciar el límite por IP, y para el bloqueo
  espera o corre `UPDATE users SET "LockedOutUntil" = NULL;`.
- **Un token deja de valer si cambia el usuario.** El sello (`SecurityStamp`) se compara contra la
  base en cada petición: dar de baja, cambiar rol, nombre de usuario o contraseña invalida las
  sesiones abiertas de esa cuenta. Una sesión inyectada a mano en `localStorage` deja de servir en
  cuanto tocas al usuario.
- **Un usuario dado de baja sigue ocupando su nombre.** El índice único de `users.Username` no
  distingue activos de inactivos, así que `smoke` les pone un sufijo de timestamp. Si creas
  usuarios de prueba a mano, no reutilices el nombre.
- **El borrado es lógico.** `clean` deja filas inactivas y **los folios quedan quemados**:
  suben en cada corrida y nunca se reutilizan. No asercione contra números de folio absolutos.
- **`GET /api/remissions` no puebla `productName` en los renglones**; solo
  `GET /api/remissions/{id}` lo hace. Por eso los formularios recargan por id. El `smoke`
  tiene una aserción que lo vigila.
- **Playwright como paquete no es importable vía npx** (`ERR_MODULE_NOT_FOUND` con
  `npx --package=playwright node script.mjs`). Por eso `browser.mjs` habla CDP directo por
  WebSocket — solo usa el *binario* de Chromium, sin dependencias de Node.
- **`localStorage` es por origen**, así que `browser.mjs` navega dos veces: primero al origen
  para poder escribir la sesión, luego a la ruta destino.
- **En Windows, `child.kill()` deja vivo el árbol de Chromium.** `browser.mjs` cierra con
  `taskkill /T /F`; si algo se cuelga, revisa procesos `chrome.exe` huérfanos.

## Troubleshooting

| Síntoma | Causa / arreglo |
|---|---|
| `Cannot navigate to invalid URL` | La conversión de MSYS. Quita la diagonal inicial de la ruta. |
| `Login falló (401)` | El backend no está sembrado, o corre contra otra base. Verifica que use Development. |
| `No encontré Chromium` | `npx playwright@latest install chromium`, o exporta `CHROME=<ruta>`. |
| `Chromium no abrió el puerto CDP` | Otro proceso tiene el 9333. Usa `CDP_PORT=9334`. |
| `smoke` truena en la siembra con 500 | Falta correr `dotnet ef database update`; el esquema está atrasado. |
| pnpm falla con error de certificado | Faltó `NODE_OPTIONS=--use-system-ca`. |
