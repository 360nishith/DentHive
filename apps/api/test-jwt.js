// Test: decode a live token and check if our JWT secret can verify it
const jwt = require('jsonwebtoken');

// This is the JWT secret from our .env
const secret = 'sb_secret_QLI96vmqCmGOiN9T_BqHYA_O7TNsvEs';

// To test, paste a real token from your browser here:
// 1. Open browser devtools (F12)
// 2. Go to Application > Local Storage > your site
// 3. Find any key containing "supabase" and copy the access_token value
// 4. Paste it below between the quotes

const TOKEN_FROM_BROWSER = process.argv[2];

if (!TOKEN_FROM_BROWSER) {
  console.log('Usage: node test-jwt.js <your-access-token>');
  console.log('\nHow to get your token:');
  console.log('1. Open browser DevTools (F12)');
  console.log('2. Go to Application > Local Storage');
  console.log('3. Find a key like "sb-...-auth-token"');
  console.log('4. Copy the access_token value');
  console.log('5. Run: node test-jwt.js <paste-token-here>');
  process.exit(0);
}

// First just decode it (no verification) to see the payload
try {
  const decoded = jwt.decode(TOKEN_FROM_BROWSER, { complete: true });
  console.log('\n=== JWT HEADER ===');
  console.log(JSON.stringify(decoded.header, null, 2));
  console.log('\n=== JWT PAYLOAD ===');
  console.log(JSON.stringify(decoded.payload, null, 2));
  console.log('\n=== KEY FIELDS ===');
  console.log('sub (userId):', decoded.payload.sub);
  console.log('tenantId in app_metadata:', decoded.payload.app_metadata?.tenantId);
  console.log('role in app_metadata:', decoded.payload.app_metadata?.role);
  console.log('expires at:', new Date(decoded.payload.exp * 1000).toLocaleString());
} catch (e) {
  console.error('Failed to decode token:', e.message);
}

// Now try to verify it
try {
  const verified = jwt.verify(TOKEN_FROM_BROWSER, secret);
  console.log('\n✅ JWT VERIFIED SUCCESSFULLY with our secret!');
} catch (e) {
  console.log('\n❌ JWT VERIFICATION FAILED:', e.message);
  console.log('This means the SUPABASE_JWT_SECRET in .env is WRONG.');
  console.log('You need to get the correct JWT secret from:');
  console.log('Supabase Dashboard -> Settings -> API -> JWT Secret');
}
