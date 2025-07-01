import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file = data.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file found' }, { status: 400 });
    }

    if (!process.env.PINATA_JWT) {
      return NextResponse.json({ error: 'Pinata JWT not configured' }, { status: 500 });
    }

    // Upload to Pinata using their API
    const pinataData = new FormData();
    pinataData.append('file', file);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`,
      },
      body: pinataData,
    });

    if (!response.ok) {
      throw new Error(`Pinata API error: ${response.status}`);
    }

    const result = await response.json();
    
    return NextResponse.json({ 
      ipfsHash: result.IpfsHash,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
      success: true 
    });
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    return NextResponse.json(
      { error: 'Failed to upload to IPFS' }, 
      { status: 500 }
    );
  }
} 