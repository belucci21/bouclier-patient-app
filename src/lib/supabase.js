import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://rmcsgelrzrupwjbqbdsr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtY3NnZWxyenJ1cHdqYnFiZHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NTc5NTcsImV4cCI6MjA5NTMzMzk1N30.EFghGRrI79YD8a-ZWH3xOQ8hwwDmx5FFkPxxFWLT4NI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
