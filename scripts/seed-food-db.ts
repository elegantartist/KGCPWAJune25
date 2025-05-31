import { db } from '../server/db';
import { foodItems } from '../shared/schema';

// Array of Mediterranean diet food items
const mediterraneanFoods = [
  {
    name: "Greek Yogurt",
    category: "Dairy",
    description: "High-protein yogurt with probiotic benefits",
    calories: 120,
    protein: 15,
    carbs: 7,
    fat: 5,
    fiber: 0,
    sugar: 5,
    sodium: 80,
    servingSize: "1 cup (240g)",
    servingSizeGrams: 240,
    source: "FSANZ",
    cpdRelevantTags: ["mediterranean", "high-protein", "low-fat"],
    nutritionData: JSON.stringify({
      calcium: "20% DV",
      potassium: "8% DV",
      vitamins: ["B12", "Riboflavin"]
    })
  },
  {
    name: "Extra Virgin Olive Oil",
    category: "Oils",
    description: "Heart-healthy monounsaturated fat, cornerstone of Mediterranean diet",
    calories: 120,
    protein: 0,
    carbs: 0,
    fat: 14,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    servingSize: "1 tbsp (15ml)",
    servingSizeGrams: 15,
    source: "FSANZ",
    cpdRelevantTags: ["mediterranean", "heart-healthy"],
    nutritionData: JSON.stringify({
      vitaminE: "10% DV",
      polyphenols: "High",
      monounsaturated: "73% of total fat"
    })
  },
  {
    name: "Fresh Salmon",
    category: "Seafood",
    description: "Omega-3 rich fish recommended in Mediterranean diet",
    calories: 175,
    protein: 22,
    carbs: 0,
    fat: 10,
    fiber: 0,
    sugar: 0,
    sodium: 55,
    servingSize: "100g",
    servingSizeGrams: 100,
    source: "FSANZ",
    cpdRelevantTags: ["mediterranean", "high-protein", "heart-healthy"],
    nutritionData: JSON.stringify({
      omega3: "2100mg",
      vitaminD: "100% DV",
      vitaminB12: "80% DV"
    })
  },
  {
    name: "Whole Grain Bread",
    category: "Grains",
    description: "Fiber-rich bread made with whole wheat flour",
    calories: 80,
    protein: 4,
    carbs: 15,
    fat: 1,
    fiber: 3,
    sugar: 2,
    sodium: 110,
    servingSize: "1 slice (40g)",
    servingSizeGrams: 40,
    source: "FSANZ",
    cpdRelevantTags: ["mediterranean", "high-fiber", "whole-grain"],
    nutritionData: JSON.stringify({
      iron: "6% DV",
      magnesium: "8% DV",
      complexCarbs: "High"
    })
  },
  {
    name: "Chickpeas",
    category: "Legumes",
    description: "Protein and fiber-rich legume central to Mediterranean cuisine",
    calories: 120,
    protein: 7,
    carbs: 20,
    fat: 2,
    fiber: 6,
    sugar: 0,
    sodium: 5,
    servingSize: "1/2 cup (120g)",
    servingSizeGrams: 120,
    source: "FSANZ",
    cpdRelevantTags: ["mediterranean", "high-protein", "high-fiber", "low-fat"],
    nutritionData: JSON.stringify({
      iron: "10% DV",
      folate: "35% DV",
      magnesium: "12% DV"
    })
  },
  {
    name: "Tomatoes",
    category: "Vegetables",
    description: "Antioxidant-rich fruit used as a vegetable in Mediterranean cooking",
    calories: 25,
    protein: 1,
    carbs: 5,
    fat: 0,
    fiber: 1.5,
    sugar: 3,
    sodium: 10,
    servingSize: "1 medium (123g)",
    servingSizeGrams: 123,
    source: "FSANZ",
    cpdRelevantTags: ["mediterranean", "low-calorie", "low-sodium"],
    nutritionData: JSON.stringify({
      vitaminC: "20% DV",
      vitaminA: "15% DV",
      lycopene: "High"
    })
  },
  {
    name: "Feta Cheese",
    category: "Dairy",
    description: "Traditional Greek cheese used in moderation in Mediterranean diet",
    calories: 75,
    protein: 4,
    carbs: 1,
    fat: 6,
    fiber: 0,
    sugar: 0,
    sodium: 310,
    servingSize: "30g",
    servingSizeGrams: 30,
    source: "FSANZ",
    cpdRelevantTags: ["mediterranean"],
    nutritionData: JSON.stringify({
      calcium: "10% DV",
      phosphorus: "8% DV"
    })
  },
  {
    name: "Almonds",
    category: "Nuts & Seeds",
    description: "Heart-healthy nuts rich in vitamin E and good fats",
    calories: 170,
    protein: 6,
    carbs: 6,
    fat: 15,
    fiber: 3.5,
    sugar: 1,
    sodium: 0,
    servingSize: "30g (23 almonds)",
    servingSizeGrams: 30,
    source: "FSANZ",
    cpdRelevantTags: ["mediterranean", "heart-healthy", "high-protein"],
    nutritionData: JSON.stringify({
      vitaminE: "35% DV",
      magnesium: "20% DV",
      manganese: "25% DV"
    })
  },
  {
    name: "Fresh Spinach",
    category: "Vegetables",
    description: "Nutrient-dense leafy green vegetable",
    calories: 23,
    protein: 3,
    carbs: 4,
    fat: 0,
    fiber: 2,
    sugar: 0,
    sodium: 65,
    servingSize: "2 cups (60g)",
    servingSizeGrams: 60,
    source: "FSANZ",
    cpdRelevantTags: ["mediterranean", "low-calorie", "low-carb"],
    nutritionData: JSON.stringify({
      vitaminK: "500% DV",
      vitaminA: "160% DV",
      folate: "40% DV",
      iron: "15% DV"
    })
  },
  {
    name: "Quinoa",
    category: "Grains",
    description: "Complete protein grain with Mediterranean-friendly profile",
    calories: 120,
    protein: 4,
    carbs: 21,
    fat: 2,
    fiber: 3,
    sugar: 0,
    sodium: 10,
    servingSize: "1/4 cup uncooked (45g)",
    servingSizeGrams: 45,
    source: "FSANZ",
    cpdRelevantTags: ["mediterranean", "high-protein", "whole-grain"],
    nutritionData: JSON.stringify({
      iron: "15% DV",
      magnesium: "30% DV",
      zinc: "12% DV"
    })
  }
];

async function seedFoodDatabase() {
  console.log('Starting food database seeding...');
  
  try {
    // Insert Mediterranean foods
    for (const food of mediterraneanFoods) {
      await db.insert(foodItems).values({
        ...food,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: food.description,
        additionalInfo: food.nutritionData ? JSON.parse(food.nutritionData) : null,
      });
    }
    
    console.log(`Successfully added ${mediterraneanFoods.length} Mediterranean food items to the database`);
    
  } catch (error) {
    console.error('Error seeding food database:', error);
  }
}

// Execute the seeding
seedFoodDatabase()
  .then(() => console.log('Food database seeding completed'))
  .catch(err => console.error('Failed to seed food database:', err))
  .finally(() => process.exit());