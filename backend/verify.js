const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('--- STARTING BACKEND INTEGRATION TESTS ---');

  // Test 1: Health Check
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    console.log('✅ Test 1: Health Check - Passed', data);
  } catch (err) {
    console.error('❌ Test 1: Health Check - Failed (Is the backend server running?)');
    process.exit(1);
  }

  // Test 2: Standard Login Validation
  let userToken = '';
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '9000000002', password: 'User1234' })
    });
    const data = await res.json();
    const token = data.data?.token ?? data.token;
    if (res.status === 200 && token) {
      userToken = token;
      console.log('✅ Test 2: Standard user login - Passed. Token generated.');
    } else {
      throw new Error(JSON.stringify(data));
    }
  } catch (err) {
    console.error('❌ Test 2: Standard user login - Failed', err.message);
    process.exit(1);
  }

  // Test 3: Unauthenticated API Guard
  try {
    const res = await fetch(`${BASE_URL}/api/submission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sapCode: 'SAP999', mobileNumber: '9876543210' })
    });
    if (res.status === 401) {
      console.log('✅ Test 3: Unauthenticated API guard - Passed (Correctly returned 401 Unauthorized)');
    } else {
      throw new Error(`Expected 401, got ${res.status}`);
    }
  } catch (err) {
    console.error('❌ Test 3: Unauthenticated API guard - Failed', err.message);
    process.exit(1);
  }

  // Test 4: Validation Guard for bad payloads
  try {
    const res = await fetch(`${BASE_URL}/api/submission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ sapCode: '', mobileNumber: '12345' }) // Bad mobile format, empty SAP
    });
    const data = await res.json();
    if (res.status === 400 && data.error === 'Validation failed') {
      console.log('✅ Test 4: Request payload Zod validation - Passed (Correctly rejected bad payload)');
    } else {
      throw new Error(`Expected 400 with validation errors, got ${res.status}`);
    }
  } catch (err) {
    console.error('❌ Test 4: Request payload Zod validation - Failed', err.message);
    process.exit(1);
  }

  // Test 5: Submission flow and external API proxy routing
  try {
    console.log('Running Test 5: Simulating API submission. Calling backend proxy...');
    const res = await fetch(`${BASE_URL}/api/submission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ sapCode: 'SAP0012', mobileNumber: '9988776655' })
    });
    const data = await res.json();
    if (res.status === 201 && data.pwaUrl) {
      console.log('✅ Test 5: Submission & external API routing - Passed. Extracted PWA URL:', data.pwaUrl);
    } else {
      console.log(`⚠️ Test 5 Note: Submission endpoint returned status ${res.status}. Data:`, data);
    }
  } catch (err) {
    console.error('❌ Test 5: Submission endpoint exception - Failed', err.message);
  }

  // Test 6: Internal API protection guard
  try {
    const res = await fetch(`${BASE_URL}/api/internal/users`);
    if (res.status === 403) {
      console.log('✅ Test 6: Admin endpoints protection - Passed (Correctly returned 403 Forbidden without token)');
    } else {
      throw new Error(`Expected 403, got ${res.status}`);
    }
  } catch (err) {
    console.error('❌ Test 6: Admin endpoints protection - Failed', err.message);
    process.exit(1);
  }

  // Test 7: Admin API authorization (using pre-shared x-admin-token)
  try {
    const res = await fetch(`${BASE_URL}/api/internal/users`, {
      headers: { 'x-admin-token': 'humbee-admin-secret-key-123-token' }
    });
    const data = await res.json();
    if (res.status === 200 && Array.isArray(data)) {
      console.log(`✅ Test 7: Admin authorization with header - Passed. Fetched ${data.length} SQLite user accounts.`);
    } else {
      throw new Error(`Expected 200 array, got ${res.status}`);
    }
  } catch (err) {
    console.error('❌ Test 7: Admin authorization with header - Failed', err.message);
    process.exit(1);
  }

  console.log('--- ALL SYSTEM VERIFICATION TESTS RUN COMPLETED ---');
}

runTests();
