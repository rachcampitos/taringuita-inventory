# Instrucciones para Claude Code - Taringuita Inventory

## Proyecto
Sistema de inventario digital para restaurante Taringuita (Chile). Chef ejecutivo Raymundo, 6 cocinas, 7 estaciones.

## GitHub
- **Repositorio:** github.com/rachcampitos/taringuita-inventory
- **Usuario GitHub:** rachcampitos
- **Branch principal:** main

## Estructura del Proyecto

```
taringuita-inventory/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/           # JWT, guards, roles, throttle login
│   │   │   ├── users/          # CRUD usuarios + assign stations
│   │   │   ├── products/       # Catalogo productos + bulk import + price history
│   │   │   ├── categories/     # Familias/categorias
│   │   │   ├── locations/      # Locales
│   │   │   ├── stations/       # Estaciones de cocina
│   │   │   ├── inventory/      # Conteos de inventario + offline sync
│   │   │   ├── production/     # Reportes de produccion diaria
│   │   │   ├── orders/         # Generacion auto de pedidos
│   │   │   ├── recipes/        # Recetas + ingredientes + costo + duplicar
│   │   │   ├── reports/        # Dashboard, consumo, tendencias, costos
│   │   │   ├── common/         # Guards, decorators
│   │   │   └── prisma/         # PrismaService (Global)
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── test/               # Unit tests (Jest)
│   └── web/                    # Next.js 16 PWA frontend
│       └── test/               # Unit tests (Vitest)
├── package.json                # Monorepo root (npm workspaces)
├── turbo.json                  # Turborepo config
└── CLAUDE.md
```

## Stack Tecnico

| Capa | Tecnologia |
|------|-----------|
| Backend | NestJS 11 + Prisma 6 + PostgreSQL |
| Frontend | Next.js 16 + React 19 + Tailwind CSS 4 + PWA (Serwist) |
| Auth | JWT (access 15m + refresh 7d) + bcrypt |
| Seguridad | helmet + @nestjs/throttler (60 req/min global, 5/min login) |
| Exports | pdfkit (PDF) + exceljs (Excel) |
| Charts | recharts |
| Scheduler | @nestjs/schedule (consumo semanal cron) |
| Testing | Jest (backend, 100 tests) + Vitest (frontend, 37 tests) |
| Monorepo | Turborepo |
| Hosting | Railway (API + PostgreSQL) + Cloudflare Pages (frontend) |

## Despliegue
- **API:** Railway - automatico con git push a main
- **Frontend:** Cloudflare Pages - automatico con git push a main
- **Solo hacer** `git push origin main`

## Roles de Usuario

| Rol | Descripcion |
|-----|-------------|
| ADMIN | Raymundo - acceso total, dashboard, config |
| HEAD_CHEF | Jefe de cocina - reportar inventario/produccion, exportar |
| SOUS_CHEF | Sous chef - reportar inventario/produccion |

## Estaciones de Cocina
montaje, frio, saltado, plancha, pizzeria, produccion, pasteleria

## Modelo de Datos Core
- Organization -> Location -> Station
- ProductCategory -> Product (~600 productos, 10 categorias)
- StationProduct (join), UserStation (join)
- InventoryCount (snapshot diario: unique [stationId, productId, date])
- ProductionLog (produccion diaria)
- Recipe -> RecipeIngredient (@@unique [recipeId, productId])
- RecipeCostSnapshot (historial de costos de receta, JSON snapshot)
- ProductPriceHistory (historial de precios de producto)
- WeeklyConsumption (consumo semanal calculado por scheduler)
- OrderRequest -> OrderItem (pedidos auto-generados)

### Enums
- Role: ADMIN, HEAD_CHEF, SOUS_CHEF
- RecipeType: PREPARACION, PRODUCCION, SEMIELABORADO, BASE, SALSA, POSTRE
- OrderStatus: DRAFT, CONFIRMED, SENT, RECEIVED, CANCELLED
- DeliveryDay: LUNES - VIERNES
- UnitOfMeasure: KG, LT, UN, GR, ML, + 15 mas

## Patrones del Proyecto
- PrismaModule es @Global() - no importar en cada modulo
- Soft delete: `isActive = false` (nunca hard delete)
- Password nunca en responses (usar select const)
- Pagination: `{ data, meta: { total, page, limit, lastPage } }`
- Guard stack: `AuthGuard('jwt')` -> `RolesGuard`
- API prefix: `/api`, Swagger en `/api/docs` (solo en desarrollo, deshabilitado en produccion)
- Health check: `GET /health` (sin auth, fuera de /api prefix)
- Rate limiting: 60 req/min global, 5 req/min en login
- Seguridad: helmet() headers en todas las respuestas
- JWT_SECRET y JWT_REFRESH_SECRET son REQUERIDOS (la app no arranca sin ellos)
- Timezone: `todayLocal()` usa `America/Santiago` (no UTC)
- Offline: IndexedDB v2 con stores `inventory-counts` y `production-logs`, sync individual por entry
- Auth refresh: extrae userId del token JWT (no del body)
- Reportes: rango maximo 90 dias en endpoints de consumo/tendencias/costos
- Port: 4000 (dev)

## Comandos

```bash
# Root
npm run dev           # Dev api + web
npm run dev:api       # Solo backend
npm run dev:web       # Solo frontend
npm run build         # Build todo

# Tests
cd apps/api && npx jest          # Backend tests (100 tests, 8 suites)
cd apps/web && npx vitest run    # Frontend tests (37 tests, 5 suites)

# Database
npm run db:migrate    # Prisma migrate dev
npm run db:seed       # Seed data
npm run db:studio     # Prisma Studio
```

## Variables de Entorno (apps/api/.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/taringuita
JWT_SECRET=          # REQUERIDO - la app no arranca sin esto
JWT_REFRESH_SECRET=  # REQUERIDO
CORS_ORIGIN=http://localhost:3000
PORT=4000
NODE_ENV=            # production deshabilita Swagger
```

## Convenciones
1. Commits en espanol
2. Push = Deploy automatico
3. NO crear archivos .md innecesarios
4. NO usar emojis en codigo
5. Usuario GitHub: rachcampitos
