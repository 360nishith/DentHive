const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://myzxrfqwmnpukzuzyevd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15enhyZnF3bW5wdWt6dXp5ZXZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI4MTAyMiwiZXhwIjoyMDk3ODU3MDIyfQ.Tj0-MVdFDXmVUZh-Gv3_fv1pi28xFITod7crKRZ15wo');
async function test() {
  const { data, error } = await supabase.storage.from('clinical-images').list();
  console.log('List Error:', error);
  console.log('Files:', data?.length);
  if (data && data.length > 0) {
     const testFile = data[0].name;
     console.log('Trying to remove:', testFile);
     const { data: rmData, error: rmErr } = await supabase.storage.from('clinical-images').remove([testFile]);
     console.log('Remove Result:', rmData, rmErr);
  }
}
test();
