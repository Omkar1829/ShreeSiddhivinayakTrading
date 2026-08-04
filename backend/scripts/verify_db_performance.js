require('dotenv').config({ path: './backend/.env' });
const prisma = require('../config/prisma');

console.log('--- Starting Priority 3: Database Performance & Index Verification ---');

async function runPerformanceVerification() {
  const startTime = Date.now();

  try {
    console.log('1. Querying PostgreSQL system catalog for created indexes...');
    
    const indexes = await prisma.$queryRaw`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;

    console.log(`✅ Total active indexes found in PostgreSQL database: ${indexes.length}`);
    
    // Group indexes by table name
    const indexesByTable = {};
    indexes.forEach(idx => {
      if (!indexesByTable[idx.tablename]) {
        indexesByTable[idx.tablename] = [];
      }
      indexesByTable[idx.tablename].push(idx.indexname);
    });

    const expectedTables = [
      'users', 'addresses', 'categories', 'subcategories', 'brands',
      'products', 'variants', 'inventory_transactions', 'orders',
      'order_items', 'notifications', 'audit_logs', 'admin_devices'
    ];

    expectedTables.forEach(tableName => {
      const tableIndexes = indexesByTable[tableName] || [];
      console.log(` - Table '${tableName}': ${tableIndexes.length} index(es) -> [${tableIndexes.join(', ')}]`);
    });

    console.log('\n2. Benchmarking High-Frequency Query Operations:');

    // Test Query 1: Active Product Catalog Filter Query
    const pStart = performance.now();
    const activeProducts = await prisma.product.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      take: 10,
      include: { variants: true }
    });
    const pDuration = (performance.now() - pStart).toFixed(2);
    console.log(`✅ Product Catalog Query: Fetched ${activeProducts.length} items in ${pDuration} ms`);

    // Test Query 2: Customer Orders Query
    const oStart = performance.now();
    const orders = await prisma.order.findMany({
      where: { status: 'PENDING', deletedAt: null },
      take: 10,
      include: { items: true }
    });
    const oDuration = (performance.now() - oStart).toFixed(2);
    console.log(`✅ Customer Orders Query: Fetched ${orders.length} orders in ${oDuration} ms`);

    // Test Query 3: Notifications Query
    const nStart = performance.now();
    const notifications = await prisma.notification.findMany({
      where: { isRead: false },
      take: 10
    });
    const nDuration = (performance.now() - nStart).toFixed(2);
    console.log(`✅ Notifications Query: Fetched ${notifications.length} notifications in ${nDuration} ms`);

    console.log(`\n--- Database Performance Verification Completed Successfully in ${Date.now() - startTime} ms ---`);
  } catch (error) {
    console.error('❌ Database Performance Verification Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPerformanceVerification();
