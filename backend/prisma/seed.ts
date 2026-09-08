import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("Seeding database (data mengikuti frontend/src/mock/data.ts)...");
  // Bersihkan data lama agar seed idempoten (urutan FK-aware)
  await prisma.orderStatusLog.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productOption.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.cafeTable.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();

  // ---- Business ----
  const business = await prisma.business.create({
    data: {
      name: "Bean & Brew",
      tagline: "Eksplorasi Rasa dalam Setiap Cangkir",
      address: "Jl. Senopati No. 12, Jakarta Selatan",
      phone: "021-555-0192",
      email: "hello@beanbrew.id",
      taxEnabled: true,
      taxLabel: "PB1",
      taxRate: 10, // persen
      taxBearer: "customer",
      serviceChargeEnabled: true,
      serviceChargeRate: 5, // persen
      soundEnabled: true,
      openingCash: 0,
      enabledPaymentMethods: ["cash", "qris", "ewallet", "bank_transfer"],
      paymentSettings: {
        cash: { instruction: "Bayar tunai di kasir", gateway: "manual" },
        qris: { instruction: "QRIS dinamis Midtrans", gateway: "midtrans" },
        ewallet: { instruction: "GoPay/ShopeePay Midtrans", gateway: "midtrans", channel: "gopay" },
        bank_transfer: { instruction: "VA Midtrans", gateway: "midtrans", bank: "bca" },
      },
      midtransMode: "global",
      midtransQrisAcquirer: null,
    },
  });

  // ---- Staff ----
  const [owner, kasir, barista] = await Promise.all([
    prisma.user.create({
      data: {
        businessId: business.id,
        name: "Amira Owner",
        email: "owner@beanbrew.id",
        role: "owner",
        passwordHash: await hash("Owner123!"),
      },
    }),
    prisma.user.create({
      data: {
        businessId: business.id,
        name: "Raka Kasir",
        email: "kasir@beanbrew.id",
        role: "kasir",
        passwordHash: await hash("Kasir123!"),
      },
    }),
    prisma.user.create({
      data: {
        businessId: business.id,
        name: "Sinta Barista",
        email: "barista@beanbrew.id",
        role: "barista",
        passwordHash: await hash("Barista123!"),
      },
    }),
  ]);

  // ---- Categories ----
  const [catSignature, catEspresso, catNonCoffee, catPastry] = await Promise.all([
    prisma.category.create({ data: { businessId: business.id, name: "Signature", sortOrder: 1 } }),
    prisma.category.create({ data: { businessId: business.id, name: "Espresso", sortOrder: 2 } }),
    prisma.category.create({ data: { businessId: business.id, name: "Non-Coffee", sortOrder: 3 } }),
    prisma.category.create({ data: { businessId: business.id, name: "Pastry", sortOrder: 4 } }),
  ]);

  // ---- Product options template (varian minuman) ----
  const drinkOptionDefs = [
    { name: "Hot", type: "temperature", price: 0, isRequired: true },
    { name: "Iced", type: "temperature", price: 0, isRequired: true },
    { name: "Normal", type: "sugar", price: 0, isRequired: true },
    { name: "Less Sugar", type: "sugar", price: 0, isRequired: true },
    { name: "No Sugar", type: "sugar", price: 0, isRequired: true },
    { name: "Normal", type: "ice", price: 0, isRequired: true },
    { name: "Less Ice", type: "ice", price: 0, isRequired: true },
    { name: "No Ice", type: "ice", price: 0, isRequired: true },
    { name: "Regular", type: "milk", price: 0, isRequired: false },
    { name: "Oat", type: "milk", price: 5000, isRequired: false },
    { name: "Soy", type: "milk", price: 3000, isRequired: false },
    { name: "Extra Espresso", type: "addon", price: 5000, isRequired: false },
    { name: "Vanilla Syrup", type: "addon", price: 5000, isRequired: false },
  ];

  async function createProductWithOptions(
    args: {
      categoryId: number;
      name: string;
      description: string;
      price: number;
      isAvailable: boolean;
      badge?: string;
    },
    optionFilter?: (o: (typeof drinkOptionDefs)[number]) => boolean
  ) {
    const product = await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId: args.categoryId,
        name: args.name,
        description: args.description,
        price: args.price,
        isAvailable: args.isAvailable,
        badge: args.badge,
      },
    });

    const options = optionFilter ? drinkOptionDefs.filter(optionFilter) : drinkOptionDefs;
    if (options.length) {
      await prisma.productOption.createMany({
        data: options.map((o) => ({ productId: product.id, ...o })),
      });
    }
    return product;
  }

  const caramelMacchiato = await createProductWithOptions({
    categoryId: catSignature.id,
    name: "Caramel Macchiato",
    description: "Espresso dengan sirup vanilla, susu segar, dan karamel.",
    price: 45000,
    isAvailable: true,
    badge: "SIGNATURE",
  });

  const doubleEspresso = await createProductWithOptions(
    {
      categoryId: catEspresso.id,
      name: "Double Espresso",
      description: "Dua shot espresso murni dari biji kopi house blend.",
      price: 30000,
      isAvailable: true,
    },
    (o) => o.type === "temperature" || o.type === "addon"
  );

  await createProductWithOptions({
    categoryId: catPastry.id,
    name: "Butter Croissant",
    description: "Croissant klasik ala Perancis yang renyah di luar.",
    price: 25000,
    isAvailable: false,
  }, () => false);

  const matchaLatte = await createProductWithOptions({
    categoryId: catNonCoffee.id,
    name: "Matcha Latte",
    description: "Bubuk matcha premium Jepang yang diseduh dengan sempurna.",
    price: 40000,
    isAvailable: true,
  });

  await createProductWithOptions({
    categoryId: catSignature.id,
    name: "Iced Caramel Latte",
    description: "Espresso dengan sirup karamel dan susu oat segar.",
    price: 45000,
    isAvailable: true,
    badge: "SIGNATURE",
  });

  await createProductWithOptions({
    categoryId: catEspresso.id,
    name: "Flat White",
    description: "Double ristretto dengan microfoam susu yang lembut.",
    price: 38000,
    isAvailable: true,
  });

  await createProductWithOptions({
    categoryId: catPastry.id,
    name: "Almond Croissant",
    description: "Croissant isi krim almond dengan taburan kacang.",
    price: 32000,
    isAvailable: true,
  }, () => false);

  // ---- Tables ----
  const tableDefs = [
    { tableNumber: "01", qrToken: "table-01", isActive: true },
    { tableNumber: "02", qrToken: "table-02", isActive: true },
    { tableNumber: "03", qrToken: "table-03", isActive: true },
    { tableNumber: "04", qrToken: "table-04", isActive: true },
    { tableNumber: "05", qrToken: "table-05", isActive: true },
    { tableNumber: "06", qrToken: "table-06", isActive: false },
  ];
  const tables = await Promise.all(
    tableDefs.map((t) => prisma.cafeTable.create({ data: { businessId: business.id, ...t } }))
  );

  // ---- Ingredients + 1 contoh stock movement ----
  const espressoBeans = await prisma.ingredient.create({
    data: {
      businessId: business.id,
      name: "Espresso Beans (House)",
      unit: "kg",
      currentStock: 12.4,
      minimumStock: 4,
      isAvailable: true,
    },
  });
  await prisma.stockMovement.create({
    data: {
      businessId: business.id,
      ingredientId: espressoBeans.id,
      type: "in",
      quantity: 5,
      stockBefore: 7.4,
      stockAfter: 12.4,
      notes: "Restock mingguan",
      userId: barista.id,
    },
  });

  await prisma.ingredient.create({
    data: { businessId: business.id, name: "Oat Milk", unit: "L", currentStock: 3.2, minimumStock: 5, isAvailable: true },
  });
  await prisma.ingredient.create({
    data: { businessId: business.id, name: "Vanilla Syrup", unit: "botol", currentStock: 6, minimumStock: 2, isAvailable: true },
  });
  await prisma.ingredient.create({
    data: { businessId: business.id, name: "Croissants", unit: "pcs", currentStock: 0, minimumStock: 8, isAvailable: false },
  });
  await prisma.ingredient.create({
    data: { businessId: business.id, name: "Susu Fresh", unit: "L", currentStock: 18, minimumStock: 8, isAvailable: true },
  });

  // ---- 2 contoh order (biar endpoint /orders & /analytics langsung ada datanya) ----
  const order1 = await prisma.order.create({
    data: {
      businessId: business.id,
      orderNumber: "BB-9021",
      clientOrderId: "seed-cli-o-1",
      tableId: tables[3].id, // meja 04
      customerName: "Dina",
      source: "self_order",
      status: "diproses",
      paymentMethod: "qris",
      paymentStatus: "paid",
      subtotal: 90000,
      serviceCharge: 4500,
      tax: 9450,
      taxLabel: "PB1",
      taxBearer: "customer",
      total: 103950,
      items: {
        createMany: {
          data: [
            {
              productId: caramelMacchiato.id,
              productName: "Caramel Macchiato",
              price: 45000,
              quantity: 1,
              options: { temperature: "Iced", sugar: "Less Sugar" },
              optionsLabel: "Iced, Less Sugar",
              subtotal: 45000,
            },
            {
              productId: matchaLatte.id,
              productName: "Matcha Latte",
              price: 45000,
              quantity: 1,
              options: { milk: "Oat" },
              optionsLabel: "Oat Milk",
              subtotal: 45000,
            },
          ],
        },
      },
      statusLogs: { createMany: { data: [{ status: "diterima" }, { status: "diproses" }] } },
      payments: {
        create: { businessId: business.id, method: "qris", status: "paid", amount: 103950, paidAt: new Date() },
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      businessId: business.id,
      orderNumber: "BB-9022",
      clientOrderId: "seed-cli-o-2",
      tableId: tables[1].id, // meja 02
      customerName: "Andi",
      source: "self_order",
      status: "diterima",
      paymentMethod: "cash",
      paymentStatus: "pending",
      subtotal: 30000,
      serviceCharge: 1500,
      tax: 3150,
      taxLabel: "PB1",
      taxBearer: "customer",
      total: 34650,
      items: {
        create: {
          productId: doubleEspresso.id,
          productName: "Double Espresso",
          price: 30000,
          quantity: 1,
          options: { temperature: "Hot" },
          optionsLabel: "Hot",
          subtotal: 30000,
        },
      },
      statusLogs: { create: { status: "diterima" } },
      payments: { create: { businessId: business.id, method: "cash", status: "pending", amount: 34650 } },
    },
  });

  console.log("Seed selesai ✅");
  console.log("----------------------------------------------------");
  console.log("Login staff (POST /api/auth/login):");
  console.log(`  Owner    -> ${owner.email} / Owner123!`);
  console.log(`  Kasir    -> ${kasir.email} / Kasir123!`);
  console.log(`  Barista  -> ${barista.email} / Barista123!`);
  console.log("----------------------------------------------------");
  console.log(`Business ID   : ${business.id}`);
  console.log(`QR token meja : ${tableDefs.map((t) => t.qrToken).join(", ")}`);
  console.log(`Contoh order  : ${order1.orderNumber}, ${order2.orderNumber}`);
  console.log("----------------------------------------------------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
