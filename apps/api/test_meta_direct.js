const axios = require('axios');
require('dotenv').config();

async function testMeta() {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!token || !phoneId) {
      console.log('No token or phone ID found in .env');
      return;
    }

    const response = await axios.post(
      https://graph.facebook.com/v18.0/${phoneId}/messages,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '916361953329', // the test number from the DB
        type: 'template',
        template: {
          name: 'appointment_reminder',
          language: { code: 'en_US' },
          components: [
            { type: 'body', parameters: [
              { type: 'text', text: 'Rahul' },
              { type: 'text', text: 'Adhishree Dental' },
              { type: 'text', text: '10:00 AM' }
            ]}
          ]
        }
      },
      {
        headers: {
          Authorization: Bearer ,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Meta API Error:', JSON.stringify(error.response?.data || error.message, null, 2));
  }
}
testMeta();
