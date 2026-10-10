'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ProjectTasksRedirect() {
  const params = useParams();
  const router = useRouter();
  
  useEffect(() => {
    router.replace(`/projects/${params.id}`);
  }, [params.id, router]);

  return (
    <div className="flex-1 bg-gray-950 flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
    </div>
  );
}
