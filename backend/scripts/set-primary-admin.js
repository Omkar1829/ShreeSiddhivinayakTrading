const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const phoneInput = args[0];

if (!phoneInput) {
  console.error('\x1b[31mError: Please provide a phone number.\x1b[0m');
  console.log('Usage: node scripts/set-primary-admin.js <phone_number>');
  console.log('Example: node scripts/set-primary-admin.js 8452921123');
  process.exit(1);
}

// Clean and format phone number (prefix with +91 if 10 digits)
let formattedPhone = phoneInput.trim().replace(/\s+/g, '');
if (/^\d{10}$/.test(formattedPhone)) {
  formattedPhone = `+91${formattedPhone}`;
} else if (!formattedPhone.startsWith('+')) {
  console.error('\x1b[31mError: Phone number must start with + (e.g., +918452921123) or be exactly 10 digits.\x1b[0m');
  process.exit(1);
}

async function main() {
  console.log(`Searching for admin with phone: ${formattedPhone}...`);

  // 1. Find user
  const user = await prisma.user.findUnique({
    where: { phone: formattedPhone }
  });

  if (!user) {
    console.error(`\x1b[31mError: User with phone number ${formattedPhone} not found in database.\x1b[0m`);
    process.exit(1);
  }

  // 2. Verify admin status
  if (!user.isAdmin && user.role !== 'ADMIN') {
    console.error(`\x1b[31mError: User ${user.name || 'Unknown'} is not an administrator. Set their role to ADMIN first.\x1b[0m`);
    process.exit(1);
  }

  console.log(`Setting user "${user.name || 'Admin'}" (ID: ${user.id}) as the Primary Admin...`);

  // 3. Update primary admin flag within an atomic transaction
  await prisma.$transaction([
    // Reset all admins
    prisma.user.updateMany({
      where: { isPrimaryAdmin: true },
      data: { isPrimaryAdmin: false }
    }),
    // Set target admin
    prisma.user.update({
      where: { id: user.id },
      data: { isPrimaryAdmin: true }
    })
  ]);

  console.log(`\x1b[32mSuccess: User "${user.name || 'Admin'}" is now configured as the single Primary Admin!\x1b[0m`);
}

main()
  .catch((err) => {
    console.error('An unexpected error occurred:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
