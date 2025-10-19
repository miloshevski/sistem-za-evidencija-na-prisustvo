import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint for Docker
 * Used by Docker healthcheck to monitor container status
 */
export async function GET() {
  try {
    // Basic health check - you can add more checks here
    // For example: database connectivity, external API checks, etc.

    const healthInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    };

    return NextResponse.json(healthInfo, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
