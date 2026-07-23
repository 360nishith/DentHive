const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://myzxrfqwmnpukzuzyevd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15enhyZnF3bW5wdWt6dXp5ZXZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI4MTAyMiwiZXhwIjoyMDk3ODU3MDIyfQ.Tj0-MVdFDXmVUZh-Gv3_fv1pi28xFITod7crKRZ15wo');
async function clearBucket() {
  const { data, error } = await supabase.storage.from('clinical-images').list();
  if (error) {
    console.error('List Error:', error);
    return;
  }
  console.log('Total files:', data.length);
  if (data.length > 0) {
     const filenames = data.map(f => f.name);
     console.log('Removing files:', filenames);
     const { error: rmErr } = await supabase.storage.from('clinical-images').remove(filenames);
     if (rmErr) console.error('Remove Error:', rmErr);
     else console.log('Successfully removed all files.');
  }
}
clearBucket();
