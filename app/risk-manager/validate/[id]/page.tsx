'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Redirect validate/[id] to review/[id] — the new unified review flow
export default function ValidateRedirect() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    router.replace(`/risk-manager/review/${id}`);
  }, [id, router]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
      Redirecting to review...
    </div>
  );
}
