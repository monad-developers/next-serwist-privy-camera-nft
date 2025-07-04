"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  useCreateWallet,
  useLogin,
  usePrivy,
  useSendTransaction,
  WalletWithMetadata,
} from "@privy-io/react-auth";
import { createPublicClient, http, formatEther } from "viem";
import { monadTestnet } from "viem/chains";
import { QRCodeSVG } from "qrcode.react";

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

export default function UseLoginPrivy() {
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const { ready, user, logout } = usePrivy();

  const { createWallet: createEthereumWallet } = useCreateWallet();

  const { sendTransaction } = useSendTransaction();

  const ethereumEmbeddedWallets = useMemo<WalletWithMetadata[]>(
    () =>
      (user?.linkedAccounts.filter(
        (account) =>
          account.type === "wallet" &&
          account.walletClientType === "privy" &&
          account.chainType === "ethereum"
      ) as WalletWithMetadata[]) ?? [],
    [user]
  );

  const hasEthereumWallet = ethereumEmbeddedWallets.length > 0;
  const walletAddress = ethereumEmbeddedWallets[0]?.address;

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) return;

    setBalanceLoading(true);
    setBalanceError(false);

    try {
      const balanceWei = await publicClient.getBalance({
        address: walletAddress as `0x${string}`,
      });
      const balanceEth = formatEther(balanceWei);
      setBalance(balanceEth);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalanceError(true);
    } finally {
      setBalanceLoading(false);
    }
  }, [walletAddress]);

  const copyToClipboard = useCallback(async () => {
    if (!walletAddress) return;

    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      fetchBalance();
    }
  }, [walletAddress, fetchBalance]);

  const handleCreateWallet = useCallback(async () => {
    setIsCreating(true);
    try {
      await createEthereumWallet();
    } catch (error) {
      console.error("Error creating wallet:", error);
    } finally {
      setIsCreating(false);
    }
  }, [createEthereumWallet]);

  const onSendTransaction = async () => {
    if (!userAddress) return;

    setTransactionStatus("pending");
    setTransactionHash(null);

    try {
      const result = await sendTransaction({
        to: userAddress,
        value: 1000000000000000,
      });

      setTransactionHash(result.hash);
      setTransactionStatus("success");

      // Refresh balance after successful transaction
      setTimeout(() => {
        fetchBalance();
      }, 3000);
    } catch (error) {
      console.error("Transaction failed:", error);
      setTransactionStatus("error");
    }
  };

  const { login } = useLogin();

  if (!ready) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Privy Wallet
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Connect and manage your embedded wallet
          </p>
        </div>

        {/* Action Buttons Section */}
        <div className="space-y-8">
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => login()}
              disabled={!!user}
              className={`font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md ${
                user
                  ? "bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white hover:shadow-lg"
              }`}
            >
              {user ? "Logged In" : "Login"}
            </button>
            <button
              onClick={logout}
              disabled={!user}
              className={`font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md ${
                !user
                  ? "bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white hover:shadow-lg"
              }`}
            >
              {!user ? "Logged Out" : "Logout"}
            </button>
            <button
              onClick={handleCreateWallet}
              disabled={!user || isCreating || hasEthereumWallet}
              className={`font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md ${
                hasEthereumWallet
                  ? "bg-green-600 dark:bg-green-700 text-white cursor-default"
                  : !user
                  ? "bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed"
                  : isCreating
                  ? "bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white hover:shadow-lg"
              }`}
            >
              {hasEthereumWallet
                ? "✓ Wallet Exists"
                : !user
                ? "Login to Create Wallet"
                : isCreating
                ? "Creating..."
                : "Create Wallet"}
            </button>
          </div>

          {/* Wallet Information Section */}
          {hasEthereumWallet && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center">
                <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                  💳
                </span>
                Embedded Wallet
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Address
                  </label>
                  <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4 flex items-center justify-between gap-3">
                    <span className="font-mono text-sm text-slate-800 dark:text-slate-200 break-all">
                      {walletAddress}
                    </span>
                    <button
                      onClick={copyToClipboard}
                      className="flex-shrink-0 p-2 rounded-md bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-300 transition-colors duration-200"
                      title={copied ? "Copied!" : "Copy address"}
                    >
                      {copied ? "✓" : "📋"}
                    </button>
                  </div>

                  {/* QR Code Section */}
                  <div className="mt-4 flex flex-col items-center">
                    <div className="bg-white p-4 rounded-xl shadow-md">
                      <QRCodeSVG
                        value={walletAddress || ""}
                        size={200}
                        level="H"
                        includeMargin={true}
                        className="w-full h-full"
                      />
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      Scan to send funds to this wallet
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                      Balance
                    </label>
                    <button
                      onClick={fetchBalance}
                      disabled={balanceLoading}
                      title="Refresh balance"
                      className={`p-2 rounded-lg transition-colors duration-200 ${
                        balanceLoading
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                          : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <span className={balanceLoading ? "animate-spin" : ""}>
                        {balanceLoading ? "⟳" : "↻"}
                      </span>
                    </button>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {balanceLoading ? (
                        <span className="text-slate-500 dark:text-slate-400">
                          Loading...
                        </span>
                      ) : balanceError ? (
                        <span className="text-red-600 dark:text-red-400">
                          Error loading balance
                        </span>
                      ) : (
                        `${parseFloat(balance || "0").toFixed(4)} MON`
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Section */}
          {user && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center">
                <span className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
                  💸
                </span>
                Send Transaction
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Recipient Address
                  </label>
                  <input
                    value={userAddress || ""}
                    onChange={(e) => setUserAddress(e.target.value)}
                    placeholder="Enter recipient address"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200 font-mono text-sm"
                  />
                </div>

                <button
                  onClick={onSendTransaction}
                  disabled={
                    !hasEthereumWallet ||
                    !userAddress ||
                    transactionStatus === "pending"
                  }
                  className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors duration-200 ${
                    !hasEthereumWallet ||
                    !userAddress ||
                    transactionStatus === "pending"
                      ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-md hover:shadow-lg"
                  }`}
                >
                  {!hasEthereumWallet
                    ? "Please create a wallet first"
                    : transactionStatus === "pending"
                    ? "Sending..."
                    : "Send 0.001 MON"}
                </button>

                {/* Transaction Status */}
                {transactionStatus !== "idle" && (
                  <div className="mt-4 space-y-2">
                    {transactionStatus === "pending" && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="animate-spin mr-3 w-5 h-5 border-2 border-yellow-500 dark:border-yellow-400 border-t-transparent rounded-full"></div>
                          <span className="text-yellow-800 dark:text-yellow-200 font-medium">
                            Transaction pending...
                          </span>
                        </div>
                      </div>
                    )}

                    {transactionStatus === "success" && transactionHash && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <span className="text-green-800 dark:text-green-200 font-medium mr-2">
                              ✅ Transaction successful!
                            </span>
                          </div>
                          <div className="flex items-center justify-between bg-green-100 dark:bg-green-800/30 rounded-lg p-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                                Transaction Hash:
                              </p>
                              <p className="text-xs font-mono text-green-700 dark:text-green-300 break-all">
                                {transactionHash}
                              </p>
                            </div>
                          </div>
                          <a
                            href={`https://testnet.monadscan.com/tx/${transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                          >
                            View on MonadScan
                            <svg
                              className="ml-2 w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        </div>
                      </div>
                    )}

                    {transactionStatus === "error" && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex items-center">
                          <span className="text-red-800 dark:text-red-200 font-medium">
                            ❌ Transaction failed. Please try again.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* User Information Section */}
          {user && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center">
                <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mr-3">
                  👤
                </span>
                User Information
              </h3>
              <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 overflow-x-auto border dark:border-slate-700">
                <pre className="text-green-400 dark:text-green-300 text-sm font-mono whitespace-pre-wrap">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
