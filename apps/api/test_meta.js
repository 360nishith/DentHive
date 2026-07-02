const { PrismaClient } = require('./node_modules/@prisma/client');
const { NestFactory } = require('./node_modules/@nestjs/core');
const { AppModule } = require('./dist/app.module.js');
const { MetaApiService } = require('./dist/modules/whatsapp/services/meta-api.service.js');

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const metaApi = app.get(MetaApiService);
  
  try {
    const response = await metaApi.sendTemplateMessage(
      '094858ec-b61f-4c68-855a-31631d530e83', // tenantId
      '6361953329', // to
      'appointment_reminder',
      'en_US',
      [
        { type: 'body', parameters: [
          { type: 'text', text: 'rahul d' },
          { type: 'text', text: 'adhishree dental' },
          { type: 'text', text: '10:00 AM' }
        ]}
      ]
    );
    console.log('Success:', response);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
  
  await app.close();
}

main();
