import { NextResponse } from 'next/server';

export async function GET() {
  // 데스크톱 에이전트가 폴링할 엔드포인트 스텁
  return NextResponse.json({
    tasks: [],
    timestamp: new Date().toISOString()
  });
}
