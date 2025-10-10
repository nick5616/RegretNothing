import { useState, useEffect } from 'react';

export default function useUser() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const session = await response.json();
          setData(session?.user || null);
        } else {
          setData(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const refetch = async () => {
    setLoading(true);
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
    });
    
    if (response.ok) {
      const session = await response.json();
      setData(session?.user || null);
    } else {
      setData(null);
    }
    setLoading(false);
  };

  return { data, loading, refetch };
}