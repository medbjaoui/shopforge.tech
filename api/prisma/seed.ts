import { PrismaClient, Product, Customer, Order } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Nettoyage de la base (garde super_admins, carriers, platform_configs)...');

  // Supprimer dans l'ordre des dépendances
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customerTagLink.deleteMany();
  await prisma.customerAddress.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.customerTag.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tenantCarrier.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
  console.log('✅ Base nettoyée');

  // ─── Super Admin ──────────────────────────────────────────────────────────────
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@shopforge.tech';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!';

  const existingSuperAdmin = await prisma.superAdmin.findUnique({
    where: { email: superAdminEmail },
  });
  if (!existingSuperAdmin) {
    await prisma.superAdmin.create({
      data: {
        email: superAdminEmail,
        passwordHash: await bcrypt.hash(superAdminPassword, 12),
      },
    });
    console.log(`✅ Super admin créé : ${superAdminEmail}`);
  } else {
    console.log(`⏭️  Super admin existe déjà`);
  }

  // ─── Transporteurs ────────────────────────────────────────────────────────────
  const defaultCarriers = [
    { name: 'ABM Delivery', slug: 'abm-delivery', apiBaseUrl: 'http://app.abm-delivery.com/WebServiceExterne', apiType: 'abm-delivery', description: 'Transporteur tunisien — Livraison nationale.', isActive: true },
    { name: 'First Delivery Group', slug: 'first-delivery', apiBaseUrl: 'https://www.firstdeliverygroup.com/api/v2', apiType: 'first-delivery', description: 'Transporteur tunisien — Livraison express nationale.', isActive: true },
    { name: 'La Poste Tunisienne', slug: 'laposte-tn', apiBaseUrl: 'https://track.poste.tn/api', apiType: 'laposte-tn', description: 'Rapid Post / EMS — La Poste Tunisienne', isActive: true },
    { name: 'Aramex', slug: 'aramex', apiBaseUrl: 'https://ws.aramex.net/ShippingAPI.V2/Tracking/Service_1_0.svc/json', apiType: 'aramex', description: 'Aramex — Livraison internationale.', isActive: true },
    { name: 'DHL', slug: 'dhl', apiBaseUrl: 'https://api-eu.dhl.com/track/shipments', apiType: 'dhl', description: 'DHL Express — Livraison internationale.', isActive: true },
  ];
  for (const carrier of defaultCarriers) {
    await prisma.carrier.upsert({
      where: { slug: carrier.slug },
      update: {},
      create: carrier,
    });
  }
  console.log('✅ Transporteurs OK');

  // ─── Tenant démo : JoFood ─────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Demo1234!', 12);

  const tenant = await prisma.tenant.create({
    data: {
      name: 'JoFood',
      slug: 'jofood',
      plan: 'PRO',
      onboardingCompleted: true,
      isPublished: true,
      theme: 'emerald',
      description: 'Épicerie fine tunisienne — Produits du terroir, huiles d\'olive, épices et douceurs artisanales.',
      phone: '+216 71 234 567',
      whatsapp: '+21698765432',
      address: 'Rue de la Liberté, Tunis 1000',
      contactEmail: 'contact@jofood.tn',
      shippingFee: 7,
      freeShippingThreshold: 100,
      codEnabled: true,
      matriculeFiscal: '1234567/A/M/C/000',
      rne: 'B1234567890',
      instagram: '@jofood.tn',
      facebook: 'jofood.tn',
      tiktok: '@jofood.tn',
      announcementText: 'Livraison gratuite dès 100 TND !',
      announcementEnabled: true,
      announcementBgColor: '#065F46',
      announcementTextColor: '#ffffff',
      heroTitle: 'Saveurs authentiques de Tunisie',
      heroSubtitle: 'Découvrez nos produits du terroir, sélectionnés avec passion.',
      heroCta: 'Explorer nos produits',
      font: 'inter',
      returnPolicy: 'Retours acceptés dans les 7 jours suivant la réception, produit non ouvert et dans son emballage d\'origine.',
    },
  });

  // Owner
  await prisma.user.create({
    data: {
      email: 'admin@jofood.com',
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      role: 'OWNER',
      tenantId: tenant.id,
    },
  });
  console.log('✅ Tenant JoFood + owner créés (admin@jofood.com / Demo1234!)');

  // ─── Catégories ───────────────────────────────────────────────────────────────
  const cats = await Promise.all([
    prisma.category.create({ data: { name: 'Huiles d\'olive', slug: 'huiles-olive', tenantId: tenant.id } }),
    prisma.category.create({ data: { name: 'Épices & Condiments', slug: 'epices-condiments', tenantId: tenant.id } }),
    prisma.category.create({ data: { name: 'Pâtisseries', slug: 'patisseries', tenantId: tenant.id } }),
    prisma.category.create({ data: { name: 'Conserves', slug: 'conserves', tenantId: tenant.id } }),
    prisma.category.create({ data: { name: 'Boissons', slug: 'boissons', tenantId: tenant.id } }),
    prisma.category.create({ data: { name: 'Coffrets cadeaux', slug: 'coffrets-cadeaux', tenantId: tenant.id } }),
  ]);
  const [catHuile, catEpice, catPatisserie, catConserve, catBoisson, catCoffret] = cats;
  console.log('✅ 6 catégories créées');

  // ─── Produits ─────────────────────────────────────────────────────────────────
  const productsData = [
    { name: 'Huile d\'olive extra vierge - 1L', slug: 'huile-olive-extra-vierge-1l', description: 'Huile d\'olive première pression à froid, récoltée dans la région de Sfax. Goût fruité et intense.', price: 28.500, comparePrice: 35.000, stock: 150, categoryId: catHuile.id },
    { name: 'Huile d\'olive bio - 500ml', slug: 'huile-olive-bio-500ml', description: 'Huile d\'olive biologique certifiée, provenance Sahel tunisien.', price: 18.900, stock: 80, categoryId: catHuile.id },
    { name: 'Huile d\'olive aromatisée romarin', slug: 'huile-olive-romarin', description: 'Huile d\'olive infusée au romarin frais, parfaite pour les grillades.', price: 22.000, stock: 45, categoryId: catHuile.id },
    { name: 'Harissa artisanale - 380g', slug: 'harissa-artisanale', description: 'Harissa traditionnelle au piment rouge séché au soleil, ail et carvi. Recette familiale.', price: 8.500, comparePrice: 12.000, stock: 200, categoryId: catEpice.id },
    { name: 'Tabel moulu - 100g', slug: 'tabel-moulu', description: 'Mélange d\'épices tunisien traditionnel : coriandre, carvi et ail séché.', price: 5.900, stock: 120, categoryId: catEpice.id },
    { name: 'Ras el Hanout premium - 80g', slug: 'ras-el-hanout', description: '27 épices sélectionnées et moulues à la main. Le roi des mélanges.', price: 12.500, stock: 60, categoryId: catEpice.id },
    { name: 'Curcuma bio - 100g', slug: 'curcuma-bio', description: 'Curcuma en poudre, certifié biologique. Idéal pour les plats et infusions.', price: 7.200, stock: 90, categoryId: catEpice.id },
    { name: 'Makroudh aux dattes - 500g', slug: 'makroudh-dattes', description: 'Makroudh traditionnel aux dattes Deglet Nour, frits et enrobés de miel.', price: 15.000, comparePrice: 18.000, stock: 40, categoryId: catPatisserie.id },
    { name: 'Baklawa assortie - 1kg', slug: 'baklawa-assortie', description: 'Assortiment de baklavas : noix, pistaches et amandes. Préparation artisanale.', price: 45.000, stock: 25, categoryId: catPatisserie.id },
    { name: 'Kaak Warka - 12 pièces', slug: 'kaak-warka', description: 'Gâteaux traditionnels à base de feuille de warka, amandes et sucre glace.', price: 22.000, stock: 35, categoryId: catPatisserie.id },
    { name: 'Confiture de figues - 350g', slug: 'confiture-figues', description: 'Confiture artisanale de figues fraîches de Djebba, cuisson lente au sucre de canne.', price: 9.800, stock: 70, categoryId: catConserve.id },
    { name: 'Tomates séchées à l\'huile - 280g', slug: 'tomates-sechees-huile', description: 'Tomates séchées au soleil marinées dans l\'huile d\'olive extra vierge.', price: 14.500, stock: 55, categoryId: catConserve.id },
    { name: 'Olives Sahli - 500g', slug: 'olives-sahli', description: 'Olives noires du Sahel tunisien, marinées aux herbes de Provence.', price: 11.000, stock: 85, categoryId: catConserve.id },
    { name: 'Thé vert à la menthe - 200g', slug: 'the-vert-menthe', description: 'Thé vert gunpowder mélangé avec de la menthe séchée de Nabeul.', price: 8.000, stock: 100, categoryId: catBoisson.id },
    { name: 'Eau de fleur d\'oranger - 250ml', slug: 'eau-fleur-oranger', description: 'Eau de fleur d\'oranger distillée, Cap Bon. Usage culinaire et cosmétique.', price: 6.500, stock: 120, categoryId: catBoisson.id },
    { name: 'Sirop de grenade - 500ml', slug: 'sirop-grenade', description: 'Sirop concentré de grenade tunisienne, sans colorant ni conservateur.', price: 13.500, stock: 40, categoryId: catBoisson.id },
    { name: 'Coffret Découverte Tunisie', slug: 'coffret-decouverte', description: 'Coffret cadeau comprenant : huile d\'olive 250ml, harissa 190g, tabel 50g et makroudh 250g.', price: 55.000, comparePrice: 65.000, stock: 20, categoryId: catCoffret.id },
    { name: 'Coffret Premium Épicurien', slug: 'coffret-premium', description: 'Le meilleur de nos produits : huile d\'olive bio 500ml, baklawa 500g, ras el hanout 80g, confiture de figues 350g.', price: 89.000, comparePrice: 105.000, stock: 15, categoryId: catCoffret.id },
  ];

  const products: Product[] = [];
  for (const p of productsData) {
    const product = await prisma.product.create({
      data: {
        ...p,
        isActive: true,
        tenantId: tenant.id,
        lowStockThreshold: 10,
      },
    });
    products.push(product);
  }
  console.log(`✅ ${products.length} produits créés`);

  // Variantes pour quelques produits
  await prisma.productVariant.createMany({
    data: [
      { productId: products[0].id, name: '500ml', price: 16.000, stock: 60 },
      { productId: products[0].id, name: '1L', price: 28.500, stock: 150 },
      { productId: products[0].id, name: '2L', price: 52.000, stock: 30 },
      { productId: products[3].id, name: 'Douce', stock: 100 },
      { productId: products[3].id, name: 'Piquante', stock: 100 },
      { productId: products[8].id, name: '500g', price: 25.000, stock: 25 },
      { productId: products[8].id, name: '1kg', price: 45.000, stock: 25 },
    ],
  });
  console.log('✅ Variantes créées');

  // ─── Tags clients ─────────────────────────────────────────────────────────────
  const tagVIP = await prisma.customerTag.create({ data: { tenantId: tenant.id, name: 'VIP', color: '#7C3AED' } });
  const tagFidele = await prisma.customerTag.create({ data: { tenantId: tenant.id, name: 'Fidèle', color: '#059669' } });
  const tagNouveau = await prisma.customerTag.create({ data: { tenantId: tenant.id, name: 'Nouveau', color: '#2563EB' } });
  const tagB2B = await prisma.customerTag.create({ data: { tenantId: tenant.id, name: 'B2B', color: '#D97706' } });
  console.log('✅ Tags clients créés');

  // ─── Clients ──────────────────────────────────────────────────────────────────
  const customersData = [
    { firstName: 'Sami', lastName: 'Ben Ahmed', phone: '+21698123456', email: 'sami.benahmed@gmail.com', source: 'CHECKOUT' as const, totalSpent: 245.500, orderCount: 5, tags: [tagVIP.id, tagFidele.id] },
    { firstName: 'Amira', lastName: 'Trabelsi', phone: '+21655789012', email: 'amira.t@outlook.com', source: 'CHECKOUT' as const, totalSpent: 178.000, orderCount: 3, tags: [tagFidele.id] },
    { firstName: 'Youssef', lastName: 'Gharbi', phone: '+21622345678', email: 'y.gharbi@hotmail.com', source: 'CHECKOUT' as const, totalSpent: 89.000, orderCount: 2, tags: [tagNouveau.id] },
    { firstName: 'Fatma', lastName: 'Mansouri', phone: '+21690456789', email: 'fatma.m@gmail.com', source: 'CHECKOUT' as const, totalSpent: 342.000, orderCount: 7, tags: [tagVIP.id, tagFidele.id] },
    { firstName: 'Mehdi', lastName: 'Karoui', phone: '+21651234567', email: 'mehdi.karoui@yahoo.fr', source: 'CHECKOUT' as const, totalSpent: 55.000, orderCount: 1, tags: [tagNouveau.id] },
    { firstName: 'Ines', lastName: 'Bouazizi', phone: '+21697654321', email: 'ines.b@gmail.com', source: 'CHECKOUT' as const, totalSpent: 156.500, orderCount: 4, tags: [tagFidele.id] },
    { firstName: 'Karim', lastName: 'Haddad', phone: '+21620987654', email: 'k.haddad@entreprise.tn', company: 'Haddad & Fils SARL', matriculeFiscal: '9876543/B/C/D/000', source: 'MANUAL' as const, totalSpent: 890.000, orderCount: 12, tags: [tagVIP.id, tagB2B.id] },
    { firstName: 'Nadia', lastName: 'Sassi', phone: '+21653456789', email: 'nadia.sassi@gmail.com', source: 'CHECKOUT' as const, totalSpent: 67.500, orderCount: 2, tags: [] },
    { firstName: 'Hatem', lastName: 'Jebali', phone: '+21699876543', email: 'hatem.j@gmail.com', source: 'CHECKOUT' as const, totalSpent: 120.000, orderCount: 3, tags: [tagFidele.id] },
    { firstName: 'Salma', lastName: 'Chaabane', phone: '+21654321098', email: 'salma.ch@outlook.com', source: 'CHECKOUT' as const, totalSpent: 28.500, orderCount: 1, tags: [tagNouveau.id] },
    { firstName: 'Omar', lastName: 'Belhadj', phone: '+21692345678', email: 'omar.b@gmail.com', source: 'CHECKOUT' as const, totalSpent: 198.000, orderCount: 4, tags: [tagFidele.id] },
    { firstName: 'Leila', lastName: 'Mzoughi', phone: '+21656789012', email: 'leila.mz@gmail.com', source: 'CHECKOUT' as const, totalSpent: 445.000, orderCount: 8, tags: [tagVIP.id, tagFidele.id] },
  ];

  const customers: Customer[] = [];
  for (const c of customersData) {
    const { tags, ...data } = c;
    const customer = await prisma.customer.create({
      data: {
        ...data,
        tenantId: tenant.id,
        status: 'ACTIVE',
        lastOrderAt: randomDate(60),
      },
    });
    if (tags.length > 0) {
      await prisma.customerTagLink.createMany({
        data: tags.map(tagId => ({ customerId: customer.id, tagId })),
      });
    }
    // Adresse
    await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        label: 'Domicile',
        line1: randomAddress(),
        city: randomCity(),
        governorate: randomGouvernorat(),
        postalCode: String(1000 + Math.floor(Math.random() * 8000)),
        isDefault: true,
      },
    });
    customers.push(customer);
  }
  console.log(`✅ ${customers.length} clients créés`);

  // ─── Commandes (30 derniers jours) ────────────────────────────────────────────
  const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
  const statusWeights = [4, 3, 2, 3, 15, 2]; // Plus de DELIVERED

  let orderNum = 1000;
  const orders: Order[] = [];

  for (let i = 0; i < 45; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const numItems = 1 + Math.floor(Math.random() * 4);
    const orderProducts = shuffle([...products]).slice(0, numItems);
    const status = weightedRandom(statuses as unknown as string[], statusWeights) as typeof statuses[number];
    const createdAt = randomDate(35);
    const shippingFee = Math.random() > 0.3 ? 7 : 0;

    let total = 0;
    const items = orderProducts.map(p => {
      const qty = 1 + Math.floor(Math.random() * 3);
      const price = parseFloat(String(p.price));
      total += price * qty;
      return { productId: p.id, quantity: qty, unitPrice: price };
    });
    total += shippingFee;

    orderNum++;
    const order = await prisma.order.create({
      data: {
        orderNumber: `JF-${orderNum}`,
        status,
        totalAmount: Math.round(total * 100) / 100,
        shippingFee,
        paymentMethod: 'COD',
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        customerId: customer.id,
        shippingAddress: {
          line1: randomAddress(),
          city: randomCity(),
          governorate: randomGouvernorat(),
          postalCode: String(1000 + Math.floor(Math.random() * 8000)),
        },
        tenantId: tenant.id,
        createdAt,
        items: {
          create: items,
        },
      },
    });
    orders.push(order);
  }
  console.log(`✅ ${orders.length} commandes créées`);

  // ─── Avis clients ─────────────────────────────────────────────────────────────
  const reviewComments = [
    'Excellent produit, je recommande vivement !',
    'Très bonne qualité, goût authentique.',
    'Livraison rapide, emballage soigné.',
    'Un peu cher mais la qualité est au rendez-vous.',
    'Parfait pour offrir, le coffret est magnifique.',
    'J\'en achète régulièrement, toujours satisfait.',
    'Bon rapport qualité/prix.',
    'Le meilleur que j\'ai goûté, bravo !',
    'Conforme à la description, je suis content.',
    'Produit frais et bien préparé.',
  ];

  for (let i = 0; i < 20; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const rating = [3, 4, 4, 4, 5, 5, 5, 5][Math.floor(Math.random() * 8)];
    const status = ['APPROVED', 'APPROVED', 'APPROVED', 'PENDING', 'REJECTED'][Math.floor(Math.random() * 5)] as 'PENDING' | 'APPROVED' | 'REJECTED';

    await prisma.review.create({
      data: {
        productId: product.id,
        tenantId: tenant.id,
        rating,
        authorName: `${customer.firstName} ${customer.lastName}`,
        authorEmail: customer.email ?? 'anon@mail.com',
        comment: reviewComments[Math.floor(Math.random() * reviewComments.length)],
        status,
        createdAt: randomDate(30),
      },
    });
  }
  console.log('✅ 20 avis créés');

  // ─── Coupons ──────────────────────────────────────────────────────────────────
  await prisma.coupon.createMany({
    data: [
      { tenantId: tenant.id, code: 'BIENVENUE10', type: 'PERCENT', value: 10, minAmount: 50, maxUses: 100, usedCount: 23, isActive: true },
      { tenantId: tenant.id, code: 'ETE2026', type: 'PERCENT', value: 15, minAmount: 80, maxUses: 50, usedCount: 8, isActive: true },
      { tenantId: tenant.id, code: 'LIVRAISON', type: 'FIXED', value: 7, minAmount: 30, maxUses: 200, usedCount: 45, isActive: true },
      { tenantId: tenant.id, code: 'VIP20', type: 'PERCENT', value: 20, minAmount: 100, maxUses: 30, usedCount: 5, isActive: true },
    ],
  });
  console.log('✅ 4 coupons créés');

  // ─── Mouvements de stock (sample) ─────────────────────────────────────────────
  for (const p of products.slice(0, 8)) {
    await prisma.stockMovement.create({
      data: {
        tenantId: tenant.id,
        productId: p.id,
        type: 'INITIAL',
        quantity: p.stock,
        stockBefore: 0,
        stockAfter: p.stock,
        reason: 'Stock initial',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log('✅ Mouvements de stock créés');

  console.log('\n🎉 Seed terminé avec succès !');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Super Admin : admin@shopforge.tech / Admin123!');
  console.log('📧 Boutique JoFood : admin@jofood.com / Demo1234!');
  console.log('🌐 URL vitrine : jofood.shopforge.tech (ou /store/jofood)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomDate(daysBack: number): Date {
  const now = Date.now();
  return new Date(now - Math.floor(Math.random() * daysBack * 24 * 60 * 60 * 1000));
}

function randomCity(): string {
  const cities = ['Tunis', 'Sfax', 'Sousse', 'Nabeul', 'Hammamet', 'Monastir', 'Bizerte', 'Gabès', 'Ariana', 'Ben Arous', 'La Marsa', 'Carthage', 'Sidi Bou Said'];
  return cities[Math.floor(Math.random() * cities.length)];
}

function randomGouvernorat(): string {
  const gov = ['Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Sfax', 'Sousse', 'Nabeul', 'Monastir', 'Bizerte', 'Gabès', 'Médenine', 'Kasserine'];
  return gov[Math.floor(Math.random() * gov.length)];
}

function randomAddress(): string {
  const streets = [
    'Rue de la Liberté', 'Avenue Habib Bourguiba', 'Rue de Marseille',
    'Avenue Mohamed V', 'Rue Ibn Khaldoun', 'Avenue de Carthage',
    'Rue du Lac', 'Avenue de la République', 'Rue de Rome',
    'Boulevard Bab Bhar', 'Rue Charles de Gaulle', 'Avenue Farhat Hached',
  ];
  return `${Math.floor(Math.random() * 150) + 1}, ${streets[Math.floor(Math.random() * streets.length)]}`;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function weightedRandom(items: string[], weights: number[]): string {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
