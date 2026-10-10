'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SocketProvider } from '@/lib/socket';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30, // 30 seconds
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <html lang="en" className="dark">
      <head>
        <title>OfficeOrbit | Collaborative Project Management Platform</title>
        <meta name="description" content="Multi-user real-time collaborative project management platform with Optimistic Concurrency Control" />
      </head>
      <body className="bg-gray-950 text-gray-100 antialiased min-h-screen">
        <QueryClientProvider client={queryClient}>
          <SocketProvider>{children}</SocketProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
