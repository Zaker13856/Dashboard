
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yhkzkpntfkzcktxdceri.supabase.co';
const supabaseServiceKey = 'sb_secret_i3E-N5nZRE00sU8oLDbQKA_DZ9BvH1S';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const defaultPassword = 'Sistina42@';

const usersToCreate = [
  { email: 'dzaini@isinnova.org', role: 'admin' },
  { email: 'csessa@isinnova.org', role: 'consultant' },
  { email: 'aricci@isinnova.org', role: 'consultant' },
  { email: 'sfaberi@isinnova.org', role: 'consultant' },
  { email: 'renei@isinnova.org', role: 'consultant' },
  { email: 'mgualdi@isinnova.org', role: 'consultant' },
  { email: 'sproletti@isinnova.org', role: 'consultant' },
  { email: 'sgaggi@isinnova.org', role: 'consultant' },
  { email: 'ggiuffre@isinnova.org', role: 'consultant' },
  { email: 'lmarmora@isinnova.org', role: 'consultant' },
  { email: 'lpaolucci@isinnova.org', role: 'consultant' },
  { email: 'ggalvini@isinnova.org', role: 'consultant' },
  { email: 'dcassola@isinnova.org', role: 'consultant' },
  { email: 'vmalcotti@isinnova.org', role: 'consultant' }
];

async function createUsers() {
  console.log('Starting user creation process...');
  
  for (const user of usersToCreate) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { role: user.role }
      });

      if (error) {
        // If user already exists, it might throw an error. We log it.
        console.error(`❌ Failed to create ${user.email}:`, error.message);
      } else {
        console.log(`✅ Successfully created ${user.email} (ID: ${data.user.id}, Role: ${user.role})`);
      }
    } catch (err) {
      console.error(`❌ Unexpected error creating ${user.email}:`, err);
    }
  }
  
  console.log('\nFinished user creation process. Starting verification...');

  try {
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Failed to verify users:', listError.message);
      return;
    }
    
    console.log(`\n✅ Verification: Successfully fetched users. Total Count: ${users.length}\n`);
    
    let adminCount = 0;
    let consultantCount = 0;

    users.forEach((user, index) => {
      const role = user.user_metadata?.role || 'None';
      if (role === 'admin') adminCount++;
      if (role === 'consultant') consultantCount++;

      console.log(`${index + 1}. Email: ${user.email} | Role: ${role} | ID: ${user.id}`);
    });

    console.log(`\nVerification Summary:`);
    console.log(`Total Users in System: ${users.length}`);
    console.log(`Admins found: ${adminCount}`);
    console.log(`Consultants found: ${consultantCount}`);

  } catch (err) {
    console.error('❌ Unexpected error during verification:', err);
  }
}

createUsers();
