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
│   │   │   ├── auth/           # JWT, guards, roles
│   │   │   ├── users/          # CRUD usuarios
│   │   │   ├── products/       # Catalogo productos + bulk import
│   │   │   ├── categories/     # Familias/categorias
│   │   │   ├── locations/      # Locales
│   │   │   ├── stations/       # Estaciones de cocina
│   │   │   ├── inventory/      # Conteos de inventario
│   │   │   ├── production/     # Reportes de produccion
│   │   │   ├── reports/        # Dashboard data
│   │   │   ├── common/         # Guards, decorators
│   │   │   └── prisma/         # PrismaService (Global)
│   │   └── prisma/
│   │       └── schema.prisma
│   └── web/                    # Next.js 16 PWA frontend
├── package.json                # Monorepo root (npm workspaces)
├── turbo.json                  # Turborepo config
└── CLAUDE.md
```

## Stack Tecnico

| Capa | Tecnologia |
|------|-----------|
| Backend | NestJS 11 + Prisma 6 + PostgreSQL |
| Frontend | Next.js 16 + React 19 + Tailwind CSS 4 + PWA |
| Auth | JWT (access 15m + refresh 7d) + bcrypt |
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
- Recipe -> RecipeIngredient

## Patrones del Proyecto
- PrismaModule es @Global() - no importar en cada modulo
- Soft delete: `isActive = false` (nunca hard delete)
- Password nunca en responses (usar select const)
- Pagination: `{ data, meta: { total, page, limit, lastPage } }`
- Guard stack: `AuthGuard('jwt')` -> `RolesGuard`
- API prefix: `/api`, Swagger en `/api/docs`
- Port: 4000 (dev)

## Comandos

```bash
# Root
npm run dev           # Dev api + web
npm run dev:api       # Solo backend
npm run dev:web       # Solo frontend
npm run build         # Build todo

# Database
npm run db:migrate    # Prisma migrate dev
npm run db:seed       # Seed data
npm run db:studio     # Prisma Studio
```

## Variables de Entorno (apps/api/.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/taringuita
JWT_SECRET=
JWT_REFRESH_SECRET=
CORS_ORIGIN=http://localhost:3000
PORT=4000
```

## Convenciones
1. Commits en espanol
2. Push = Deploy automatico
3. NO crear archivos .md innecesarios
4. NO usar emojis en codigo
5. Usuario GitHub: rachcampitos
