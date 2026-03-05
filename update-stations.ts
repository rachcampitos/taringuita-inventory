import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Explicit mappings: Raymundo's name -> product code in DB
// null = product needs to be created
type ProductMapping = {
  label: string;
  code: string | null;
  // For creating new products:
  createName?: string;
  createCategory?: string; // category ID
  createUnit?: string;
};

// Category IDs from DB
const CAT = {
  SALSAS: 'cmmc824rp0010jb82yxkrwheo',
  PRE_ELABORADOS: 'cmmc824it000yjb82st5lyxoy',
  PAN: 'cmmc823iq000qjb82at1mljz3',
  FRUTAS_VERDURAS: 'cmmc8229q000gjb82mlwunfxj',
  LACTEOS: 'cmmc822n3000jjb82izczwm8m',
  POSTRES: 'cmmc824eb000xjb82f8jlg7wb',
  CONGELADOS: 'cmmc82355000njb821s9ilqpa',
};

const stationMappings: Record<string, ProductMapping[]> = {
  'frio': [
    { label: 'pulpo', code: '104320' },
    { label: 'locos', code: '104230' },
    { label: 'reineta', code: '104331' },
    { label: 'atun', code: '104130' },
    { label: 'pulpo tarta', code: 'PE016' }, // PE_TARTARO DE PULPO
    { label: 'tartaro de res', code: '103570' }, // CARNE MOLIDA POSTA (TARTARO)
    { label: 'camaron', code: '104150' },
    { label: 'ostiones a la parmesana', code: '104290' }, // OSTION CON MEDIA CONCHA
    { label: 'machas a la parmesana', code: '104250' }, // MACHA MEDIA CONCHA
  ],
  'plancha': [
    { label: 'pulpo parrilla', code: '104320' }, // same PULPO
    { label: 'mediterraneo', code: 'NV0029_3' }, // CAMARON MEDITERRANEO
    { label: 'plateada', code: '103780' },
    { label: 'pastelera', code: '103120-1' },
    { label: 'mechada', code: 'PE059' },
    { label: 'merluza plancha', code: '104270' }, // MERLUZA AUSTRAL
    { label: 'mixtura', code: 'NC-0005' },
    { label: 'pan frica', code: '104389' },
    { label: 'pan brioche', code: '104401' },
    { label: 'churrasco', code: '103587' },
    { label: 'hamburguesa', code: '103670' },
    { label: 'filete', code: '103653' },
    { label: 'fish', code: 'PE091' },
    { label: 'falafel', code: 'PE053' },
    { label: 'croquetas de jamon', code: 'PC304724' }, // CROQUETA DE JAMON SERRANO
    { label: 'croquetas de pulpo', code: null, createName: 'CROQUETAS DE PULPO', createCategory: CAT.PRE_ELABORADOS, createUnit: 'UN' },
    { label: 'pechuga de pollo', code: '103760' }, // PECHUGA POLLO S/H NACIONAL
    { label: 'tocino', code: '103941' },
    { label: 'noquis', code: null, createName: 'NOQUIS', createCategory: CAT.PRE_ELABORADOS, createUnit: 'KG' },
    { label: 'salsa pomodoro', code: null, createName: 'SALSA POMODORO', createCategory: CAT.SALSAS, createUnit: 'LT' },
    { label: 'salsa champinones', code: null, createName: 'SALSA CHAMPINONES', createCategory: CAT.SALSAS, createUnit: 'LT' },
    { label: 'salsa marisco', code: 'S039' },
    { label: 'salsa huancaina', code: null, createName: 'SALSA HUANCAINA', createCategory: CAT.SALSAS, createUnit: 'LT' },
  ],
  'pizzeria': [
    { label: 'jamon serrano', code: '103920' },
    { label: 'mozarella', code: '104070' }, // QUESO MOZZARELLA
    { label: 'parmesano', code: '104100' },
    { label: 'queso boconccini', code: '104043' }, // QUESO BOCCONCINI
    { label: 'bollos', code: null, createName: 'BOLLOS', createCategory: CAT.PAN, createUnit: 'UN' },
    { label: 'mortadela pistacho', code: '103923' }, // MORTADELA ITALIANA
    { label: 'mechada', code: 'PE059' },
    { label: 'harina', code: '102816' },
    { label: 'salsa pizzera', code: null, createName: 'SALSA PIZZERA', createCategory: CAT.SALSAS, createUnit: 'LT' },
    { label: 'longaniza', code: '700200' },
    { label: 'pate de hongos', code: 'PE147' },
    { label: 'peperoni', code: '103940' }, // PEPPERONI ULTRADELGADO
  ],
  'pasteleria': [
    { label: 'brownie', code: '104420' },
    { label: '3 leches', code: 'PE048' }, // PE_TORTA 3 LECHES KILO
    { label: 'tres leches', code: '104560' },
    { label: 'cheesecake frambuesa', code: '104425' }, // CHEESECAKE DE FRAMBUESA
    { label: 'crumble manzana', code: '104465' }, // CRUMBLE DE MANZANA
    { label: 'manzana cocida', code: null, createName: 'MANZANA COCIDA', createCategory: CAT.FRUTAS_VERDURAS, createUnit: 'KG' },
    { label: 'harina almendra', code: '102789' }, // HARINA DE ALMENDRA REFINADA
    { label: 'almendra laminada', code: '202475' }, // ALMENDRA LAMINADAS
    { label: 'azucar flor', code: '102573' },
    { label: 'azucar economica', code: '102570' },
    { label: 'salsa chocolate', code: '103290' }, // SALSA DE CHOCOLATE 1LT
    { label: 'manjar', code: '102914' },
    { label: 'mantequilla sin sal', code: '103991' }, // MANTEQUILLA SIN SAL ANCHOR
    { label: 'cacao en polvo', code: '102582' },
    { label: 'chocolate bitter', code: '102681' }, // COBERTURA DE CHOCOLATE 72% CACAO
    { label: 'chocolate blanca', code: '102682' }, // COBERTURA DE CHOCOLATE BLANCO
    { label: 'queso crema', code: '104040' },
    { label: 'frambuesa congelada', code: '105350' }, // FRAMBUESA (FRUTA CONGELADA)
    { label: 'leche evaporada', code: null, createName: 'LECHE EVAPORADA', createCategory: CAT.LACTEOS, createUnit: 'UN' },
    { label: 'leche condensada', code: '102863' }, // LECHE CONDESADA
    { label: 'helado vainilla', code: '104460' },
    { label: 'helado frambuesa', code: '104450' }, // HELADO FRAMBUEZA 5LTS
    { label: 'helado dulce de leche', code: null, createName: 'HELADO DULCE DE LECHE 5LTS', createCategory: CAT.CONGELADOS, createUnit: 'UN' },
  ],
};

async function main() {
  console.log('Connecting to database...');

  // Get all products indexed by code
  const allProducts = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
  });
  const productByCode = new Map(allProducts.map(p => [p.code, p]));
  console.log(`Found ${allProducts.length} active products`);

  // Get all stations
  const allStations = await prisma.station.findMany({
    select: { id: true, name: true, locationId: true },
  });
  console.log(`Found ${allStations.length} stations`);
  console.log('Stations:', allStations.map(s => s.name).join(', '));

  // Clear ALL existing station-product assignments
  const deleted = await prisma.stationProduct.deleteMany({});
  console.log(`\nCleared ${deleted.count} existing station-product assignments`);

  // Get location for creating new products
  const location = allStations[0]?.locationId;

  // Process each station
  let totalCreated = 0;

  for (const [stationName, mappings] of Object.entries(stationMappings)) {
    const station = allStations.find(s => s.name.toLowerCase() === stationName.toLowerCase());
    if (!station) {
      console.log(`\nWARNING: Station "${stationName}" not found!`);
      continue;
    }

    console.log(`\n=== ${station.name.toUpperCase()} (${station.id}) ===`);

    const assignments: { stationId: string; productId: string; sortOrder: number }[] = [];

    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];

      let productId: string;

      if (mapping.code) {
        // Find by code
        const product = productByCode.get(mapping.code);
        if (!product) {
          console.log(`  [ERROR] Code "${mapping.code}" not found for "${mapping.label}"`);
          continue;
        }
        console.log(`  [OK] "${mapping.label}" -> ${product.name} (${product.code})`);
        productId = product.id;
      } else {
        // Create new product
        const newCode = `NEW-${mapping.createName!.replace(/\s+/g, '-').substring(0, 20)}`;
        const newProduct = await prisma.product.create({
          data: {
            name: mapping.createName!,
            code: newCode,
            unitOfMeasure: (mapping.createUnit || 'UN') as any,
            categoryId: mapping.createCategory!,
          },
        });
        console.log(`  [CREATED] "${mapping.label}" -> ${newProduct.name} (${newProduct.code}) [${newProduct.id}]`);
        productId = newProduct.id;
        totalCreated++;
      }

      assignments.push({
        stationId: station.id,
        productId,
        sortOrder: i,
      });
    }

    if (assignments.length > 0) {
      // Filter duplicates (same product assigned twice to same station)
      const unique = assignments.filter((a, idx) =>
        assignments.findIndex(b => b.productId === a.productId) === idx
      );
      await prisma.stationProduct.createMany({ data: unique });
      console.log(`  -> Assigned ${unique.length} products to ${station.name}`);
    }
  }

  // Create "almacenamiento" station if it doesn't exist
  let almStation = allStations.find(s => s.name.toLowerCase() === 'almacenamiento');
  if (!almStation) {
    const vitacura = await prisma.location.findFirst({ where: { name: { contains: 'Vitacura' } } });
    if (vitacura) {
      almStation = await prisma.station.create({
        data: { name: 'almacenamiento', locationId: vitacura.id },
      });
      console.log(`\nCreated new station: almacenamiento (${almStation.id})`);
    }
  }

  // Assign ALL products from frio, plancha, pizzeria to almacenamiento
  if (almStation) {
    console.log(`\n=== ALMACENAMIENTO (${almStation.id}) ===`);
    const otherStationProducts = await prisma.stationProduct.findMany({
      where: {
        station: { name: { in: ['frio', 'plancha', 'pizzeria'] } },
      },
      select: { productId: true },
    });

    const uniqueProductIds = [...new Set(otherStationProducts.map(sp => sp.productId))];
    const almAssignments = uniqueProductIds.map((productId, i) => ({
      stationId: almStation!.id,
      productId,
      sortOrder: i,
    }));

    if (almAssignments.length > 0) {
      await prisma.stationProduct.createMany({ data: almAssignments });
      console.log(`  -> Assigned ${almAssignments.length} products to almacenamiento`);
    }
  }

  // Summary
  console.log('\n========== SUMMARY ==========');
  const finalCounts = await prisma.stationProduct.groupBy({
    by: ['stationId'],
    _count: { productId: true },
  });

  for (const count of finalCounts) {
    const station = allStations.find(s => s.id === count.stationId) ||
      (almStation && almStation.id === count.stationId ? almStation : null);
    console.log(`  ${station?.name || count.stationId}: ${count._count.productId} products`);
  }

  console.log(`\nNew products created: ${totalCreated}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
