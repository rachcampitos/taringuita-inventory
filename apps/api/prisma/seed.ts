import { PrismaClient, Role, UnitOfMeasure } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

function log(msg: string): void {
  console.log(`[seed] ${msg}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  log('Starting seed...');

  // -------------------------------------------------------------------------
  // 1. Organization
  // -------------------------------------------------------------------------
  log('Upserting organization...');
  const organization = await prisma.organization.upsert({
    where: { id: 'org-taringuita' },
    update: { name: 'Taringuita' },
    create: { id: 'org-taringuita', name: 'Taringuita' },
  });
  log(`  Organization: ${organization.name}`);

  // -------------------------------------------------------------------------
  // 2. Location
  // -------------------------------------------------------------------------
  log('Upserting location...');
  const location = await prisma.location.upsert({
    where: { id: 'loc-vitacura' },
    update: {
      name: 'Taringuita Vitacura',
      address: 'Vitacura, Santiago, Chile',
    },
    create: {
      id: 'loc-vitacura',
      name: 'Taringuita Vitacura',
      address: 'Vitacura, Santiago, Chile',
      organizationId: organization.id,
    },
  });
  log(`  Location: ${location.name}`);

  // -------------------------------------------------------------------------
  // 3. Stations
  // -------------------------------------------------------------------------
  log('Upserting stations...');

  const stationDefs = [
    { id: 'sta-montaje',    name: 'montaje' },
    { id: 'sta-frio',       name: 'frio' },
    { id: 'sta-saltado',    name: 'saltado' },
    { id: 'sta-plancha',    name: 'plancha' },
    { id: 'sta-pizzeria',   name: 'pizzeria' },
    { id: 'sta-produccion', name: 'produccion' },
    { id: 'sta-pasteleria', name: 'pasteleria' },
  ];

  const stations: Record<string, { id: string; name: string }> = {};

  for (const def of stationDefs) {
    const station = await prisma.station.upsert({
      where: { id: def.id },
      update: { name: def.name },
      create: { id: def.id, name: def.name, locationId: location.id },
    });
    stations[def.name] = station;
    log(`  Station: ${station.name}`);
  }

  // -------------------------------------------------------------------------
  // 4. Users
  // -------------------------------------------------------------------------
  log('Upserting users...');

  interface UserDef {
    id: string;
    email: string;
    name: string;
    password: string;
    role: Role;
    stationNames: string[];
  }

  const userDefs: UserDef[] = [
    {
      id: 'usr-raymundo',
      email: 'raymundo@taringuita.cl',
      name: 'Raymundo',
      password: 'admin123',
      role: Role.ADMIN,
      stationNames: [],
    },
    {
      id: 'usr-carlos',
      email: 'carlos@taringuita.cl',
      name: 'Carlos',
      password: 'chef123',
      role: Role.HEAD_CHEF,
      stationNames: ['montaje', 'frio', 'saltado'],
    },
    {
      id: 'usr-maria',
      email: 'maria@taringuita.cl',
      name: 'Maria',
      password: 'chef123',
      role: Role.HEAD_CHEF,
      stationNames: ['plancha', 'pizzeria', 'produccion', 'pasteleria'],
    },
    {
      id: 'usr-pedro',
      email: 'pedro@taringuita.cl',
      name: 'Pedro',
      password: 'sous123',
      role: Role.SOUS_CHEF,
      stationNames: ['montaje', 'frio', 'saltado'],
    },
    {
      id: 'usr-ana',
      email: 'ana@taringuita.cl',
      name: 'Ana',
      password: 'sous123',
      role: Role.SOUS_CHEF,
      stationNames: ['plancha', 'pizzeria', 'produccion', 'pasteleria'],
    },
  ];

  for (const def of userDefs) {
    const hashed = await hashPassword(def.password);

    const user = await prisma.user.upsert({
      where: { email: def.email },
      update: { name: def.name, role: def.role, password: hashed },
      create: {
        id: def.id,
        email: def.email,
        name: def.name,
        password: hashed,
        role: def.role,
        organizationId: organization.id,
      },
    });

    // Assign stations
    for (const stationName of def.stationNames) {
      const station = stations[stationName];
      if (!station) continue;
      await prisma.userStation.upsert({
        where: { userId_stationId: { userId: user.id, stationId: station.id } },
        update: {},
        create: { userId: user.id, stationId: station.id },
      });
    }

    log(`  User: ${user.name} (${user.role})`);
  }

  // -------------------------------------------------------------------------
  // 5. Product Categories
  // -------------------------------------------------------------------------
  log('Upserting product categories...');

  interface CategoryDef {
    id: string;
    name: string;
    sortOrder: number;
  }

  const categoryDefs: CategoryDef[] = [
    { id: 'cat-abarrotes',    name: 'Abarrotes Cocina',       sortOrder: 1 },
    { id: 'cat-fv',           name: 'Frutas y Verduras',      sortOrder: 2 },
    { id: 'cat-carnes',       name: 'Carnes y Aves',          sortOrder: 3 },
    { id: 'cat-pescados',     name: 'Pescados y Mariscos',    sortOrder: 4 },
    { id: 'cat-lacteos',      name: 'Lacteos y Huevos',       sortOrder: 5 },
    { id: 'cat-panaderia',    name: 'Panaderia y Pasteleria', sortOrder: 6 },
    { id: 'cat-bebidas',      name: 'Bebidas y Licores',      sortOrder: 7 },
    { id: 'cat-salsas',       name: 'Salsas y Condimentos',   sortOrder: 8 },
    { id: 'cat-preelaborado', name: 'Pre-elaborados',         sortOrder: 9 },
    { id: 'cat-limpieza',     name: 'Limpieza y Descartables', sortOrder: 10 },
  ];

  const categories: Record<string, { id: string; name: string }> = {};

  for (const def of categoryDefs) {
    const category = await prisma.productCategory.upsert({
      where: { name: def.name },
      update: { sortOrder: def.sortOrder },
      create: { id: def.id, name: def.name, sortOrder: def.sortOrder },
    });
    categories[def.id] = category;
    log(`  Category: ${category.name}`);
  }

  // -------------------------------------------------------------------------
  // 6. Products
  // -------------------------------------------------------------------------
  log('Upserting products...');

  interface ProductDef {
    code: string;
    name: string;
    categoryId: string;
    unit: UnitOfMeasure;
    minStock: number;
    wastagePercent: number;
    stationNames: string[];
  }

  const productDefs: ProductDef[] = [
    // ---- Abarrotes Cocina (cat-abarrotes) ----------------------------------
    {
      code: 'PRD-001', name: 'Arroz grano largo',
      categoryId: 'cat-abarrotes', unit: UnitOfMeasure.KG,
      minStock: 20, wastagePercent: 0,
      stationNames: ['montaje', 'saltado', 'produccion'],
    },
    {
      code: 'PRD-002', name: 'Fideos espagueti',
      categoryId: 'cat-abarrotes', unit: UnitOfMeasure.KG,
      minStock: 10, wastagePercent: 0,
      stationNames: ['montaje', 'saltado', 'produccion'],
    },
    {
      code: 'PRD-003', name: 'Aceite vegetal',
      categoryId: 'cat-abarrotes', unit: UnitOfMeasure.LT,
      minStock: 10, wastagePercent: 0,
      stationNames: ['montaje', 'saltado', 'plancha', 'produccion'],
    },
    {
      code: 'PRD-004', name: 'Azucar',
      categoryId: 'cat-abarrotes', unit: UnitOfMeasure.KG,
      minStock: 10, wastagePercent: 0,
      stationNames: ['montaje', 'produccion', 'pasteleria'],
    },
    {
      code: 'PRD-005', name: 'Sal fina',
      categoryId: 'cat-abarrotes', unit: UnitOfMeasure.KG,
      minStock: 5, wastagePercent: 0,
      stationNames: ['montaje', 'saltado', 'plancha', 'produccion', 'pasteleria'],
    },
    {
      code: 'PRD-006', name: 'Harina sin preparar',
      categoryId: 'cat-abarrotes', unit: UnitOfMeasure.KG,
      minStock: 15, wastagePercent: 0,
      stationNames: ['montaje', 'produccion', 'pasteleria'],
    },
    {
      code: 'PRD-007', name: 'Pan rallado',
      categoryId: 'cat-abarrotes', unit: UnitOfMeasure.KG,
      minStock: 5, wastagePercent: 5,
      stationNames: ['montaje', 'saltado', 'plancha'],
    },
    {
      code: 'PRD-008', name: 'Avena',
      categoryId: 'cat-abarrotes', unit: UnitOfMeasure.KG,
      minStock: 5, wastagePercent: 0,
      stationNames: ['montaje', 'produccion', 'pasteleria'],
    },
    {
      code: 'PRD-009', name: 'Lentejas',
      categoryId: 'cat-abarrotes', unit: UnitOfMeasure.KG,
      minStock: 8, wastagePercent: 0,
      stationNames: ['montaje', 'produccion'],
    },
    {
      code: 'PRD-010', name: 'Quinoa',
      categoryId: 'cat-abarrotes', unit: UnitOfMeasure.KG,
      minStock: 5, wastagePercent: 0,
      stationNames: ['montaje', 'produccion'],
    },

    // ---- Frutas y Verduras (cat-fv) ----------------------------------------
    {
      code: 'PRD-011', name: 'Cebolla',
      categoryId: 'cat-fv', unit: UnitOfMeasure.KG,
      minStock: 15, wastagePercent: 10,
      stationNames: ['montaje', 'frio', 'saltado', 'produccion'],
    },
    {
      code: 'PRD-012', name: 'Tomate',
      categoryId: 'cat-fv', unit: UnitOfMeasure.KG,
      minStock: 10, wastagePercent: 12,
      stationNames: ['montaje', 'frio', 'saltado', 'pizzeria', 'produccion'],
    },
    {
      code: 'PRD-013', name: 'Lechuga',
      categoryId: 'cat-fv', unit: UnitOfMeasure.UN,
      minStock: 10, wastagePercent: 15,
      stationNames: ['montaje', 'frio'],
    },
    {
      code: 'PRD-014', name: 'Zanahoria',
      categoryId: 'cat-fv', unit: UnitOfMeasure.KG,
      minStock: 8, wastagePercent: 10,
      stationNames: ['montaje', 'frio', 'saltado', 'produccion'],
    },
    {
      code: 'PRD-015', name: 'Papa',
      categoryId: 'cat-fv', unit: UnitOfMeasure.KG,
      minStock: 20, wastagePercent: 12,
      stationNames: ['montaje', 'saltado', 'plancha', 'produccion'],
    },
    {
      code: 'PRD-016', name: 'Limon',
      categoryId: 'cat-fv', unit: UnitOfMeasure.KG,
      minStock: 5, wastagePercent: 10,
      stationNames: ['montaje', 'frio', 'saltado', 'plancha'],
    },
    {
      code: 'PRD-017', name: 'Palta',
      categoryId: 'cat-fv', unit: UnitOfMeasure.UN,
      minStock: 10, wastagePercent: 10,
      stationNames: ['montaje', 'frio'],
    },
    {
      code: 'PRD-018', name: 'Pepino',
      categoryId: 'cat-fv', unit: UnitOfMeasure.UN,
      minStock: 10, wastagePercent: 8,
      stationNames: ['montaje', 'frio'],
    },
    {
      code: 'PRD-019', name: 'Ajo',
      categoryId: 'cat-fv', unit: UnitOfMeasure.KG,
      minStock: 3, wastagePercent: 10,
      stationNames: ['montaje', 'saltado', 'plancha', 'pizzeria', 'produccion'],
    },
    {
      code: 'PRD-020', name: 'Pimiento rojo',
      categoryId: 'cat-fv', unit: UnitOfMeasure.KG,
      minStock: 5, wastagePercent: 10,
      stationNames: ['montaje', 'frio', 'saltado', 'pizzeria'],
    },

    // ---- Carnes y Aves (cat-carnes) ----------------------------------------
    {
      code: 'PRD-021', name: 'Pollo entero',
      categoryId: 'cat-carnes', unit: UnitOfMeasure.KG,
      minStock: 15, wastagePercent: 8,
      stationNames: ['montaje', 'saltado', 'plancha', 'produccion'],
    },
    {
      code: 'PRD-022', name: 'Pechuga de pollo',
      categoryId: 'cat-carnes', unit: UnitOfMeasure.KG,
      minStock: 10, wastagePercent: 5,
      stationNames: ['montaje', 'saltado', 'plancha'],
    },
    {
      code: 'PRD-023', name: 'Lomo fino',
      categoryId: 'cat-carnes', unit: UnitOfMeasure.KG,
      minStock: 8, wastagePercent: 5,
      stationNames: ['montaje', 'saltado', 'plancha'],
    },
    {
      code: 'PRD-024', name: 'Carne molida',
      categoryId: 'cat-carnes', unit: UnitOfMeasure.KG,
      minStock: 10, wastagePercent: 5,
      stationNames: ['montaje', 'saltado', 'produccion'],
    },
    {
      code: 'PRD-025', name: 'Costillar cerdo',
      categoryId: 'cat-carnes', unit: UnitOfMeasure.KG,
      minStock: 8, wastagePercent: 8,
      stationNames: ['montaje', 'plancha'],
    },

    // ---- Pescados y Mariscos (cat-pescados) ---------------------------------
    {
      code: 'PRD-026', name: 'Salmon fresco',
      categoryId: 'cat-pescados', unit: UnitOfMeasure.KG,
      minStock: 5, wastagePercent: 10,
      stationNames: ['montaje', 'frio', 'plancha'],
    },
    {
      code: 'PRD-027', name: 'Corvina',
      categoryId: 'cat-pescados', unit: UnitOfMeasure.KG,
      minStock: 5, wastagePercent: 10,
      stationNames: ['montaje', 'frio', 'plancha'],
    },
    {
      code: 'PRD-028', name: 'Camaron',
      categoryId: 'cat-pescados', unit: UnitOfMeasure.KG,
      minStock: 5, wastagePercent: 8,
      stationNames: ['montaje', 'frio', 'saltado', 'plancha'],
    },
    {
      code: 'PRD-029', name: 'Pulpo',
      categoryId: 'cat-pescados', unit: UnitOfMeasure.KG,
      minStock: 3, wastagePercent: 10,
      stationNames: ['montaje', 'frio', 'plancha'],
    },
    {
      code: 'PRD-030', name: 'Mejillones',
      categoryId: 'cat-pescados', unit: UnitOfMeasure.KG,
      minStock: 5, wastagePercent: 12,
      stationNames: ['montaje', 'frio'],
    },

    // ---- Lacteos y Huevos (cat-lacteos) ------------------------------------
    {
      code: 'PRD-031', name: 'Huevos',
      categoryId: 'cat-lacteos', unit: UnitOfMeasure.UN,
      minStock: 60, wastagePercent: 5,
      stationNames: ['montaje', 'frio', 'saltado', 'plancha', 'produccion', 'pasteleria'],
    },
    {
      code: 'PRD-032', name: 'Leche entera',
      categoryId: 'cat-lacteos', unit: UnitOfMeasure.LT,
      minStock: 10, wastagePercent: 5,
      stationNames: ['montaje', 'frio', 'pasteleria'],
    },
    {
      code: 'PRD-033', name: 'Crema',
      categoryId: 'cat-lacteos', unit: UnitOfMeasure.LT,
      minStock: 5, wastagePercent: 8,
      stationNames: ['montaje', 'frio', 'plancha', 'pasteleria'],
    },
    {
      code: 'PRD-034', name: 'Mantequilla',
      categoryId: 'cat-lacteos', unit: UnitOfMeasure.KG,
      minStock: 3, wastagePercent: 5,
      stationNames: ['montaje', 'plancha', 'pasteleria'],
    },
    {
      code: 'PRD-035', name: 'Queso parmesano',
      categoryId: 'cat-lacteos', unit: UnitOfMeasure.KG,
      minStock: 3, wastagePercent: 5,
      stationNames: ['montaje', 'frio', 'pizzeria', 'pasteleria'],
    },

    // ---- Panaderia y Pasteleria (cat-panaderia) ----------------------------
    {
      code: 'PRD-036', name: 'Harina de trigo',
      categoryId: 'cat-panaderia', unit: UnitOfMeasure.KG,
      minStock: 20, wastagePercent: 0,
      stationNames: ['montaje', 'produccion', 'pasteleria'],
    },
    {
      code: 'PRD-037', name: 'Levadura',
      categoryId: 'cat-panaderia', unit: UnitOfMeasure.KG,
      minStock: 2, wastagePercent: 5,
      stationNames: ['montaje', 'pizzeria', 'pasteleria'],
    },
    {
      code: 'PRD-038', name: 'Mozzarella',
      categoryId: 'cat-panaderia', unit: UnitOfMeasure.KG,
      minStock: 8, wastagePercent: 8,
      stationNames: ['montaje', 'frio', 'pizzeria'],
    },
    {
      code: 'PRD-039', name: 'Masa pizza',
      categoryId: 'cat-panaderia', unit: UnitOfMeasure.UN,
      minStock: 20, wastagePercent: 10,
      stationNames: ['montaje', 'pizzeria'],
    },
    {
      code: 'PRD-040', name: 'Chocolate cobertura',
      categoryId: 'cat-panaderia', unit: UnitOfMeasure.KG,
      minStock: 3, wastagePercent: 5,
      stationNames: ['montaje', 'pasteleria'],
    },

    // ---- Bebidas y Licores (cat-bebidas) -----------------------------------
    {
      code: 'PRD-041', name: 'Agua mineral',
      categoryId: 'cat-bebidas', unit: UnitOfMeasure.UN,
      minStock: 24, wastagePercent: 0,
      stationNames: ['montaje'],
    },
    {
      code: 'PRD-042', name: 'Jugo naranja',
      categoryId: 'cat-bebidas', unit: UnitOfMeasure.LT,
      minStock: 5, wastagePercent: 5,
      stationNames: ['montaje', 'frio'],
    },
    {
      code: 'PRD-043', name: 'Vino blanco cocina',
      categoryId: 'cat-bebidas', unit: UnitOfMeasure.LT,
      minStock: 5, wastagePercent: 0,
      stationNames: ['montaje', 'saltado', 'plancha'],
    },
    {
      code: 'PRD-044', name: 'Cerveza',
      categoryId: 'cat-bebidas', unit: UnitOfMeasure.UN,
      minStock: 24, wastagePercent: 0,
      stationNames: ['montaje'],
    },
    {
      code: 'PRD-045', name: 'Pisco',
      categoryId: 'cat-bebidas', unit: UnitOfMeasure.LT,
      minStock: 3, wastagePercent: 0,
      stationNames: ['montaje'],
    },

    // ---- Salsas y Condimentos (cat-salsas) ---------------------------------
    {
      code: 'PRD-046', name: 'Salsa soya',
      categoryId: 'cat-salsas', unit: UnitOfMeasure.LT,
      minStock: 3, wastagePercent: 0,
      stationNames: ['montaje', 'saltado'],
    },
    {
      code: 'PRD-047', name: 'Aceite oliva',
      categoryId: 'cat-salsas', unit: UnitOfMeasure.LT,
      minStock: 3, wastagePercent: 0,
      stationNames: ['montaje', 'saltado', 'plancha', 'pizzeria'],
    },
    {
      code: 'PRD-048', name: 'Vinagre',
      categoryId: 'cat-salsas', unit: UnitOfMeasure.LT,
      minStock: 2, wastagePercent: 0,
      stationNames: ['montaje', 'saltado', 'produccion'],
    },
    {
      code: 'PRD-049', name: 'Oregano',
      categoryId: 'cat-salsas', unit: UnitOfMeasure.KG,
      minStock: 1, wastagePercent: 0,
      stationNames: ['montaje', 'saltado', 'plancha', 'pizzeria'],
    },
    {
      code: 'PRD-050', name: 'Pimienta negra',
      categoryId: 'cat-salsas', unit: UnitOfMeasure.KG,
      minStock: 1, wastagePercent: 0,
      stationNames: ['montaje', 'saltado', 'plancha', 'produccion'],
    },

    // ---- Pre-elaborados (cat-preelaborado) ----------------------------------
    {
      code: 'PRD-051', name: 'Caldo de pollo base',
      categoryId: 'cat-preelaborado', unit: UnitOfMeasure.LT,
      minStock: 10, wastagePercent: 5,
      stationNames: ['montaje', 'saltado', 'produccion'],
    },
    {
      code: 'PRD-052', name: 'Salsa tomate base',
      categoryId: 'cat-preelaborado', unit: UnitOfMeasure.LT,
      minStock: 8, wastagePercent: 5,
      stationNames: ['montaje', 'pizzeria', 'produccion'],
    },
    {
      code: 'PRD-053', name: 'Masa empanada',
      categoryId: 'cat-preelaborado', unit: UnitOfMeasure.UN,
      minStock: 30, wastagePercent: 8,
      stationNames: ['montaje', 'produccion'],
    },
    {
      code: 'PRD-054', name: 'Aliño completo',
      categoryId: 'cat-preelaborado', unit: UnitOfMeasure.KG,
      minStock: 3, wastagePercent: 0,
      stationNames: ['montaje', 'saltado', 'plancha', 'produccion'],
    },
    {
      code: 'PRD-055', name: 'Mise en place verduras',
      categoryId: 'cat-preelaborado', unit: UnitOfMeasure.KG,
      minStock: 5, wastagePercent: 10,
      stationNames: ['montaje', 'frio', 'saltado', 'produccion'],
    },

    // ---- Limpieza y Descartables (cat-limpieza) ----------------------------
    {
      code: 'PRD-056', name: 'Detergente',
      categoryId: 'cat-limpieza', unit: UnitOfMeasure.LT,
      minStock: 5, wastagePercent: 0,
      stationNames: ['montaje'],
    },
    {
      code: 'PRD-057', name: 'Cloro',
      categoryId: 'cat-limpieza', unit: UnitOfMeasure.LT,
      minStock: 5, wastagePercent: 0,
      stationNames: ['montaje'],
    },
    {
      code: 'PRD-058', name: 'Servilletas',
      categoryId: 'cat-limpieza', unit: UnitOfMeasure.PAQUETES,
      minStock: 10, wastagePercent: 0,
      stationNames: ['montaje'],
    },
    {
      code: 'PRD-059', name: 'Guantes latex',
      categoryId: 'cat-limpieza', unit: UnitOfMeasure.CAJAS,
      minStock: 5, wastagePercent: 0,
      stationNames: ['montaje'],
    },
    {
      code: 'PRD-060', name: 'Film plastico',
      categoryId: 'cat-limpieza', unit: UnitOfMeasure.ROLLOS,
      minStock: 3, wastagePercent: 0,
      stationNames: ['montaje'],
    },
  ];

  // Upsert all products
  const products: Record<string, string> = {}; // code -> id

  for (const def of productDefs) {
    const categoryId = categories[def.categoryId]?.id;
    if (!categoryId) {
      throw new Error(`Category not found: ${def.categoryId}`);
    }

    const product = await prisma.product.upsert({
      where: { code: def.code },
      update: {
        name: def.name,
        unitOfMeasure: def.unit,
        unitOfOrder: def.unit,
        minStock: def.minStock,
        wastagePercent: def.wastagePercent,
        categoryId,
      },
      create: {
        code: def.code,
        name: def.name,
        categoryId,
        unitOfMeasure: def.unit,
        unitOfOrder: def.unit,
        minStock: def.minStock,
        wastagePercent: def.wastagePercent,
      },
    });

    products[def.code] = product.id;
  }

  log(`  ${productDefs.length} products upserted.`);

  // -------------------------------------------------------------------------
  // 7. StationProducts
  // -------------------------------------------------------------------------
  log('Assigning products to stations...');

  let stationProductCount = 0;

  for (const def of productDefs) {
    const productId = products[def.code];

    for (let idx = 0; idx < def.stationNames.length; idx++) {
      const stationName = def.stationNames[idx];
      const station = stations[stationName];
      if (!station) continue;

      await prisma.stationProduct.upsert({
        where: {
          stationId_productId: { stationId: station.id, productId },
        },
        update: { sortOrder: idx },
        create: { stationId: station.id, productId, sortOrder: idx },
      });

      stationProductCount++;
    }
  }

  log(`  ${stationProductCount} station-product assignments upserted.`);

  // -------------------------------------------------------------------------
  // Done
  // -------------------------------------------------------------------------
  log('Seed completed successfully.');
  log(`  Organization : 1`);
  log(`  Locations    : 1`);
  log(`  Stations     : ${stationDefs.length}`);
  log(`  Users        : ${userDefs.length}`);
  log(`  Categories   : ${categoryDefs.length}`);
  log(`  Products     : ${productDefs.length}`);
  log(`  SP links     : ${stationProductCount}`);
}

main()
  .catch((error) => {
    console.error('[seed] ERROR:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
