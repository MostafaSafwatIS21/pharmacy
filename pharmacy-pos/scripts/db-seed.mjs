import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.invoice.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();

  await prisma.product.createMany({
    data: [
      { name: "Paracetamol 500mg", price: 25 },
      { name: "Amoxicillin 500mg", price: 68 },
      { name: "Vitamin C 1000mg", price: 39 },
    ],
  });

  await prisma.customer.createMany({
    data: [
      {
        name: "Ahmed Hassan",
        location: "Nasr City, Cairo",
        phoneNumber: "01000000001",
      },
      {
        name: "Mona Samir",
        location: "Alexandria",
        phoneNumber: "01000000002",
      },
    ],
  });

  await prisma.invoice.createMany({
    data: [
      {
        productName: "Paracetamol 500mg",
        price: 25,
        qty: 2,
        customerName: "Ahmed Hassan",
      },
      {
        productName: "Vitamin C 1000mg",
        price: 39,
        qty: 1,
        customerName: "Mona Samir",
      },
    ],
  });

  const productCount = await prisma.product.count();
  const customerCount = await prisma.customer.count();
  const invoiceCount = await prisma.invoice.count();

  console.log("Seed completed");
  console.log(`Products: ${productCount}`);
  console.log(`Customers: ${customerCount}`);
  console.log(`Invoices: ${invoiceCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
