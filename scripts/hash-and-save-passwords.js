
/**
 * DOCUMENTATION ONLY
 * 
 * This script is no longer used for password hashing.
 * Password setup and hashing for the consultants table is now handled via the web UI.
 * 
 * Please visit:
 * http://localhost:3000/setup
 * 
 * The /setup route in the application uses the src/pages/SetupPage.jsx component
 * to securely hash passwords using bcryptjs in the browser and update the 
 * Supabase 'consultants' table directly.
 * 
 * IMPORTANT: Ensure you have the correct permissions set in Supabase RLS policies
 * to allow updates to the 'consultants' table during the setup phase.
 */

console.log('NOTICE: This script is deprecated.');
console.log('Please use the browser-based setup at /setup instead.');
