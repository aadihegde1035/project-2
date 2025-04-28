import { supabase } from '../lib/supabase';
import { User } from '../types/user';

export async function createUser(userData: Partial<User> & { password: string }) {
  try {
    // Create the auth user with email confirmation disabled
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email!,
      password: userData.password,
      options: {
        data: {
          username: userData.username,
          name: userData.name,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Create regular user record
    const { error: userError } = await supabase
      .from('regular_users')
      .insert({
        id: authData.user.id,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        date_of_birth: userData.date_of_birth,
        password_hash: 'DEPRECATED' // Required by schema but not used
      });

    if (userError) {
      // If regular_users insert fails, clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw userError;
    }

    // Sign in the user immediately after signup
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.email!,
      password: userData.password,
    });

    if (signInError) throw signInError;

    return authData.user;
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw error;
  }
}