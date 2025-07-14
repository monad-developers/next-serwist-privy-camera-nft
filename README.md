# Next.js 14 + Privy + Serwist + Camera NFT

A modern, full-stack Progressive Web Application built with Next.js 14, featuring Web3 authentication with Privy, camera photo NFT minting, and offline capabilities powered by Serwist.

## 🚀 Features

- **📸 Camera NFT Minting**: Capture photos with your camera and mint them as NFTs on Monad testnet
- **🔐 Web3 Authentication**: Seamless wallet connection and user authentication using Privy
- **🌐 IPFS Storage**: Decentralized storage for images and metadata via Pinata
- **📱 Progressive Web App**: Full PWA capabilities with offline support via Serwist
- **🔔 Push Notifications**: Web push notifications for user engagement
- **🌙 Dark/Light Mode**: Responsive design with theme support
- **📱 Mobile-First**: Optimized for mobile devices with install prompts
- **⚡ Modern Stack**: Built with Next.js 14, TypeScript, and Tailwind CSS

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Web3**: Privy, Wagmi, Viem, Monad Testnet
- **NFT Storage**: IPFS via Pinata
- **Camera**: MediaDevices API, Canvas API
- **PWA**: Serwist (Service Worker)
- **State Management**: TanStack Query
- **Notifications**: Web Push API

## 📋 Prerequisites

Before you begin, ensure you have the following:

- Node.js (v18 or higher)
- npm or yarn
- A Privy account and App ID from [privy.io](https://privy.io)
- A Pinata account and JWT token from [pinata.cloud](https://pinata.cloud)
- MON tokens for gas fees on Monad testnet
- A device with camera access (for NFT minting)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd next14-privy-serwist-camera-nft
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
# Option 1: Copy from example (if .env.example exists)
cp .env.example .env.local

# Option 2: Create manually
touch .env.local
```

Add the following environment variables to your `.env.local` file:

```env
# Privy 
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
NEXT_PUBLIC_PRIVY_CLIENT_ID= # optional, you can leave this empty

# Web Push
WEB_PUSH_EMAIL=user@example.com
WEB_PUSH_PRIVATE_KEY=your_vapid_private_key
NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY=your_vapid_public_key

# Pinata Configuration (Required for IPFS - get from Pinata Dashboard)
PINATA_JWT=your_pinata_jwt_token_here

# NFT Contract Configuration (Required after deployment)
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=your_deployed_contract_address_her
```

> **Important**: Replace all placeholder values with your actual credentials. Follow the steps below to obtain these values before running the application.

### 4. Generate VAPID Keys

Generate VAPID keys for web push notifications:

```bash
npx web-push generate-vapid-keys --json
```

Copy the generated keys to your `.env.local` file.

### 5. Get Privy App ID

1. Visit [privy.io](https://privy.io) and create an account
2. Create a new app, choose Web as the Platform and create the app
3. Right after creating the app, copy the App ID
3. Add the App ID to your `.env.local` file

## 📸 Camera NFT Setup

### Configure Pinata for IPFS

1. Sign up at [Pinata](https://app.pinata.cloud/)
2. Go to API Keys section
3. Generate a new JWT token with permissions:
   - ✅ **pinFileToIPFS** (required for uploading files)
   - ✅ **pinJSONToIPFS** (required for uploading metadata)
4. Add it to your `.env.local` file as `PINATA_JWT`

### Deploy NFT Contract

Deploy the provided `contracts/PhotoNFT.sol` contract to Monad testnet using Remix IDE or Hardhat/Foundry:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract PhotoNFT is ERC721 {
    uint256 private _nextTokenId;
    mapping(uint256 => string) private _tokenURIs;
    
    constructor() ERC721("Camera Photo NFT", "PHOTO") {
        _nextTokenId = 1;
    }
    
    function mint(address to, string memory uri) public {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = uri;
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }
}
```

#### Deployment Options:

**Option A: Using Remix IDE**
1. Go to [Remix IDE](https://remix.ethereum.org/)
2. Create a new file and paste the contract code
3. Compile the contract (Solidity version `^0.8.19`)
4. Connect to Monad testnet via MetaMask
5. Deploy the contract
6. Copy the deployed contract address

**Option B: Using Hardhat/Foundry**
1. Set up a deployment script
2. Configure Monad testnet in your config
3. Deploy using your preferred tool

- [Foundry Deployment Guide](https://docs.monad.xyz/guides/deploy-smart-contract/foundry)
- [Hardhat Deployment Guide](https://docs.monad.xyz/guides/deploy-smart-contract/hardhat)

### Update Contract Address

After deploying your contract, update the `.env.local` file:

```env
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0xYourActualContractAddress
```

## 🏃‍♂️ Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Production Mode

For full PWA functionality (including install prompts):

```bash
npm run build && npm run start
```

> **Note**: The install app button only works in production mode (`npm run build && npm run start`)

## 📱 PWA Features

### Installation

- **Desktop**: Install button appears in supported browsers
- **Mobile**: Add to Home Screen prompts on iOS/Android
- **Offline**: Service worker enables offline functionality

### Push Notifications

The app includes web push notification capabilities for user engagement and updates.

## 🔔 Notification Setup

> [!IMPORTANT]
> **Enable notifications for the best experience!**
> 
> To receive push notifications from this app, you need to enable notifications in your browser and/or system settings:

### Browser Settings

**Chrome/Edge:**
1. Click the lock icon 🔒 in the address bar
2. Set "Notifications" to "Allow"
3. Or go to Settings → Privacy and security → Site Settings → Notifications

**Firefox:**
1. Click the shield icon 🛡️ in the address bar
2. Turn off "Enhanced Tracking Protection" for this site (if needed)
3. Allow notifications when prompted
4. Or go to Settings → Privacy & Security → Permissions → Notifications

**Safari:**
1. Go to Safari → Settings → Websites → Notifications
2. Find your site and set it to "Allow"

### System Settings

**macOS:**
1. System Preferences → Notifications & Focus
2. Find your browser and ensure notifications are enabled
3. Check "Allow notifications from websites" in browser settings

**Windows:**
1. Settings → System → Notifications & actions
2. Ensure your browser can send notifications
3. Check browser notification settings

**iOS:**
1. Settings → Notifications → [Your Browser]
2. Enable "Allow Notifications"
3. Also enable in browser settings

**Android:**
1. Settings → Apps → [Your Browser] → Notifications
2. Enable notifications
3. Check browser notification permissions

### 🔧 Backend Integration Required

> [!NOTE]
> **The `SendNotification.tsx` component is sample code** that requires backend implementation:
> 
> - **Save subscription data** when users subscribe (see TODO comments in code)
> - **Delete subscription data** when users unsubscribe  
> - **Implement `/notification` endpoint** to send actual push notifications
> - **Use `web-push` library** or similar for server-side notification delivery

### 🎨 Customizing Notification Content

To customize your push notification content, edit `app/notification/route.ts` and modify the `title`, `message`, `icon`, and other properties in the `sendNotification` call.

## Changing the app name

- Edit the `manifest.json` file
- Change the `name` and `short_name` fields
- Run `npm run build` to update the app

## 🔧 Project Structure

```
next14-privy-serwist-camera-nft/
├── app/
│   ├── components/          # React components
│   │   ├── CameraNFT.tsx   # Camera NFT minting component
│   │   ├── InstallPWA.tsx  # PWA install prompt
│   │   ├── UseLoginPrivy.tsx # Privy authentication
│   │   └── ...
│   ├── api/
│   │   └── upload-ipfs/    # IPFS upload API route
│   ├── ~offline/           # Offline page
│   └── ...
├── contracts/
│   └── PhotoNFT.sol       # NFT smart contract
├── public/                 # Static assets
└── ...
```

## 🔗 Key Components

- **CameraNFT**: Complete camera capture and NFT minting functionality
- **UseLoginPrivy**: Privy authentication integration with Monad testnet
- **InstallPWA**: PWA installation prompts
- **upload-ipfs API**: Handles file uploads to IPFS via Pinata

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Join [Monad Dev Discord](https://discord.gg/monaddev)
2. Review the [Privy](https://privy.io/) documentation
3. Check the [Pinata](https://docs.pinata.cloud/) documentation
4. Visit [Monad Explorer](https://explorer.monad.xyz/) to view transactions
5. Check the [Next.js 14](https://nextjs.org/) documentation
6. Check the [Serwist](https://serwist.pages.dev/) documentation
