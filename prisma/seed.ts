import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Categories
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Gadgets and devices',
    },
  });

  const clothing = await prisma.category.upsert({
    where: { slug: 'clothing' },
    update: {},
    create: {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Apparel and accessories',
    },
  });

  // Products
  const products = [
    {
      name: 'Wireless Headphones',
      slug: 'wireless-headphones',
      description: 'Noise-cancelling over-ear headphones',
      price: 149.99,
      stock: 50,
      categoryId: electronics.id,
    },
    {
      name: 'USB-C Hub',
      slug: 'usb-c-hub',
      description: '7-in-1 multiport adapter',
      price: 39.99,
      stock: 120,
      categoryId: electronics.id,
    },
    {
      name: 'Classic T-Shirt',
      slug: 'classic-tshirt',
      description: '100% organic cotton tee',
      price: 24.99,
      stock: 200,
      categoryId: clothing.id,
    },
    {
      name: 'Running Shoes',
      slug: 'running-shoes',
      description: 'Lightweight performance sneakers',
      price: 89.99,
      stock: 75,
      categoryId: clothing.id,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }

  // Admin user (password: AdminAdmin123!)
  const adminHash = await argon2.hash('Admin123!', { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { email: 'admin@ecommerce.local' },
    update: {},
    create: {
      email: 'admin@ecommerce.local',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
  });

  // Demo customer (password: Customer123!)
  const customerHash = await argon2.hash('Customer123!', { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { email: 'customer@ecommerce.local' },
    update: {},
    create: {
      email: 'customer@ecommerce.local',
      passwordHash: customerHash,
      firstName: 'Demo',
      lastName: 'Customer',
      role: 'CUSTOMER',
      emailVerifiedAt: new Date(),
    },
  });

  console.log('✅ Seed completed');
  console.log('   Admin:    admin@ecommerce.local / Admin123!');
  console.log('   Customer: customer@ecommerce.local / Customer123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });