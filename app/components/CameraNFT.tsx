"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePrivy, useSendTransaction } from "@privy-io/react-auth";
import { encodeFunctionData } from "viem";

// Simple ERC-721 ABI for minting
const NFT_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenURI", type: "string" }
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// NFT contract address from environment variables
const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || "0x1234567890123456789012345678901234567890";

interface CapturedPhoto {
  blob: Blob;
  dataUrl: string;
}

interface MintedNFT {
  transactionHash: string;
  imageIpfsHash: string;
  metadataIpfsHash: string;
  tokenURI: string;
  imageUrl: string;
  mintedAt: string;
}

export default function CameraNFT() {
  const { user } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [mintStatus, setMintStatus] = useState<string>("");
  const [mintedNFT, setMintedNFT] = useState<MintedNFT | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if camera is available
  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setHasCamera(videoDevices.length > 0);
      } catch (error) {
        console.error("Error checking camera:", error);
        setHasCamera(false);
      }
    };
    
    checkCamera();
  }, []);

  const startCamera = async () => {
    console.log("Starting camera...");
    setIsLoading(true);
    
    // First show the video element
    setIsCapturing(true);
    
    // Wait for the video element to render, then get the stream
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
        
        console.log("Got stream:", stream);
        
        if (videoRef.current) {
          console.log("Setting video srcObject...");
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          // Wait a bit then try to play
          setTimeout(() => {
            if (videoRef.current) {
              console.log("Video element state:", {
                videoWidth: videoRef.current.videoWidth,
                videoHeight: videoRef.current.videoHeight,
                readyState: videoRef.current.readyState,
                paused: videoRef.current.paused
              });
              
              videoRef.current.play()
                .then(() => console.log("Video playing successfully"))
                .catch(e => console.log("Play error:", e));
            }
          }, 100);
          
          setIsLoading(false);
          console.log("Camera started!");
        } else {
          console.error("Video ref is still null!");
          setIsLoading(false);
        }
        
      } catch (err) {
        console.error("Camera error:", err);
        alert("Camera access denied or unavailable");
        setIsLoading(false);
        setIsCapturing(false);
      }
    }, 100);
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the video frame to canvas
    context.drawImage(video, 0, 0);
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto({ blob, dataUrl });
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  }, [stopCamera]);

  const uploadToIPFS = useCallback(async (file: Blob): Promise<string> => {
    try {
      setUploadStatus("Uploading to IPFS...");
      
      const formData = new FormData();
      formData.append('file', file, 'photo.jpg');
      
      const response = await fetch('/api/upload-ipfs', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      setUploadStatus("Upload successful!");
      return data.ipfsHash;
    } catch (error) {
      console.error("IPFS upload error:", error);
      setUploadStatus("Upload failed");
      throw error;
    }
  }, []);

  const mintNFT = useCallback(async () => {
    if (!capturedPhoto || !user?.wallet?.address) {
      alert("Please connect wallet and capture a photo first");
      return;
    }

    try {
      setMintStatus("Uploading photo...");
      const ipfsHash = await uploadToIPFS(capturedPhoto.blob);
      
      setMintStatus("Minting NFT...");
      
      // Create metadata
      const metadata = {
        name: `Camera Photo NFT`,
        description: `Photo captured on ${new Date().toISOString()}`,
        image: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        attributes: [
          {
            trait_type: "Capture Date",
            value: new Date().toISOString().split('T')[0]
          }
        ]
      };
      
      // Upload metadata to IPFS
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const metadataHash = await uploadToIPFS(metadataBlob);
      const tokenURI = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;
      
      // Encode the mint function call
      const data = encodeFunctionData({
        abi: NFT_ABI,
        functionName: 'mint',
        args: [user.wallet.address as `0x${string}`, tokenURI],
      });

      // Send the transaction
      const txResult = await sendTransaction({
        to: NFT_CONTRACT_ADDRESS,
        data,
      });
      
      setMintStatus("NFT minted successfully!");
      
      // Store minted NFT details
      const mintedNFTData: MintedNFT = {
        transactionHash: txResult.hash || 'pending',
        imageIpfsHash: ipfsHash,
        metadataIpfsHash: metadataHash,
        tokenURI: tokenURI,
        imageUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        mintedAt: new Date().toISOString()
      };
      
      setMintedNFT(mintedNFTData);
      
      // Reset photo state but keep NFT data
      setTimeout(() => {
        setCapturedPhoto(null);
        setUploadStatus("");
        setMintStatus("");
      }, 3000);
      
    } catch (error) {
      console.error("Minting error:", error);
      setMintStatus("Minting failed");
    }
  }, [capturedPhoto, user?.wallet?.address, uploadToIPFS, sendTransaction]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    setUploadStatus("");
    setMintStatus("");
    setMintedNFT(null);
  }, []);

  if (!user) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            📸 Camera NFT Minting
          </h3>
          <p className="text-slate-600 dark:text-slate-300">
            Please login to access camera and mint NFTs
          </p>
        </div>
      </div>
    );
  }

  if (!hasCamera) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            📸 Camera NFT Minting
          </h3>
          <p className="text-red-600 dark:text-red-400">
            No camera detected. Please ensure your device has a camera and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
        <span className="mr-2">📸</span>
        Camera NFT Minting
      </h3>

      <div className="space-y-4">
        {!isCapturing && !capturedPhoto && (
          <div className="text-center">
            <button
              onClick={startCamera}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {isLoading ? "Starting Camera..." : "Start Camera"}
            </button>
          </div>
        )}

                          {isCapturing && (
           <div className="space-y-4">
              <div className="flex justify-center">
                 <video
                   ref={videoRef}
                   autoPlay
                   playsInline
                   muted
                   style={{
                     width: '400px',
                     height: '300px',
                     backgroundColor: '#000'
                   }}
                   className="rounded-lg border-2 border-blue-500"
                 />
               </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={capturePhoto}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                📷 Capture Photo
              </button>
              <button
                onClick={stopCamera}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {capturedPhoto && (
          <div className="space-y-4">
            <div className="text-center">
              <img
                src={capturedPhoto.dataUrl}
                alt="Captured photo"
                className="w-full max-w-md mx-auto rounded-lg border border-slate-300 dark:border-slate-600"
              />
            </div>
            
            <div className="flex gap-2 justify-center">
              <button
                onClick={mintNFT}
                disabled={!!mintStatus}
                className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                🏷️ Mint as NFT
              </button>
              <button
                onClick={retakePhoto}
                className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                🔄 Retake
              </button>
            </div>

            {uploadStatus && (
              <div className="text-center text-sm text-slate-600 dark:text-slate-300">
                {uploadStatus}
              </div>
            )}

            {mintStatus && (
              <div className={`text-center text-sm font-medium ${
                mintStatus.includes('success') 
                  ? 'text-green-600 dark:text-green-400' 
                  : mintStatus.includes('failed')
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-blue-600 dark:text-blue-400'
              }`}>
                {mintStatus}
              </div>
                         )}
           </div>
         )}

         {mintedNFT && (
           <div className="mt-6 bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
             <h4 className="text-lg font-bold text-green-800 dark:text-green-200 mb-4 flex items-center">
               🎉 NFT Minted Successfully!
             </h4>
             
             <div className="space-y-4">
               <div className="flex justify-center">
                 <img
                   src={mintedNFT.imageUrl}
                   alt="Minted NFT"
                   className="w-48 h-36 object-cover rounded-lg border border-green-300 dark:border-green-700"
                 />
               </div>
               
               <div className="space-y-2 text-sm">
                 <div className="grid grid-cols-1 gap-2">
                   <div>
                     <strong className="text-green-700 dark:text-green-300">Transaction Hash:</strong>
                     <div className="break-all font-mono text-xs bg-white dark:bg-slate-800 p-2 rounded border">
                       <a
                         href={`https://testnet.monadscan.com/tx/${mintedNFT.transactionHash}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="text-blue-600 dark:text-blue-400 hover:underline"
                       >
                         {mintedNFT.transactionHash}
                       </a>
                     </div>
                   </div>
                   
                   <div>
                     <strong className="text-green-700 dark:text-green-300">View on IPFS:</strong>
                     <div className="flex gap-2 flex-wrap">
                       <a
                         href={mintedNFT.imageUrl}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                       >
                         📷 Image
                       </a>
                       <a
                         href={mintedNFT.tokenURI}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                       >
                         📄 Metadata
                       </a>
                     </div>
                   </div>
                   
                   <div className="text-xs text-green-600 dark:text-green-400">
                     Minted on: {new Date(mintedNFT.mintedAt).toLocaleString()}
                   </div>
                 </div>
               </div>
               
               <button
                 onClick={() => setMintedNFT(null)}
                 className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
               >
                 Mint Another NFT
               </button>
             </div>
           </div>
         )}

         <canvas ref={canvasRef} className="hidden" />
       </div>
     </div>
   );
 } 