require("dotenv").config({ path: "../../.env" });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const users = await prisma.user.findMany({
    include: { role: true }
  });

  for (const user of users) {
    if (user.authId && user.role) {
      console.log(`Syncing ${user.email} to role ${user.role.name}`);
      await supabase.auth.admin.updateUserById(user.authId, {
        app_metadata: {
          tenantId: user.tenantId,
          role: user.role.name
        }
      });
    }
  }
  console.log("Done");
}

main();
