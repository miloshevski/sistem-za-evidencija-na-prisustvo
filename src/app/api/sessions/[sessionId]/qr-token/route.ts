import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateQRToken, generateServerNonce } from '@/lib/crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;

    // Verify session exists and is active
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('session_id, is_active')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found or inactive' },
        { status: 404 }
      );
    }

    // Generate new QR token
    const timestamp = Date.now();
    const token = generateQRToken(sessionId, timestamp);
    const serverNonce = generateServerNonce();

    // Token expires in 10 seconds (tokens rotate every 5s, but we give 10s validity)
    const expiresAt = new Date(timestamp + 10000).toISOString();

    // Store token in database
    const { error: insertError } = await supabaseAdmin
      .from('qr_tokens')
      .insert({
        session_id: sessionId,
        token,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('Error storing QR token:', insertError);
    }

    // Clean up expired tokens for this session
    await supabaseAdmin
      .from('qr_tokens')
      .delete()
      .eq('session_id', sessionId)
      .lt('expires_at', new Date().toISOString());

    // Return token with session ID and server nonce embedded
    const qrData = JSON.stringify({
      session_id: sessionId,
      token,
      server_nonce: serverNonce,
      timestamp,
    });

    return NextResponse.json({
      qr_data: qrData,
      expires_in: 10,
    });
  } catch (error) {
    console.error('QR token generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
