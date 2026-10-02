import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import User from "../src/models/User.js";
import Product from "../src/models/Product.js";
import Coupon from "../src/models/Coupon.js";
import Announcement from "../src/models/Announcement.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27018/rk-saree-dev?replicaSet=rs0";

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB for seeding...");

  const existingCount = await Product.countDocuments();
  if (existingCount > 0) {
    console.log(`Database already contains ${existingCount} products. Skipping product seed.`);
  } else {
    console.log("Seeding products...");
    await Product.create([
      {
        name: "Royal Crimson Banarasi Katan Silk Saree",
        category: "Women",
        subcategory: "Sarees",
        price: 4999,
        discount: 15,
        countInStock: 8,
        description: "Exquisite handwoven Banarasi Katan silk saree featuring intricate floral zari jaal in gold and silver, scalloped pallu, and contrast border.",
        image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80"
        ],
        tags: ["Pure Silk", "Bridal", "Wedding", "Handloom"],
        featured: true,
        isBestSeller: true,
        rating: 4.9,
        numReviews: 28,
        specs: {
          fabric: "Pure Katan Silk",
          color: "Crimson Red & Antique Gold",
          work: "Zari Weaving",
          occasion: "Bridal / Wedding",
          lengthMeters: 6.3,
          widthInches: 46,
          blousePieceIncluded: true,
          blousePieceMeters: 0.8,
          careInstructions: "Dry Clean Only",
          transparency: "Opaque",
          weaveType: "Handloom Kadwa",
          pattern: "Floral Jaal"
        }
      },
      {
        name: "Peacock Green Kanchipuram Pattu Saree",
        category: "Women",
        subcategory: "Sarees",
        price: 6850,
        discount: 10,
        countInStock: 5,
        description: "Traditional pure mulberry silk Kanchipuram saree adorned with temple borders, mayil (peacock) motifs, and heavy brocade pallu.",
        image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80"
        ],
        tags: ["Pure Silk", "Temple Border", "Festive", "Handloom"],
        featured: true,
        isBestSeller: true,
        rating: 4.8,
        numReviews: 19,
        specs: {
          fabric: "Pure Mulberry Silk",
          color: "Peacock Green & Royal Purple",
          work: "Pure Zari Temple Border",
          occasion: "Wedding & Festival",
          lengthMeters: 6.2,
          widthInches: 47,
          blousePieceIncluded: true,
          blousePieceMeters: 0.8,
          careInstructions: "Dry Clean Only",
          transparency: "Opaque",
          weaveType: "Korvai Weaving",
          pattern: "Peacock & Temple"
        }
      },
      {
        name: "Pastel Lavender Chanderi Silk Cotton Saree",
        category: "Women",
        subcategory: "Sarees",
        price: 2199,
        discount: 20,
        countInStock: 12,
        description: "Breezy summer Chanderi saree with shimmering zari borders, delicate floral butis, and ultra-lightweight drape.",
        image: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80"
        ],
        tags: ["Lightweight", "Party Wear", "Summer", "Cotton Silk"],
        featured: true,
        rating: 4.7,
        numReviews: 14,
        specs: {
          fabric: "Chanderi Cotton Silk",
          color: "Pastel Lavender",
          work: "Zari Buti & Gold Border",
          occasion: "Festive / Daytime Party",
          lengthMeters: 6.3,
          widthInches: 45,
          blousePieceIncluded: true,
          blousePieceMeters: 0.8,
          careInstructions: "Dry Clean or Mild Hand Wash",
          transparency: "Semi-Transparent",
          weaveType: "Chanderi Handloom",
          pattern: "Zari Buti"
        }
      },
      {
        name: "Mustard Yellow Bandhani Silk Saree",
        category: "Women",
        subcategory: "Sarees",
        price: 1899,
        discount: 25,
        countInStock: 15,
        description: "Vibrant traditional Rajasthani Bandhej tie-and-dye saree on soft art silk with gota patti handwork border.",
        image: "https://images.unsplash.com/photo-1610030469668-93530c17b58f?auto=format&fit=crop&w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1610030469668-93530c17b58f?auto=format&fit=crop&w=800&q=80"
        ],
        tags: ["Under ₹2,000", "Bandhani", "Haldi", "Festive"],
        featured: false,
        rating: 4.6,
        numReviews: 22,
        specs: {
          fabric: "Soft Georgette Art Silk",
          color: "Mustard Yellow & Red",
          work: "Bandhej Tie & Dye with Gota Patti",
          occasion: "Haldi / Puja",
          lengthMeters: 6.0,
          widthInches: 44,
          blousePieceIncluded: true,
          blousePieceMeters: 0.8,
          careInstructions: "Dry Clean Only",
          transparency: "Opaque",
          pattern: "Bandhani Dots"
        }
      },
      {
        name: "Emerald Green Embroidered Bridal Lehenga",
        category: "Women",
        subcategory: "Lehengas",
        price: 8499,
        discount: 18,
        countInStock: 4,
        description: "Heavy semi-stitched velvet lehenga choli with dori, sequin and stone embroidery, flared flair, and heavy net dupatta.",
        image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80"
        ],
        tags: ["Bridal", "Lehenga", "Wedding", "Heavy Work"],
        featured: true,
        rating: 5.0,
        numReviews: 11,
        specs: {
          fabric: "Micro Velvet & Net",
          color: "Emerald Green",
          work: "Dori & Zari Sequins",
          occasion: "Reception & Wedding",
          careInstructions: "Dry Clean Only"
        }
      },
      {
        name: "Men's Royal Silk Blend Kurta Pajama Set",
        category: "Men",
        subcategory: "Kurtas",
        price: 1850,
        discount: 15,
        countInStock: 10,
        description: "Classic mandarin collar jacquard silk blend kurta with comfortable cotton-silk churidar pajama for festive celebrations.",
        image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80"
        ],
        tags: ["Men", "Kurta", "Festive", "Ethnic"],
        featured: false,
        rating: 4.6,
        numReviews: 17,
        specs: {
          fabric: "Jacquard Silk Blend",
          color: "Navy Blue & Cream",
          occasion: "Puja / Festive / Reception",
          careInstructions: "Dry Clean or Gentle Machine Wash"
        }
      },
      {
        name: "Kids Festive Dhoti Kurta Set",
        category: "Kids",
        subcategory: "Kurta Sets",
        price: 999,
        discount: 20,
        countInStock: 14,
        description: "Comfortable breathable cotton-blend festive ethnic kurta and ready-to-wear stitched dhoti for boys.",
        image: "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=800&q=80"
        ],
        tags: ["Kids", "Dhoti Kurta", "Festive", "Comfort"],
        featured: false,
        rating: 4.8,
        numReviews: 9,
        specs: {
          fabric: "Pure Cotton Blend",
          color: "Saffron Orange & Cream",
          occasion: "Diwali / Festivals",
          careInstructions: "Machine Wash"
        }
      }
    ]);
    console.log("Seeded sample products successfully!");
  }

  // Seed Admin and Demo Customer if not present
  const adminExists = await User.findOne({ email: "admin@rksaree.com" });
  if (!adminExists) {
    console.log("Creating default admin account...");
    await User.create({
      name: "Munna Kumar (Admin)",
      email: "admin@rksaree.com",
      password: "AdminPassword123!",
      isAdmin: true,
      isEmailVerified: true,
      phone: "9876543210"
    });
    console.log("Default Admin: admin@rksaree.com / AdminPassword123!");
  }

  const customerExists = await User.findOne({ email: "customer@test.com" });
  if (!customerExists) {
    console.log("Creating demo customer account...");
    await User.create({
      name: "Pooja Sharma",
      email: "customer@test.com",
      password: "CustomerPassword123!",
      isAdmin: false,
      isEmailVerified: true,
      phone: "9876543211",
      addresses: [
        {
          label: "Home",
          fullName: "Pooja Sharma",
          phone: "9876543211",
          street: "Ward 4, Near Gandhi Chowk",
          landmark: "Opposite SBI ATM",
          city: "Motihari",
          state: "Bihar",
          postalCode: "845401",
          isDefault: true
        }
      ]
    });
    console.log("Demo Customer: customer@test.com / CustomerPassword123!");
  }

  // Seed coupons if none
  const couponCount = await Coupon.countDocuments();
  if (couponCount === 0) {
    console.log("Seeding welcome coupons...");
    await Coupon.create([
      {
        code: "WELCOME10",
        discountType: "percentage",
        discountValue: 10,
        minOrderAmount: 999,
        maxDiscountAmount: 500,
        isActive: true,
        description: "10% off on your first order above ₹999",
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      {
        code: "FESTIVE500",
        discountType: "fixed",
        discountValue: 500,
        minOrderAmount: 2999,
        maxDiscountAmount: 500,
        isActive: true,
        description: "Flat ₹500 discount on royal silk sarees above ₹2,999",
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    ]);
  }

  // Seed announcement
  const announceCount = await Announcement.countDocuments();
  if (announceCount === 0) {
    await Announcement.create({
      message: "🌸 Welcome to RK Saree Center & Fashion Hub! Free Delivery Across India on Orders Above ₹2,000 | Cash on Delivery Available 🌸",
      type: "offer",
      isActive: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });
  }

  await mongoose.disconnect();
  console.log("Seeding complete!");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
