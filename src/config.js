/**
 * ddrReader - Default Application & Database Configuration
 * If you want every new device that visits your site to automatically connect
 * to your Supabase project without scanning a QR code or entering keys,
 * you can optionally set your Supabase URL & Anon Key here.
 */

export const DEFAULT_CONFIG = {
  // Set to true and fill in credentials to enable automatic connection for all devices
  autoConnectSupabase: false,
  supabaseUrl: '',
  supabaseKey: '',
  syncUserId: 'ddr_master_user'
};
