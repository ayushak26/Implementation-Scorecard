import { NextResponse } from 'next/server';

const FASTAPI_BASE = process.env.NEXT_PUBLIC_FASTAPI_BASE || "http://backend:8000";

export async function GET() {
  try {
    // Call the backend API to get sheets
    const response = await fetch(`${FASTAPI_BASE}/api/sheets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend failed: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in /api/sheets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sheets from backend' },
      { status: 500 }
    );
  }
}