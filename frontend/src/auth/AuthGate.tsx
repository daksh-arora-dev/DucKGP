import { useEffect, useState } from 'react';

import App from '../App';
import Login from './Login';
import ProfileSetup from './ProfileSetup';

import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';

type ProfileStatus =
  | 'loading'
  | 'incomplete'
  | 'complete'
  | 'error';

interface ProfileCheck {
  userId: string;
  status: ProfileStatus;
  error?: string;
}

export default function AuthGate() {

  const { session, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<ProfileCheck | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const userId = session?.user.id;

  useEffect(() => {

    if (!userId) return;

    let cancelled = false;

    setProfile({
      userId,
      status: 'loading',
    });

    async function checkProfile() {

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (cancelled) return;

        if (error) throw error;

        setProfile({
          userId: userId!,
          status: data ? 'complete' : 'incomplete',
        });

      } catch (err) {

        if (cancelled) return;

        setProfile({
          userId: userId!,
          status: 'error',
          error: err instanceof Error
            ? err.message
            : 'Unable to load profile',
        });
      }
    }

    checkProfile();

    return () => {
      cancelled = true;
    };

  }, [userId, retryCount]);


  // 1. Authentication is loading
  if (authLoading) {
    return <div className="auth-page">Checking authentication...</div>;
  }

  // 2. Not authenticated
  if (!session || !userId) {
    return <Login />;
  }

  // 3. Profile check has not completed
  const currentProfile =
    profile?.userId === userId ? profile : null;

  if (!currentProfile || currentProfile.status === 'loading') {
    return <div className="auth-page">Loading student profile...</div>;
  }

  // 4. Database error
  if (currentProfile.status === 'error') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h2>Unable to load your profile</h2>
          <p className="auth-error">{currentProfile.error}</p>

          <button onClick={() => setRetryCount((n) => n + 1)}>
            Retry
          </button>

          <button onClick={() => supabase.auth.signOut()}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // 5. Profile does not exist
  if (currentProfile.status === 'incomplete') {
    return (
      <ProfileSetup
        userId={userId}
        onComplete={() => {
          setProfile({
            userId,
            status: 'complete',
          });
        }}
      />
    );
  }

  // 6. Authentication and profile both exist
  return <App key={userId} />;
}