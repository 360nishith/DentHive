const jwt = require('jsonwebtoken');
const axios = require('axios');

async function main() {
  const secret = 'sb_secret_QLI96vmqCmGOiN9T_BqHYA_O7TNsvEs';
  
  // Generate a fake token for the tenant ID from our previous DB query
  const token = jwt.sign(
    { 
      sub: 'test-user',
      authId: 'test-auth',
      tenantId: '2206a6ee-213a-4817-9839-18f7d29f4cbb',
      role: 'ADMIN_DOCTOR'
    }, 
    secret, 
    { expiresIn: '1h' }
  );

  try {
    const stageId = 'eafbcda5-0f80-488d-90b3-ebcac9df4284'; // The stage with 8 images
    const res = await axios.post(`https://denthive-api.onrender.com/api/stages/${stageId}/images`, { imageUrl: 'test' }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('STATUS:', res.status);
    console.log('DATA TYPE:', typeof res.data);
    console.log('IS ARRAY?', Array.isArray(res.data));
    console.log('DATA LENGTH:', res.data?.length);
    console.log('DATA:', res.data);
  } catch (err) {
    console.error('ERROR STATUS:', err.response?.status);
    console.error('ERROR DATA:', err.response?.data);
    console.error('ERROR MESSAGE:', err.message);
  }
}

main();
