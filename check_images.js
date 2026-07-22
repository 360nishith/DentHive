const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying treatment_stage_images...');
  const images = await prisma.treatmentStageImage.findMany();
  console.log('Total images in DB:', images.length);
  console.log(images);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
