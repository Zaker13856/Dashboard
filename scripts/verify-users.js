
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yhkzkpntfkzcktxdceri.supabase.co';
const supabaseServiceKey = 'sb_secret_i3E-N5nZRE00sU8oLDbQKA_DZ9BvH1S';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyUsers() {
  console.log('Fetching users from Supabase Auth...');
  
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Failed to fetch users:', error.message);
      return;
    }
    
    console.log(`\n✅ Successfully fetched users. Total Count: ${users.length}\n`);
    
    let adminCount = 0;
    let consultantCount = 0;

    users.forEach((user, index) => {
      const role = user.user_metadata?.role || 'None';
      if (role === 'admin') adminCount++;
      if (role === 'consultant') consultantCount++;

      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${role}`);
      console.log(`   Created At: ${new Date(user.created_at).toLocaleString()}`);
      console.log('----------------------------------------');
    });

    console.log(`\nVerification Summary:`);
    console.log(`Total Users: ${users.length} (Expected: 14)`);
    console.log(`Admins: ${adminCount} (Expected: 1)`);
    console.log(`Consultants: ${consultantCount} (Expected: 13)`);

  } catch (err) {
    console.error('❌ Unexpected error during verification:', err);
  }
}

verifyUsers();
