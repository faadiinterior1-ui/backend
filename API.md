# Céleste Artisanal Luxury Wall Clocks — Backend REST API Documentation (Phase 2)

Welcome to the backend REST API documentation for **Céleste Horologie**. This backend is built with **Node.js, Express.js, MongoDB Atlas (Mongoose), JWT authentication (HTTP-only cookies + Bearer Token support), Multer file uploads, Helmet, Rate Limiting, and Centralized Error Handling**.

---

## 1. Base URL & Architecture

- **Base URL**: `http://localhost:5000/api`
- **Environment**: Configured via `backend/.env`
- **Response Format**: Standardized JSON format across all routes.
- **Authentication**:
  - **Browser Frontend**: Secure HTTP-only cookies (`clock_store_token`).
  - **API Clients (Postman / Thunder Client)**: `Authorization: Bearer <jwt_token>` header or cookie jar.

### Standard Success Response:
```json
{
  "success": true,
  "message": "Optional human-readable message",
  "data": {}
}
```

### Standard Error Response:
```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": ["Specific field validation errors if applicable"]
}
```

---

## 2. Authentication & User APIs (`/api/auth`)

### 2.1 Register New Account
- **Endpoint**: `POST /api/auth/register`
- **Auth**: Public
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "name": "Jane Horologist",
  "email": "jane@example.com",
  "password": "Password123!",
  "phone": "+92 300 9876543",
  "address": {
    "street": "14 Luxury Boulevard",
    "city": "Lahore",
    "state": "Punjab",
    "postalCode": "54000",
    "country": "Pakistan"
  }
}
```
- **Success (201 Created)**:
```json
{
  "success": true,
  "message": "Registration successful. Welcome to Céleste Artisanal Clocks!",
  "token": "eyJhbGciOi...",
  "user": {
    "id": "651f8a7e...",
    "name": "Jane Horologist",
    "email": "jane@example.com",
    "role": "user",
    "phone": "+92 300 9876543",
    "address": { ... }
  }
}
```
- **Error (400 / 409)**: Missing fields or email already exists.

---

### 2.2 Login User
- **Endpoint**: `POST /api/auth/login`
- **Auth**: Public
- **Request Body**:
```json
{
  "email": "jane@example.com",
  "password": "Password123!"
}
```
- **Success (200 OK)**:
```json
{
  "success": true,
  "message": "Welcome back to Céleste!",
  "token": "eyJhbGciOi...",
  "user": {
    "id": "651f8a7e...",
    "name": "Jane Horologist",
    "email": "jane@example.com",
    "role": "user"
  }
}
```
- **Error (401 Unauthorized)**: Invalid email or password.

---

### 2.3 Logout User
- **Endpoint**: `POST /api/auth/logout`
- **Auth**: Public
- **Success (200 OK)**:
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

---

### 2.4 Get Current User Session
- **Endpoint**: `GET /api/auth/me`
- **Auth**: Required (`protect`)
- **Headers**: `Authorization: Bearer <token>` or Cookie
- **Success (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": "651f8a7e...",
    "name": "Jane Horologist",
    "email": "jane@example.com",
    "role": "user",
    "phone": "+92 300 9876543",
    "address": { ... },
    "createdAt": "2026-08-24T10:00:00.000Z"
  }
}
```

---

### 2.5 Update User Profile
- **Endpoint**: `PUT /api/auth/profile`
- **Auth**: Required (`protect`)
- **Request Body**:
```json
{
  "name": "Jane H. Updated",
  "phone": "+92 300 1112233",
  "address": {
    "street": "Penthouse Suite 8",
    "city": "Islamabad"
  }
}
```
- **Success (200 OK)**: Returns updated user profile & refreshed token cookie.

---

## 3. Product APIs (`/api/products`)

### 3.1 List Products (With Filters, Search, Sort & Pagination)
- **Endpoint**: `GET /api/products`
- **Auth**: Public
- **Query Parameters**:
  - `category` *(e.g. `Moon Clock`, `Wooden Clock`, `Resin Clock`, `Minimalist Clock`, `Luxury Statement Clock`)*
  - `search` *(searches name, description, material)*
  - `minPrice` & `maxPrice` *(filter price range in PKR/Currency)*
  - `sort` *(`newest`, `oldest`, `price_asc`, `price_desc`, `rating`, `popular`)*
  - `page` *(default: `1`)*
  - `limit` *(default: `12`, max: `50`)*
  - `isFeatured` *(`true` / `false`)*
  - `isLimitedEdition` *(`true` / `false`)*
- **Example Request**:
  `GET /api/products?category=Moon%20Clock&minPrice=15000&maxPrice=30000&sort=price_asc&page=1&limit=6`
- **Success (200 OK)**:
```json
{
  "success": true,
  "count": 3,
  "products": [
    {
      "_id": "64f100010000000000000001",
      "name": "Lumina Selene Hand-Textured Moon Wall Clock",
      "slug": "lumina-selene-moon-wall-clock",
      "price": 18500,
      "discountPrice": 16500,
      "finalPrice": 16500,
      "category": "Moon Clock",
      "stock": 8,
      "ratings": 4.9,
      "numReviews": 42,
      "images": ["/img1.jpg", "/img2.webp"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 6,
    "totalItems": 3,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

---

### 3.2 Get Featured Products
- **Endpoint**: `GET /api/products/featured`
- **Auth**: Public
- **Query Parameters**: `limit` (default: 6)
- **Success (200 OK)**: Returns list of clocks with `isFeatured: true`.

---

### 3.3 Get Single Product (By ID or Slug)
- **Endpoint**: `GET /api/products/:id` (Accepts ObjectId e.g. `64f1...` or slug e.g. `lumina-selene-moon-wall-clock`)
- **Auth**: Public
- **Success (200 OK)**: Returns product details object.
- **Error (404 Not Found)**: Clock not found.

---

### 3.4 Create Product (Admin Only)
- **Endpoint**: `POST /api/products`
- **Auth**: Admin (`protect`, `admin`)
- **Content-Type**: `application/json` or `multipart/form-data`
- **Request Body (JSON / Form Data)**:
```json
{
  "name": "Celestial Solar Flare Gilded Clock",
  "description": "Hand-hammered brass sunburst with 24k gold foil dial.",
  "shortDescription": "Solar flare brass geometry with silent quartz.",
  "price": 32000,
  "discountPrice": 29000,
  "category": "Luxury Statement Clock",
  "material": "Solid Brass & 24K Gold Leaf",
  "dimensions": "65 cm Diameter x 4.5 cm Depth",
  "stock": 5,
  "isFeatured": true,
  "images": ["/img12.jpeg"]
}
```
- **Success (201 Created)**: Returns created product.

---

### 3.5 Update Product (Admin Only)
- **Endpoint**: `PUT /api/products/:id`
- **Auth**: Admin (`protect`, `admin`)
- **Request Body**: Partial update object with fields to update.
- **Success (200 OK)**: Returns updated product.

---

### 3.6 Delete Product (Admin Only)
- **Endpoint**: `DELETE /api/products/:id`
- **Auth**: Admin (`protect`, `admin`)
- **Success (200 OK)**:
```json
{
  "success": true,
  "message": "Product successfully deleted from collection."
}
```

---

## 4. Review APIs (`/api/products/:id/reviews`)

### 4.1 Create Product Review
- **Endpoint**: `POST /api/products/:id/reviews` (Product ObjectId or slug)
- **Auth**: Required (`protect`)
- **Request Body**:
```json
{
  "rating": 5,
  "comment": "Exquisite craftsmanship! The moon texture and silent quartz exceeded our expectations."
}
```
- **Behavior**:
  - Validates integer rating between 1 and 5.
  - Prevents duplicate review from same user.
  - Automatically recalculates product average `ratings` and `numReviews` count.
- **Success (201 Created)**:
```json
{
  "success": true,
  "message": "Thank you! Your artisanal review has been submitted.",
  "review": {
    "_id": "...",
    "rating": 5,
    "comment": "...",
    "user": {
      "name": "Jane Horologist"
    }
  }
}
```

---

### 4.2 Get Product Reviews
- **Endpoint**: `GET /api/products/:id/reviews`
- **Auth**: Public
- **Query Parameters**: `page` (default: 1), `limit` (default: 10)
- **Success (200 OK)**:
```json
{
  "success": true,
  "count": 1,
  "reviews": [ ... ],
  "pagination": { ... }
}
```

---

## 5. Order APIs (`/api/orders`)

### 5.1 Create Order
- **Endpoint**: `POST /api/orders`
- **Auth**: Required (`protect`)
- **Security & Integrity Rules**:
  - Accepts product IDs and quantities only.
  - Fetches product price from MongoDB (never trusts client price).
  - Verifies and decrements stock atomically.
  - Calculates shipping and taxes on server.
- **Request Body**:
```json
{
  "orderItems": [
    {
      "product": "64f100010000000000000001",
      "quantity": 1
    }
  ],
  "shippingAddress": {
    "name": "Jane Horologist",
    "street": "14 Luxury Boulevard",
    "city": "Karachi",
    "state": "Sindh",
    "postalCode": "75500",
    "country": "Pakistan",
    "phone": "+92 300 9876543"
  },
  "paymentMethod": "cash_on_delivery"
}
```
- **Success (201 Created)**:
```json
{
  "success": true,
  "message": "Artisanal clock order successfully placed!",
  "order": {
    "_id": "651f...",
    "orderId": "ORD-123456-ABC",
    "orderItems": [ ... ],
    "itemsPrice": 16500,
    "shippingPrice": 500,
    "taxPrice": 825,
    "totalPrice": 17825,
    "isPaid": false,
    "status": "pending"
  }
}
```

---

### 5.2 Get My Orders
- **Endpoint**: `GET /api/orders/myorders`
- **Auth**: Required (`protect`)
- **Query Parameters**: `page`, `limit`, `status`
- **Success (200 OK)**: Returns list of orders owned by the logged-in user.

---

### 5.3 Get Order by ID
- **Endpoint**: `GET /api/orders/:id` (Accepts ObjectId or orderId)
- **Auth**: Required (`protect` - Owner or Admin)
- **Success (200 OK)**: Returns complete order details.
- **Error (403 Forbidden)**: Accessing another user's order.

---

### 5.4 Simulate Order Payment
- **Endpoint**: `PUT /api/orders/:id/pay`
- **Auth**: Required (`protect` - Owner or Admin)
- **Request Body**:
```json
{
  "id": "SIM_TXN_998877",
  "status": "COMPLETED"
}
```
- **Success (200 OK)**: Sets `isPaid: true`, `paidAt: Date`, `status: "processing"`.

---

### 5.5 Get All Orders (Admin Only)
- **Endpoint**: `GET /api/orders`
- **Auth**: Admin (`protect`, `admin`)
- **Query Parameters**: `page`, `limit`, `status`, `sort`
- **Success (200 OK)**: Returns paginated list of all customer orders.

---

### 5.6 Update Order Status (Admin Only)
- **Endpoint**: `PUT /api/orders/:id/status`
- **Auth**: Admin (`protect`, `admin`)
- **Request Body**:
```json
{
  "status": "delivered"
}
```
- **Allowed Statuses**: `pending`, `processing`, `shipped`, `delivered`, `cancelled`
- **Behavior**:
  - `delivered`: Sets `isDelivered: true` and `deliveredAt: new Date()`.
  - `cancelled`: Restores reserved stock back to the products.
- **Success (200 OK)**: Returns updated order.

---

## 6. Contact Form APIs (`/api/contact`)

### 6.1 Submit Contact Inquiry
- **Endpoint**: `POST /api/contact`
- **Auth**: Public (Rate-limited to 20 per 15 min)
- **Request Body**:
```json
{
  "name": "Alexander Sterling",
  "email": "alexander@sterling.com",
  "subject": "Custom Horological Commission",
  "message": "Inquiring regarding a 90cm bespoke moon clock with 24k gold leaf inlays."
}
```
- **Success (201 Created)**:
```json
{
  "success": true,
  "message": "Your message has been received. Our concierge will be in touch shortly."
}
```

---

### 6.2 Get Contact Messages (Admin Only)
- **Endpoint**: `GET /api/contact`
- **Auth**: Admin (`protect`, `admin`)
- **Success (200 OK)**: Returns list of contact inquiries.

---

### 6.3 Update Contact Message Status (Admin Only)
- **Endpoint**: `PUT /api/contact/:id/status`
- **Auth**: Admin (`protect`, `admin`)
- **Request Body**: `{ "status": "read" }` or `{ "status": "resolved" }`
- **Success (200 OK)**: Returns updated contact message.

---

## 7. Testing in Postman / Thunder Client

### Step 1: Login as Admin
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/auth/login`
- **Body (JSON)**:
```json
{
  "email": "admin@example.com",
  "password": "Admin@123456"
}
```
- Copy the `token` from the response.

### Step 2: Use Bearer Token for Protected Requests
- In Postman / Thunder Client headers, add:
  - `Authorization`: `Bearer <PASTE_TOKEN_HERE>`
- Now access admin endpoints like `POST /api/products`, `GET /api/orders`, etc.

---

## 8. Intentionally Deferred Features

The following enterprise capabilities are scheduled for subsequent production phases:
1. **Real Payment Gateway Integration**: Stripe / PayPal / JazzCash live webhook listener.
2. **Cloud Object Storage**: Direct S3 / Cloudinary multi-region image CDN.
3. **Transactional Email Server**: Live Amazon SES / SendGrid transactional dispatch.
4. **Refresh Token Rotation**: Separate short-lived access tokens and sliding refresh tokens.
5. **Real-time WebSockets**: Live order tracking notification streams.
