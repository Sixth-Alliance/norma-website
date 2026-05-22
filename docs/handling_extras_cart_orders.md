
## Cart and order integration (extras pricing)

This section explains how frontend should send extras to cart and how backend prices and stores them.

### Add to cart payload

Endpoint:

`POST /api/v1/orders/cart/add/`

Request body (relevant fields):

```json
{
  "outlet_id": "f2ce6a97-c42e-4ecf-b2f9-1f0fb7d4e7c2",
  "product_id": "9ac98a40-0487-4654-b5f7-6e1ad12255d2",
  "quantity": 2,
  "size": "regular",
  "extras": [
    {
      "option_id": "6f2f874f-4204-4d38-8536-3f99f2be8c80",
      "quantity": 1
    },
    {
      "option_id": "74506854-b85a-45f5-ae0e-2d8376679a31",
      "quantity": 2
    }
  ],
  "special_notes": "No onions"
}
```

### How backend treats extras

- Backend validates each `option_id` belongs to the target product and is active.
- Backend snapshots option metadata and pricing into the cart item `extras`.
- Cart item identity is now: `cart + product + size + extras_hash`.
- This means same product/size but different extras are stored as separate cart lines.

### Cart response pricing fields

Each cart item now includes:

- `base_unit_price`: product base price
- `extras_total`: extras total per single unit
- `unit_price`: base + extras
- `total_price`: `unit_price * quantity`

Example item in cart response:

```json
{
  "id": "3bd04ff5-959e-4470-b38a-f0d66ba70090",
  "product_id": "9ac98a40-0487-4654-b5f7-6e1ad12255d2",
  "product_name": "Jollof Rice",
  "quantity": 2,
  "size": "regular",
  "extras": [
    {
      "extra_id": "f725513c-4378-433f-89a0-df07f2e5a00d",
      "extra_title": "Choose a drink",
      "option_id": "6f2f874f-4204-4d38-8536-3f99f2be8c80",
      "option_name": "Orange Juice",
      "option_unit_price": "200.00",
      "quantity": 1,
      "line_total": "200.00"
    }
  ],
  "base_unit_price": "2500.00",
  "extras_total": "200.00",
  "unit_price": "2700.00",
  "total_price": "5400.00"
}
```

### Checkout/order snapshot

During checkout:

- Order `subtotal` is computed from cart line totals that already include extras.
- Order `items` now include `base_unit_price`, `extras_total`, `unit_price`, `total_price`, and extras snapshot.
- This protects order history from future product option price changes.

### Frontend integration checklist

1. Always send extras using `option_id` and optional `quantity`.
2. Treat cart item line identity as product+size+extras combination.
3. Display `base_unit_price`, `extras_total`, `unit_price`, and `total_price` from cart API response.
4. Do not recalculate option prices on frontend as source of truth; use backend totals.
5. If backend returns extras validation errors, refresh product extras/options and force reselection.

---

## ProductExtras endpoints

Base path: `/product-extras/`

### List extras groups for a product

```
GET /product-extras/?product={product_uuid}
```

**Access:** Public (only `active` groups returned)  
**Query params:**

| Param | Required | Description |
|---|---|---|
| `product` | Yes | Filter by product UUID |

**Response 200:**
```jsonc
{
  "success": true,
  "message": "Retrieved 2 extras group(s)",
  "data": [ /* array of ProductExtras objects with nested options */ ]
}
```

---

### Get a single extras group

```
GET /product-extras/{id}/
```

**Access:** Public

---

### Create an extras group

```
POST /product-extras/
```

**Access:** Outlet managers, admins, super admins  
**Content-Type:** `application/json`

**Request body:**
```jsonc
{
  "product": "prod-uuid",
  "title": "Choose a side",
  "description": null,            // optional
  "extras_format": "radio",       // radio | check | toggle | text | number
  "is_required": true,
  "min_selections": 1,
  "max_selections": 1,            // 0 = unlimited
  "sort_order": 0                 // optional, default 0
}
```

**Response 201:**
```jsonc
{
  "success": true,
  "message": "Extras group created successfully",
  "data": { /* ProductExtras object with nested options (empty on creation) */ }
}
```

**Validation rules:**
- `min_selections` must be ≤ `max_selections` (unless `max_selections = 0`)

---

### Update an extras group

```
PUT  /product-extras/{id}/
PATCH /product-extras/{id}/
```

**Access:** Outlet managers, admins, super admins  
**Request body:** Same fields as create (all optional for `PATCH`)

---

### Delete an extras group

```
DELETE /product-extras/{id}/
```

**Access:** Outlet managers, admins, super admins  
**Response 204:** `{ "success": true, "message": "Extras group '...' deleted successfully", "data": null }`

> Deleting a group cascades and removes all its child `ExtrasOptions`.

---

## ExtrasOptions endpoints

Base path: `/extras-options/`

### List options for a group

```
GET /extras-options/?parent_extra={extras_uuid}
```

**Access:** Public (only `active` options returned)  
**Query params:**

| Param | Required | Description |
|---|---|---|
| `parent_extra` | Yes | Filter by `ProductExtras` UUID |

---

### Get a single option

```
GET /extras-options/{id}/
```

**Access:** Public

---

### Add an option to a group

```
POST /extras-options/
```

**Access:** Outlet managers, admins, super admins  
**Content-Type:** `application/json`

**Request body:**
```jsonc
{
  "parent_extra": "extras-uuid",
  "name": "Fried Rice",
  "image": null,         // optional URL
  "price": "0.00",       // 0.00 = free, positive value = paid add-on
  "is_default": false,   // pre-select this option on the product page
  "sort_order": 0        // optional, default 0
}
```

**Response 201:**
```jsonc
{
  "success": true,
  "message": "Option added successfully",
  "data": { /* ExtrasOptions object */ }
}
```

---

### Update an option

```
PUT  /extras-options/{id}/
PATCH /extras-options/{id}/
```

**Access:** Outlet managers, admins, super admins  
**Request body:** Same fields as create (all optional for `PATCH`)

---

### Delete an option

```
DELETE /extras-options/{id}/
```

**Access:** Outlet managers, admins, super admins  
**Response 204:** `{ "success": true, "message": "Option '...' deleted successfully", "data": null }`

---

## Frontend integration guide

### Rendering the add-to-cart UI

When a customer opens a product detail page, use the `extras` array from the product response to dynamically build the customisation form:

```js
for (const group of product.extras) {
  switch (group.extras_format) {
    case 'radio':
      // render a radio button group (single select)
      // enforce is_required + min/max_selections at submit time
      break;
    case 'check':
      // render checkboxes
      break;
    case 'toggle':
      // render a single on/off toggle
      break;
    case 'text':
      // render a text input / textarea
      break;
    case 'number':
      // render a number stepper
      break;
  }
}
```

### Calculating the total price

```js
let total = parseFloat(product.price);

for (const group of product.extras) {
  for (const selectedOptionId of userSelections[group.id] ?? []) {
    const option = group.options.find(o => o.id === selectedOptionId);
    if (option) total += parseFloat(option.price);
  }
}
```

### Validation before submitting an order

```js
for (const group of product.extras) {
  const selected = userSelections[group.id] ?? [];
  if (group.is_required && selected.length < group.min_selections) {
    throw new Error(`Please select at least ${group.min_selections} option(s) for "${group.title}"`);
  }
  if (group.max_selections > 0 && selected.length > group.max_selections) {
    throw new Error(`You can only select up to ${group.max_selections} option(s) for "${group.title}"`);
  }
}
```

### Sending selections with an order

When submitting an order, include the chosen extras like this (adjust to match your `orders` payload schema):

```jsonc
{
  "items": [
    {
      "product": "prod-uuid",
      "quantity": 1,
      "extras": [
        {
          "extras_group_id": "extras-uuid",
          "selected_options": ["option-uuid-1"]
        }
      ]
    }
  ]
}
```

---

## Caching behaviour

- Product list and detail responses are cached in Redis.
- Every write to `ProductExtras` or `ExtrasOptions` automatically **busts the cache** for the parent product (`product:detail:{id}`) and invalidates the general product list cache.
- No manual cache clearing is needed after admin operations.

---