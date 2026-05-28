import type { MealTemplate, MealIngredient, MealType } from './types'

type PresetMeal = { name: string; mealType: MealType; notes?: string; ingredients: MealIngredient[] }

const PRESETS: PresetMeal[] = [
  // ── Breakfasts ────────────────────────────────────────────────────────────
  { name: 'Bacon & Eggs', mealType: 'breakfast', ingredients: [
    { name: 'Bacon', quantity: '200g', category: 'meat' },
    { name: 'Eggs', quantity: '4', category: 'dairy' },
    { name: 'Bread', quantity: '4 slices', category: 'bakery' },
    { name: 'Butter', quantity: '20g', category: 'dairy' },
  ]},
  { name: 'Scrambled Eggs on Toast', mealType: 'breakfast', ingredients: [
    { name: 'Eggs', quantity: '4', category: 'dairy' },
    { name: 'Milk', quantity: '50ml', category: 'dairy' },
    { name: 'Butter', quantity: '20g', category: 'dairy' },
    { name: 'Bread', quantity: '4 slices', category: 'bakery' },
  ]},
  { name: 'Porridge', mealType: 'breakfast', ingredients: [
    { name: 'Rolled Oats', quantity: '2 cups', category: 'pantry' },
    { name: 'Milk', quantity: '500ml', category: 'dairy' },
    { name: 'Brown Sugar', quantity: '2 tbsp', category: 'pantry' },
    { name: 'Dried Fruit', quantity: '½ cup', category: 'pantry' },
  ]},
  { name: 'Pancakes', mealType: 'breakfast', ingredients: [
    { name: 'Pancake Mix', quantity: '2 cups', category: 'pantry' },
    { name: 'Eggs', quantity: '2', category: 'dairy' },
    { name: 'Milk', quantity: '300ml', category: 'dairy' },
    { name: 'Butter', quantity: '30g', category: 'dairy' },
    { name: 'Maple Syrup', quantity: '1 bottle', category: 'pantry' },
  ]},
  { name: 'Muesli & Yoghurt', mealType: 'breakfast', ingredients: [
    { name: 'Muesli', quantity: '500g', category: 'pantry' },
    { name: 'Yoghurt', quantity: '500g', category: 'dairy' },
    { name: 'Banana', quantity: '2', category: 'produce' },
  ]},
  { name: 'Baked Beans on Toast', mealType: 'breakfast', ingredients: [
    { name: 'Baked Beans', quantity: '2 cans', category: 'pantry' },
    { name: 'Bread', quantity: '4 slices', category: 'bakery' },
    { name: 'Butter', quantity: '20g', category: 'dairy' },
  ]},
  { name: 'Toast & Vegemite', mealType: 'breakfast', notes: 'Quick & easy', ingredients: [
    { name: 'Bread', quantity: '1 loaf', category: 'bakery' },
    { name: 'Butter', quantity: '50g', category: 'dairy' },
    { name: 'Vegemite', quantity: '1 jar', category: 'pantry' },
  ]},
  { name: 'Hash Browns & Eggs', mealType: 'breakfast', ingredients: [
    { name: 'Frozen Hash Browns', quantity: '8', category: 'frozen' },
    { name: 'Eggs', quantity: '4', category: 'dairy' },
    { name: 'Tomato Sauce', quantity: '1 bottle', category: 'pantry' },
  ]},

  // ── Lunches ───────────────────────────────────────────────────────────────
  { name: 'Salad Wraps', mealType: 'lunch', ingredients: [
    { name: 'Wraps', quantity: '6', category: 'bakery' },
    { name: 'Lettuce', quantity: '1 bag', category: 'produce' },
    { name: 'Tomato', quantity: '2', category: 'produce' },
    { name: 'Cucumber', quantity: '1', category: 'produce' },
    { name: 'Cheese', quantity: '100g', category: 'dairy' },
    { name: 'Shaved Ham', quantity: '200g', category: 'meat' },
    { name: 'Mayonnaise', quantity: '1 jar', category: 'pantry' },
  ]},
  { name: 'Ham & Cheese Sandwiches', mealType: 'lunch', ingredients: [
    { name: 'Bread', quantity: '1 loaf', category: 'bakery' },
    { name: 'Shaved Ham', quantity: '200g', category: 'meat' },
    { name: 'Cheese', quantity: '100g', category: 'dairy' },
    { name: 'Butter', quantity: '50g', category: 'dairy' },
  ]},
  { name: 'Crackers & Dip Platter', mealType: 'lunch', notes: 'No cooking required', ingredients: [
    { name: 'Crackers', quantity: '2 boxes', category: 'pantry' },
    { name: 'Hummus', quantity: '200g', category: 'produce' },
    { name: 'Cheese', quantity: '150g', category: 'dairy' },
    { name: 'Salami', quantity: '100g', category: 'meat' },
    { name: 'Olives', quantity: '1 jar', category: 'pantry' },
  ]},
  { name: 'Soup & Bread', mealType: 'lunch', ingredients: [
    { name: 'Canned Soup', quantity: '2 cans', category: 'pantry' },
    { name: 'Crusty Bread', quantity: '1 loaf', category: 'bakery' },
    { name: 'Butter', quantity: '30g', category: 'dairy' },
  ]},
  { name: 'Tuna Rice Bowl', mealType: 'lunch', ingredients: [
    { name: 'Microwave Rice', quantity: '2 pouches', category: 'pantry' },
    { name: 'Canned Tuna', quantity: '2 cans', category: 'pantry' },
    { name: 'Corn', quantity: '1 can', category: 'pantry' },
    { name: 'Mayonnaise', quantity: '2 tbsp', category: 'pantry' },
    { name: 'Soy Sauce', quantity: '2 tbsp', category: 'pantry' },
  ]},
  { name: 'Toasted Sandwiches', mealType: 'lunch', ingredients: [
    { name: 'Bread', quantity: '1 loaf', category: 'bakery' },
    { name: 'Cheese', quantity: '150g', category: 'dairy' },
    { name: 'Shaved Ham', quantity: '200g', category: 'meat' },
    { name: 'Butter', quantity: '50g', category: 'dairy' },
  ]},

  // ── Dinners ───────────────────────────────────────────────────────────────
  { name: 'Sausages & Roast Veg', mealType: 'dinner', ingredients: [
    { name: 'Sausages', quantity: '8', category: 'meat' },
    { name: 'Potatoes', quantity: '500g', category: 'produce' },
    { name: 'Capsicum', quantity: '2', category: 'produce' },
    { name: 'Onion', quantity: '2', category: 'produce' },
    { name: 'Olive Oil', quantity: '3 tbsp', category: 'pantry' },
    { name: 'Bread Rolls', quantity: '4', category: 'bakery' },
  ]},
  { name: 'Pasta Bolognese', mealType: 'dinner', ingredients: [
    { name: 'Pasta', quantity: '500g', category: 'pantry' },
    { name: 'Beef Mince', quantity: '500g', category: 'meat' },
    { name: 'Pasta Sauce', quantity: '2 jars', category: 'pantry' },
    { name: 'Onion', quantity: '1', category: 'produce' },
    { name: 'Garlic', quantity: '3 cloves', category: 'produce' },
    { name: 'Parmesan', quantity: '50g', category: 'dairy' },
  ]},
  { name: 'BBQ Chicken & Salad', mealType: 'dinner', ingredients: [
    { name: 'Chicken Thighs', quantity: '800g', category: 'meat' },
    { name: 'BBQ Marinade', quantity: '1 bottle', category: 'pantry' },
    { name: 'Lettuce', quantity: '1 bag', category: 'produce' },
    { name: 'Tomato', quantity: '2', category: 'produce' },
    { name: 'Bread Rolls', quantity: '4', category: 'bakery' },
  ]},
  { name: 'Campfire Beef Stew', mealType: 'dinner', notes: 'Needs a camp oven or pot', ingredients: [
    { name: 'Beef Chuck', quantity: '600g', category: 'meat' },
    { name: 'Potatoes', quantity: '400g', category: 'produce' },
    { name: 'Carrots', quantity: '3', category: 'produce' },
    { name: 'Onion', quantity: '1', category: 'produce' },
    { name: 'Beef Stock', quantity: '500ml', category: 'pantry' },
    { name: 'Crusty Bread', quantity: '1 loaf', category: 'bakery' },
  ]},
  { name: 'Fried Rice', mealType: 'dinner', ingredients: [
    { name: 'Rice', quantity: '2 cups', category: 'pantry' },
    { name: 'Eggs', quantity: '3', category: 'dairy' },
    { name: 'Frozen Mixed Veg', quantity: '1 bag', category: 'frozen' },
    { name: 'Soy Sauce', quantity: '3 tbsp', category: 'pantry' },
    { name: 'Sesame Oil', quantity: '1 tbsp', category: 'pantry' },
    { name: 'Shaved Ham', quantity: '150g', category: 'meat' },
  ]},
  { name: 'Tacos', mealType: 'dinner', ingredients: [
    { name: 'Taco Shells', quantity: '12', category: 'pantry' },
    { name: 'Beef Mince', quantity: '500g', category: 'meat' },
    { name: 'Taco Seasoning', quantity: '1 pkt', category: 'pantry' },
    { name: 'Lettuce', quantity: '½ bag', category: 'produce' },
    { name: 'Tomato', quantity: '2', category: 'produce' },
    { name: 'Cheese', quantity: '100g', category: 'dairy' },
    { name: 'Sour Cream', quantity: '200g', category: 'dairy' },
    { name: 'Salsa', quantity: '1 jar', category: 'pantry' },
  ]},
  { name: 'Nachos', mealType: 'dinner', ingredients: [
    { name: 'Corn Chips', quantity: '2 bags', category: 'pantry' },
    { name: 'Beef Mince', quantity: '500g', category: 'meat' },
    { name: 'Kidney Beans', quantity: '1 can', category: 'pantry' },
    { name: 'Cheese', quantity: '150g', category: 'dairy' },
    { name: 'Sour Cream', quantity: '200g', category: 'dairy' },
    { name: 'Salsa', quantity: '1 jar', category: 'pantry' },
    { name: 'Jalapeños', quantity: '1 jar', category: 'pantry' },
  ]},
  { name: 'Curried Sausages', mealType: 'dinner', ingredients: [
    { name: 'Sausages', quantity: '8', category: 'meat' },
    { name: 'Curry Sauce', quantity: '1 jar', category: 'pantry' },
    { name: 'Potatoes', quantity: '400g', category: 'produce' },
    { name: 'Onion', quantity: '1', category: 'produce' },
    { name: 'Rice', quantity: '2 cups', category: 'pantry' },
  ]},
  { name: 'Fish & Chips', mealType: 'dinner', ingredients: [
    { name: 'Fish Fillets', quantity: '600g', category: 'meat' },
    { name: 'Potatoes', quantity: '600g', category: 'produce' },
    { name: 'Flour', quantity: '1 cup', category: 'pantry' },
    { name: 'Oil', quantity: '500ml', category: 'pantry' },
    { name: 'Lemon', quantity: '2', category: 'produce' },
    { name: 'Tartare Sauce', quantity: '1 jar', category: 'pantry' },
  ]},
  { name: 'Chicken Curry & Rice', mealType: 'dinner', ingredients: [
    { name: 'Chicken Thighs', quantity: '800g', category: 'meat' },
    { name: 'Curry Paste', quantity: '3 tbsp', category: 'pantry' },
    { name: 'Coconut Cream', quantity: '400ml', category: 'pantry' },
    { name: 'Onion', quantity: '1', category: 'produce' },
    { name: 'Rice', quantity: '2 cups', category: 'pantry' },
    { name: 'Naan Bread', quantity: '4', category: 'bakery' },
  ]},
  { name: 'Chilli Con Carne', mealType: 'dinner', ingredients: [
    { name: 'Beef Mince', quantity: '500g', category: 'meat' },
    { name: 'Kidney Beans', quantity: '2 cans', category: 'pantry' },
    { name: 'Diced Tomatoes', quantity: '2 cans', category: 'pantry' },
    { name: 'Chilli Con Carne Seasoning', quantity: '1 pkt', category: 'pantry' },
    { name: 'Rice', quantity: '2 cups', category: 'pantry' },
    { name: 'Sour Cream', quantity: '200g', category: 'dairy' },
  ]},
  { name: 'Steak & Veg', mealType: 'dinner', ingredients: [
    { name: 'Steak', quantity: '600g', category: 'meat' },
    { name: 'Corn on the Cob', quantity: '2', category: 'produce' },
    { name: 'Potatoes', quantity: '400g', category: 'produce' },
    { name: 'Butter', quantity: '40g', category: 'dairy' },
    { name: 'Steak Seasoning', quantity: '1 pkt', category: 'pantry' },
  ]},

  // ── Snacks ────────────────────────────────────────────────────────────────
  { name: 'Trail Mix', mealType: 'snack', notes: 'No preparation', ingredients: [
    { name: 'Mixed Nuts', quantity: '200g', category: 'pantry' },
    { name: 'Dried Fruit', quantity: '150g', category: 'pantry' },
    { name: 'Chocolate Chips', quantity: '100g', category: 'pantry' },
  ]},
  { name: 'Fruit', mealType: 'snack', notes: 'No preparation', ingredients: [
    { name: 'Apples', quantity: '4', category: 'produce' },
    { name: 'Bananas', quantity: '4', category: 'produce' },
    { name: 'Oranges', quantity: '4', category: 'produce' },
  ]},
  { name: 'Cheese & Crackers', mealType: 'snack', ingredients: [
    { name: 'Crackers', quantity: '1 box', category: 'pantry' },
    { name: 'Cheese', quantity: '150g', category: 'dairy' },
  ]},
  { name: 'Muesli Bars', mealType: 'snack', notes: 'No preparation', ingredients: [
    { name: 'Muesli Bars', quantity: '1 box', category: 'pantry' },
  ]},
  { name: 'Chips', mealType: 'snack', notes: 'No preparation', ingredients: [
    { name: 'Chips', quantity: '2 bags', category: 'pantry' },
    { name: 'Dip', quantity: '200g', category: 'dairy' },
  ]},
  { name: 'Chocolate', mealType: 'snack', notes: 'No preparation', ingredients: [
    { name: 'Chocolate Blocks', quantity: '2', category: 'pantry' },
  ]},
]

export function getPresetMeals(): MealTemplate[] {
  return PRESETS.map((m, i) => ({ ...m, id: `preset-${i}`, isCustom: false }))
}
