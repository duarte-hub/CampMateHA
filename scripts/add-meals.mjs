// Run: node scripts/add-meals.mjs [http://192.168.0.39:3000]
const BASE = process.argv[2] ?? 'http://192.168.0.39:3000'

const meals = [
  // ── Lunches ───────────────────────────────────────────────────────────────
  {
    name: 'Poached Chicken, Avo & Lettuce Wraps',
    mealType: 'lunch',
    notes: 'Poach chicken ahead, shred and serve cold',
    ingredients: [
      { name: 'Chicken Breasts',  quantity: '600g',    category: 'meat'    },
      { name: 'Wraps',            quantity: '8',        category: 'bakery'  },
      { name: 'Avocado',          quantity: '2',        category: 'produce' },
      { name: 'Lettuce',          quantity: '1 bag',    category: 'produce' },
      { name: 'Mayonnaise',       quantity: '1 jar',    category: 'pantry'  },
      { name: 'Lemon',            quantity: '1',        category: 'produce' },
    ],
  },
  {
    name: 'Ham, Lettuce & Hummus Wraps / Tuna & Avo Rice Cakes',
    mealType: 'lunch',
    notes: 'Two easy no-cook options for the same lunch',
    ingredients: [
      { name: 'Wraps',           quantity: '6',        category: 'bakery'  },
      { name: 'Rice Cakes',      quantity: '1 pack',   category: 'pantry'  },
      { name: 'Shaved Ham',      quantity: '200g',     category: 'meat'    },
      { name: 'Canned Tuna',     quantity: '2 cans',   category: 'pantry'  },
      { name: 'Lettuce',         quantity: '1 bag',    category: 'produce' },
      { name: 'Avocado',         quantity: '2',        category: 'produce' },
      { name: 'Cucumber',        quantity: '1',        category: 'produce' },
      { name: 'Hummus',          quantity: '200g',     category: 'produce' },
    ],
  },
  {
    name: 'Lamb Wraps with Coleslaw & Hummus',
    mealType: 'lunch',
    notes: 'Great with flatbreads too',
    ingredients: [
      { name: 'Lamb Mince',      quantity: '500g',     category: 'meat'    },
      { name: 'Wraps',           quantity: '8',        category: 'bakery'  },
      { name: 'Coleslaw Mix',    quantity: '1 bag',    category: 'produce' },
      { name: 'Hummus',          quantity: '200g',     category: 'produce' },
      { name: 'Yoghurt',         quantity: '200g',     category: 'dairy'   },
      { name: 'Cumin',           quantity: '1 tsp',    category: 'pantry'  },
      { name: 'Garlic',          quantity: '2 cloves', category: 'produce' },
      { name: 'Olive Oil',       quantity: '2 tbsp',   category: 'pantry'  },
    ],
  },

  // ── Dinners ───────────────────────────────────────────────────────────────
  {
    name: 'BBQ Sausages, Salad, Corn & Broccolini',
    mealType: 'dinner',
    ingredients: [
      { name: 'Sausages',        quantity: '8',           category: 'meat'    },
      { name: 'Corn on the Cob', quantity: '4',           category: 'produce' },
      { name: 'Broccolini',      quantity: '2 bunches',   category: 'produce' },
      { name: 'Lettuce',         quantity: '1 bag',       category: 'produce' },
      { name: 'Tomato',          quantity: '2',           category: 'produce' },
      { name: 'Cucumber',        quantity: '1',           category: 'produce' },
      { name: 'Olive Oil',       quantity: '2 tbsp',      category: 'pantry'  },
      { name: 'Tomato Sauce',    quantity: '1 bottle',    category: 'pantry'  },
    ],
  },
  {
    name: 'Nachos with Cheese & Guacamole',
    mealType: 'dinner',
    ingredients: [
      { name: 'Corn Chips',       quantity: '2 bags',  category: 'pantry'  },
      { name: 'Beef Mince',       quantity: '500g',    category: 'meat'    },
      { name: 'Taco Seasoning',   quantity: '1 pkt',   category: 'pantry'  },
      { name: 'Kidney Beans',     quantity: '1 can',   category: 'pantry'  },
      { name: 'Cheese',           quantity: '150g',    category: 'dairy'   },
      { name: 'Guacamole',        quantity: '200g',    category: 'produce' },
      { name: 'Sour Cream',       quantity: '200g',    category: 'dairy'   },
      { name: 'Salsa',            quantity: '1 jar',   category: 'pantry'  },
    ],
  },
  {
    name: 'Marinated Chicken Skewers, Lettuce & Potatoes',
    mealType: 'dinner',
    notes: 'Marinate chicken overnight for best flavour',
    ingredients: [
      { name: 'Chicken Thighs',    quantity: '800g',     category: 'meat'    },
      { name: 'Chicken Marinade',  quantity: '1 bottle', category: 'pantry'  },
      { name: 'Wooden Skewers',    quantity: '1 pack',   category: 'other'   },
      { name: 'Potatoes',          quantity: '500g',     category: 'produce' },
      { name: 'Lettuce',           quantity: '1 bag',    category: 'produce' },
      { name: 'Lemon',             quantity: '1',        category: 'produce' },
      { name: 'Olive Oil',         quantity: '2 tbsp',   category: 'pantry'  },
    ],
  },
  {
    name: 'Pasta Bolognaise',
    mealType: 'dinner',
    ingredients: [
      { name: 'Pasta',          quantity: '500g',     category: 'pantry'  },
      { name: 'Beef Mince',     quantity: '500g',     category: 'meat'    },
      { name: 'Pasta Sauce',    quantity: '2 jars',   category: 'pantry'  },
      { name: 'Onion',          quantity: '1',        category: 'produce' },
      { name: 'Garlic',         quantity: '3 cloves', category: 'produce' },
      { name: 'Parmesan',       quantity: '50g',      category: 'dairy'   },
    ],
  },
  {
    name: 'Hamburgers',
    mealType: 'dinner',
    notes: 'Aussie style — beetroot is non-negotiable',
    ingredients: [
      { name: 'Beef Patties',    quantity: '4',        category: 'meat'    },
      { name: 'Burger Buns',     quantity: '4',        category: 'bakery'  },
      { name: 'Cheese Slices',   quantity: '4',        category: 'dairy'   },
      { name: 'Lettuce',         quantity: '1 bag',    category: 'produce' },
      { name: 'Tomato',          quantity: '2',        category: 'produce' },
      { name: 'Onion',           quantity: '1',        category: 'produce' },
      { name: 'Beetroot',        quantity: '1 can',    category: 'pantry'  },
      { name: 'Tomato Sauce',    quantity: '1 bottle', category: 'pantry'  },
      { name: 'Mayonnaise',      quantity: '1 jar',    category: 'pantry'  },
    ],
  },
  {
    name: 'Risotto and Salad',
    mealType: 'dinner',
    notes: 'Mushroom & parmesan — needs constant stirring, use a thick-based pot',
    ingredients: [
      { name: 'Arborio Rice',    quantity: '2 cups',   category: 'pantry'  },
      { name: 'Chicken Stock',   quantity: '1L',       category: 'pantry'  },
      { name: 'Mushrooms',       quantity: '200g',     category: 'produce' },
      { name: 'Onion',           quantity: '1',        category: 'produce' },
      { name: 'Garlic',          quantity: '2 cloves', category: 'produce' },
      { name: 'Parmesan',        quantity: '100g',     category: 'dairy'   },
      { name: 'Butter',          quantity: '50g',      category: 'dairy'   },
      { name: 'Olive Oil',       quantity: '2 tbsp',   category: 'pantry'  },
      { name: 'Lettuce',         quantity: '1 bag',    category: 'produce' },
      { name: 'Tomato',          quantity: '2',        category: 'produce' },
    ],
  },
  {
    name: 'Chicken Curry with Potatoes & Carrots',
    mealType: 'dinner',
    ingredients: [
      { name: 'Chicken Thighs',  quantity: '800g',     category: 'meat'    },
      { name: 'Curry Paste',     quantity: '3 tbsp',   category: 'pantry'  },
      { name: 'Coconut Cream',   quantity: '400ml',    category: 'pantry'  },
      { name: 'Potatoes',        quantity: '400g',     category: 'produce' },
      { name: 'Carrots',         quantity: '3',        category: 'produce' },
      { name: 'Onion',           quantity: '1',        category: 'produce' },
      { name: 'Rice',            quantity: '2 cups',   category: 'pantry'  },
      { name: 'Naan Bread',      quantity: '4',        category: 'bakery'  },
    ],
  },
  {
    name: 'Mexican Tacos with Mince, Salad, Cheese & Guacamole',
    mealType: 'dinner',
    ingredients: [
      { name: 'Taco Shells',     quantity: '12',       category: 'pantry'  },
      { name: 'Beef Mince',      quantity: '500g',     category: 'meat'    },
      { name: 'Taco Seasoning',  quantity: '1 pkt',    category: 'pantry'  },
      { name: 'Lettuce',         quantity: '½ bag',    category: 'produce' },
      { name: 'Tomato',          quantity: '2',        category: 'produce' },
      { name: 'Cheese',          quantity: '100g',     category: 'dairy'   },
      { name: 'Guacamole',       quantity: '200g',     category: 'produce' },
      { name: 'Sour Cream',      quantity: '200g',     category: 'dairy'   },
    ],
  },
  {
    name: 'Baked Spuds with Cheese',
    mealType: 'dinner',
    notes: 'Wrap in foil and cook in campfire coals ~45 min',
    ingredients: [
      { name: 'Large Potatoes',  quantity: '4',        category: 'produce' },
      { name: 'Cheese',          quantity: '150g',     category: 'dairy'   },
      { name: 'Butter',          quantity: '50g',      category: 'dairy'   },
      { name: 'Sour Cream',      quantity: '200g',     category: 'dairy'   },
      { name: 'Bacon',           quantity: '200g',     category: 'meat'    },
      { name: 'Spring Onions',   quantity: '1 bunch',  category: 'produce' },
    ],
  },

  // ── Snacks / Desserts ─────────────────────────────────────────────────────
  {
    name: 'Apple Crumble',
    mealType: 'snack',
    notes: 'Use camp oven or foil tray on grill — serve with cream',
    ingredients: [
      { name: 'Apples',          quantity: '6',        category: 'produce' },
      { name: 'Brown Sugar',     quantity: '½ cup',    category: 'pantry'  },
      { name: 'Rolled Oats',     quantity: '1 cup',    category: 'pantry'  },
      { name: 'Plain Flour',     quantity: '½ cup',    category: 'pantry'  },
      { name: 'Butter',          quantity: '100g',     category: 'dairy'   },
      { name: 'Cinnamon',        quantity: '1 tsp',    category: 'pantry'  },
      { name: 'Cream',           quantity: '200ml',    category: 'dairy'   },
    ],
  },
  {
    name: 'Camp Snacks',
    mealType: 'snack',
    notes: 'No prep — keep in esky or dry box',
    ingredients: [
      { name: 'Muesli Bars',     quantity: '2 boxes',  category: 'pantry'  },
      { name: 'Kiwi Fruit',      quantity: '4',        category: 'produce' },
      { name: 'Bananas',         quantity: '4',        category: 'produce' },
      { name: 'Baby Cucumbers',  quantity: '1 bag',    category: 'produce' },
      { name: 'Oranges',         quantity: '4',        category: 'produce' },
      { name: 'Rice Crackers',   quantity: '2 packs',  category: 'pantry'  },
      { name: 'Popcorn',         quantity: '2 bags',   category: 'pantry'  },
    ],
  },
  {
    name: 'Birthday Cake',
    mealType: 'snack',
    notes: 'Don\'t forget the candles!',
    ingredients: [
      { name: 'Cake Mix',        quantity: '1 box',    category: 'pantry'  },
      { name: 'Eggs',            quantity: '2',        category: 'dairy'   },
      { name: 'Butter',          quantity: '100g',     category: 'dairy'   },
      { name: 'Icing',           quantity: '1 can',    category: 'pantry'  },
      { name: 'Candles',         quantity: '1 pack',   category: 'other'   },
    ],
  },
]

let ok = 0, fail = 0
for (const meal of meals) {
  try {
    const res = await fetch(`${BASE}/api/meal-library`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meal),
    })
    if (res.ok) {
      console.log(`✓ ${meal.name}`)
      ok++
    } else {
      console.error(`✗ ${meal.name} — HTTP ${res.status}`)
      fail++
    }
  } catch (e) {
    console.error(`✗ ${meal.name} — ${e.message}`)
    fail++
  }
}
console.log(`\nDone: ${ok} added, ${fail} failed`)
