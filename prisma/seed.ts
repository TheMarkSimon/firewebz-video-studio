import { PrismaClient } from "@prisma/client";
import { toJsonArray } from "../src/lib/utils";

const prisma = new PrismaClient();

async function main() {
  // Clear in dependency order
  await prisma.feedback.deleteMany();
  await prisma.calendarItem.deleteMany();
  await prisma.generatedVideo.deleteMany();
  await prisma.videoConcept.deleteMany();
  await prisma.product.deleteMany();
  await prisma.business.deleteMany();

  const urban = await prisma.business.create({
    data: {
      name: "UrbanStep Shoes",
      websiteUrl: "https://urbanstep.example.com",
      instagramHandle: "@urbanstep",
      tiktokHandle: "@urbanstep",
      category: "Shoes/Fashion",
      description: "Stylish, comfortable everyday sneakers for young professionals.",
      location: "Brooklyn, NY",
      targetAudience: "young professionals who want stylish comfortable shoes",
      brandTone: toJsonArray(["Friendly", "Bold"]),
      goals: toJsonArray(["Promote products", "Get more awareness"]),
      platforms: toJsonArray(["instagram_reels", "tiktok"]),
      products: {
        create: [
          {
            name: "Urban Walk Sneaker",
            description: "Lightweight everyday sneaker with cushioned sole.",
            category: "Sneakers",
            price: "$98",
            keyBenefit: "All-day comfort that styles with anything",
            imagePaths: toJsonArray([]),
          },
          {
            name: "Classic White Runner",
            description: "Minimalist white sneaker for any outfit.",
            category: "Sneakers",
            price: "$110",
            keyBenefit: "Goes with everything",
            imagePaths: toJsonArray([]),
          },
          {
            name: "Weekend Leather Loafer",
            description: "Smart-casual leather loafer.",
            category: "Loafers",
            price: "$145",
            keyBenefit: "Office to dinner in one shoe",
            imagePaths: toJsonArray([]),
          },
        ],
      },
    },
  });

  await prisma.business.create({
    data: {
      name: "Sweet Corner Bakery",
      websiteUrl: "https://sweetcorner.example.com",
      instagramHandle: "@sweetcornerbakery",
      category: "Bakery/Food",
      description: "Local bakery making fresh pastries, breads, and cakes daily.",
      location: "Portland, OR",
      targetAudience: "local families and office workers",
      brandTone: toJsonArray(["Friendly", "Local/community"]),
      goals: toJsonArray(["Drive store visits", "Build trust with customers"]),
      platforms: toJsonArray(["instagram_reels", "tiktok", "facebook_reels"]),
      products: {
        create: [
          { name: "Chocolate Croissant Box", description: "Flaky, buttery, filled with chocolate.", category: "Pastry", price: "$24/box", keyBenefit: "Baked fresh every morning", imagePaths: toJsonArray([]) },
          { name: "Birthday Cupcake Set", description: "Six custom-decorated cupcakes.", category: "Cupcakes", price: "$32", keyBenefit: "Personalized for any celebration", imagePaths: toJsonArray([]) },
          { name: "Friday Challah Special", description: "Traditional braided bread, fresh for Shabbat.", category: "Bread", price: "$8", keyBenefit: "Same-day baked, no preservatives", imagePaths: toJsonArray([]) },
        ],
      },
    },
  });

  await prisma.business.create({
    data: {
      name: "GlowNest Beauty",
      websiteUrl: "https://glownest.example.com",
      instagramHandle: "@glownest",
      tiktokHandle: "@glownest",
      category: "Beauty/Cosmetics",
      description: "Clean skincare for women who care about ingredients.",
      location: "Online",
      targetAudience: "women 25–40 interested in clean skincare",
      brandTone: toJsonArray(["Trendy", "Premium"]),
      goals: toJsonArray(["Promote products", "Build trust with customers"]),
      platforms: toJsonArray(["instagram_reels", "tiktok"]),
      products: {
        create: [
          { name: "Daily Glow Serum", description: "Vitamin C brightening serum.", category: "Serum", price: "$48", keyBenefit: "Visible glow in 2 weeks", imagePaths: toJsonArray([]) },
          { name: "Hydration Face Cream", description: "Hyaluronic acid face cream.", category: "Moisturizer", price: "$42", keyBenefit: "72-hour hydration", imagePaths: toJsonArray([]) },
          { name: "Overnight Repair Mask", description: "Retinol overnight mask.", category: "Mask", price: "$56", keyBenefit: "Wake up to renewed skin", imagePaths: toJsonArray([]) },
        ],
      },
    },
  });

  console.log("Seeded businesses:", urban.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
