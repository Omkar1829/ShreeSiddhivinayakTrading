require('dotenv').config({ path: './backend/.env' });
const prisma = require('../config/prisma');

async function cleanDatabaseAndSetAdmins() {
  console.log('🧹 Starting database cleanup (truncating catalog, orders, transactions, notifications, logs)...');

  try {
    // 1. Truncate dependent transactional tables
    console.log('--> Clearing Audit Logs...');
    await prisma.auditLog.deleteMany({});

    console.log('--> Clearing Notifications...');
    await prisma.notification.deleteMany({});

    console.log('--> Clearing Inventory Transactions...');
    await prisma.inventoryTransaction.deleteMany({});

    console.log('--> Clearing Order Items...');
    await prisma.orderItem.deleteMany({});

    console.log('--> Clearing Orders...');
    await prisma.order.deleteMany({});

    console.log('--> Clearing Variants...');
    await prisma.variant.deleteMany({});

    console.log('--> Clearing Products...');
    await prisma.product.deleteMany({});

    console.log('--> Clearing Subcategories...');
    await prisma.subcategory.deleteMany({});

    console.log('--> Clearing Categories...');
    await prisma.category.deleteMany({});

    console.log('--> Clearing Brands...');
    await prisma.brand.deleteMany({});

    console.log('--> Clearing Addresses...');
    await prisma.address.deleteMany({});

    console.log('✅ All catalog, order, and transactional tables cleared successfully!');

    // 2. Configure requested Admin Users
    console.log('\n👑 Setting up 4 Admin users in PostgreSQL User table...');

    const adminPhones = [
      { rawPhone: '9833607049', name: 'Admin Yatish', isPrimary: true },
      { rawPhone: '8879279207', name: 'Admin Manas', isPrimary: false },
      { rawPhone: '8452921123', name: 'Store Admin', isPrimary: false },
      { rawPhone: '7666726348', name: 'Store Admin', isPrimary: false }
    ];

    for (const admin of adminPhones) {
      const formattedPhone = admin.rawPhone.startsWith('+91') ? admin.rawPhone : `+91${admin.rawPhone}`;

      // Check if user exists by raw or +91 formatted phone
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: admin.rawPhone },
            { phone: formattedPhone }
          ]
        }
      });

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            isAdmin: true,
            role: 'ADMIN',
            isPrimaryAdmin: admin.isPrimary,
            name: existingUser.name || admin.name
          }
        });
        console.log(`  ✓ Updated existing user ${existingUser.phone} (${existingUser.name || admin.name}) to ADMIN`);
      } else {
        const newUser = await prisma.user.create({
          data: {
            phone: formattedPhone,
            name: admin.name,
            isAdmin: true,
            role: 'ADMIN',
            isPrimaryAdmin: admin.isPrimary
          }
        });
        console.log(`  + Created new ADMIN user: ${newUser.phone} (${newUser.name})`);
      }
    }

    // 3. Print all current users in database for confirmation
    const allUsers = await prisma.user.findMany({
      select: { id: true, phone: true, name: true, role: true, isAdmin: true, isPrimaryAdmin: true }
    });

    console.log('\n👥 Current Active Users in Database:');
    console.table(allUsers);

  } catch (err) {
    console.error('❌ Error during database cleanup:', err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabaseAndSetAdmins();
