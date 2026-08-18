require('dotenv').config({ path: './backend/.env' });
const prisma = require('../config/prisma');

async function updateStoreSettings() {
  console.log('📞 Updating store contact numbers in PostgreSQL database...');
  try {
    await prisma.storeSetting.upsert({
      where: { key: 'phone_number' },
      update: { value: '+919833607049' },
      create: { key: 'phone_number', value: '+919833607049' }
    });

    await prisma.storeSetting.upsert({
      where: { key: 'secondary_phone_number' },
      update: { value: '+918879279207' },
      create: { key: 'secondary_phone_number', value: '+918879279207' }
    });

    await prisma.storeSetting.upsert({
      where: { key: 'whatsapp_number' },
      update: { value: '+919833607049' },
      create: { key: 'whatsapp_number', value: '+919833607049' }
    });

    console.log('✅ Successfully saved phone numbers (+91 9833607049 & +91 8879279207) into database store_settings table!');
  } catch (err) {
    console.error('❌ Error updating store settings in database:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateStoreSettings();
