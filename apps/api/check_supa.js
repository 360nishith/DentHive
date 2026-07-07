const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://myzxrfqwmnpukzuzyevd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15enhyZnF3bW5wdWt6dXp5ZXZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI4MTAyMiwiZXhwIjoyMDk3ODU3MDIyfQ.Tj0-MVdFDXmVUZh-Gv3_fv1pi28xFITod7crKRZ15wo'
);

async function main() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) console.error(error);
  
  users.forEach(u => {
    console.log(`Email: ${u.email}`);
    console.log(`  App Meta:`, u.app_metadata);
  });
}
main();
