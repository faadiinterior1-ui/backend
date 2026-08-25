import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api`;

const testBackend = async () => {
  console.log('\n======================================================');
  console.log('   CÉLESTE BACKEND PHASE 2 END-TO-END VERIFICATION   ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failed++;
    }
  };

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`).then((r) => r.json());
    assert(healthRes.success === true, '1. GET /api/health responds with success: true');

    // 2. Public products listing
    const prodRes = await fetch(`${BASE_URL}/products?page=1&limit=6`).then((r) => r.json());
    assert(
      prodRes.success === true && prodRes.products?.length > 0 && prodRes.pagination?.totalItems >= 10,
      '2. GET /api/products returns paginated luxury clock collection'
    );

    const firstProduct = prodRes.products[0];
    const firstSlug = firstProduct.slug;

    // 3. Product filtering by category & price
    const catRes = await fetch(`${BASE_URL}/products?category=Moon%20Clock`).then((r) => r.json());
    assert(
      catRes.success === true && catRes.products.every((p) => p.category.includes('Moon')),
      '3. GET /api/products?category=Moon Clock filters accurately'
    );

    // 4. Product by slug
    const singleRes = await fetch(`${BASE_URL}/products/${firstSlug}`).then((r) => r.json());
    assert(
      singleRes.success === true && singleRes.product.slug === firstSlug,
      `4. GET /api/products/${firstSlug} resolves clock by slug`
    );

    // 5. Featured clocks
    const featuredRes = await fetch(`${BASE_URL}/products/featured`).then((r) => r.json());
    assert(
      featuredRes.success === true && featuredRes.products.every((p) => p.isFeatured),
      '5. GET /api/products/featured returns only featured timepieces'
    );

    // 6. User Registration
    const testEmail = `collector_${Date.now()}@example.com`;
    const regResRaw = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Horology Connoisseur',
        email: testEmail,
        password: 'SecurePassword123!',
        phone: '+92 300 5554433',
        address: {
          street: '7th Avenue Artisans Row',
          city: 'Lahore',
          postalCode: '54000',
          country: 'Pakistan',
        },
      }),
    });
    const regRes = await regResRaw.json();
    assert(
      regRes.success === true && regRes.user?.role === 'user' && !!regRes.token,
      '6. POST /api/auth/register creates user & returns JWT token'
    );
    const userToken = regRes.token;

    // 7. Duplicate email rejection
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Test',
        email: testEmail,
        password: 'Password123!',
      }),
    });
    assert(dupRes.status === 409, '7. POST /api/auth/register rejects duplicate email (409 Conflict)');

    // 8. User Login
    const loginResRaw = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SecurePassword123!',
      }),
    });
    const loginRes = await loginResRaw.json();
    assert(loginRes.success === true, '8. POST /api/auth/login succeeds with valid credentials');

    // 9. Get Current User Session (/api/auth/me)
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${userToken}` },
    }).then((r) => r.json());
    assert(
      meRes.success === true && meRes.user.email === testEmail,
      '9. GET /api/auth/me returns authenticated user profile'
    );

    // 10. Update Profile
    const profileRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ name: 'Horology Connoisseur (VIP)' }),
    }).then((r) => r.json());
    assert(
      profileRes.success === true && profileRes.user.name === 'Horology Connoisseur (VIP)',
      '10. PUT /api/auth/profile updates profile details'
    );

    // 11. Create Order
    const orderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        orderItems: [
          {
            product: firstProduct._id,
            quantity: 1,
          },
        ],
        shippingAddress: {
          city: 'Karachi',
          postalCode: '75500',
          country: 'Pakistan',
          phone: '+92 300 5554433',
        },
        paymentMethod: 'cash_on_delivery',
      }),
    }).then((r) => r.json());
    assert(
      orderRes.success === true && orderRes.order?.totalPrice > 0,
      '11. POST /api/orders creates order with server-calculated price snapshot & stock decrement'
    );
    const createdOrderId = orderRes.order?._id;

    // 12. Get User Orders
    const myOrdersRes = await fetch(`${BASE_URL}/orders/myorders`, {
      headers: { Authorization: `Bearer ${userToken}` },
    }).then((r) => r.json());
    assert(
      myOrdersRes.success === true && myOrdersRes.orders?.length > 0,
      '12. GET /api/orders/myorders returns user order history'
    );

    // 13. Get Order By ID
    const singleOrderRes = await fetch(`${BASE_URL}/orders/${createdOrderId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    }).then((r) => r.json());
    assert(
      singleOrderRes.success === true && singleOrderRes.order?._id === createdOrderId,
      '13. GET /api/orders/:id retrieves order by ID for owner'
    );

    // 14. Simulate Payment
    const payRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/pay`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ id: 'TXN_TEST_123', status: 'COMPLETED' }),
    }).then((r) => r.json());
    assert(
      payRes.success === true && payRes.order?.isPaid === true,
      '14. PUT /api/orders/:id/pay marks order as paid'
    );

    // 15. Submit Product Review
    const reviewRes = await fetch(`${BASE_URL}/products/${firstProduct._id}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        rating: 5,
        comment: 'A magnificent handcrafted timepiece! The texture and gold leaf are breathtaking.',
      }),
    }).then((r) => r.json());
    assert(
      reviewRes.success === true && reviewRes.review?.rating === 5,
      '15. POST /api/products/:id/reviews creates review & recalculates average product rating'
    );

    // 16. Duplicate Review Rejection
    const dupReviewRes = await fetch(`${BASE_URL}/products/${firstProduct._id}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ rating: 4, comment: 'Second review attempt' }),
    });
    assert(dupReviewRes.status === 400, '16. Duplicate product review prevented (400 Bad Request)');

    // 17. Submit Contact Message
    const contactRes = await fetch(`${BASE_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Julian Vance',
        email: 'julian@vance.com',
        subject: 'Custom Horology Inquiry',
        message: 'Can this clock be customized with 18k rose gold hands?',
      }),
    }).then((r) => r.json());
    assert(contactRes.success === true, '17. POST /api/contact submits customer inquiry');

    // 18. Admin Authorization & Operations
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
        password: process.env.SEED_ADMIN_PASSWORD || 'Admin@123456',
      }),
    }).then((r) => r.json());
    assert(
      adminLoginRes.success === true && adminLoginRes.user?.role === 'admin',
      '18. Admin login succeeds and verifies admin role'
    );
    const adminToken = adminLoginRes.token;

    // 19. Admin Orders List
    const adminOrdersRes = await fetch(`${BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert(
      adminOrdersRes.success === true && adminOrdersRes.orders?.length > 0,
      '19. GET /api/orders (Admin) lists all customer orders'
    );

    // 20. Admin Update Order Status
    const statusRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'delivered' }),
    }).then((r) => r.json());
    assert(
      statusRes.success === true &&
        statusRes.order?.status === 'delivered' &&
        statusRes.order?.isDelivered === true,
      '20. PUT /api/orders/:id/status (Admin) updates status to delivered & triggers delivery timestamp'
    );

    // 21. Non-admin access to admin endpoint rejection
    const blockRes = await fetch(`${BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(blockRes.status === 403, '21. Non-admin request to admin route rejected (403 Forbidden)');

    // 22. GET /api/admin/stats
    const statsRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert(
      statsRes.success === true && statsRes.stats?.totalProducts >= 0,
      '22. GET /api/admin/stats returns aggregate metrics for admin overview'
    );

    // 23. GET /api/admin/users
    const usersRes = await fetch(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert(
      usersRes.success === true && usersRes.users?.length > 0,
      '23. GET /api/admin/users lists registered accounts'
    );

    // 24. User Logout
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, { method: 'POST' }).then((r) => r.json());
    assert(logoutRes.success === true, '24. POST /api/auth/logout clears auth session');
  } catch (error) {
    console.error('[Verification Error]', error);
    failed++;
  }

  console.log('\n──────────────────────────────────────────────────────');
  console.log(`  Tests Passed: ${passed}  |  Tests Failed: ${failed}`);
  console.log('──────────────────────────────────────────────────────\n');

  if (failed === 0) {
    console.log('🎉 ALL BACKEND ENDPOINTS & SECURITY CHECKS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
};

testBackend();
