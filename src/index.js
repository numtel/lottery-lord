import { Buffer } from 'buffer';
import React from 'react';
import ReactDOM from 'react-dom/client';

import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { mainnet, polygon, goerli, optimism,/* arbitrum,*/ polygonMumbai } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';

import { Router } from './Router.js';
import '@rainbow-me/rainbowkit/styles.css';


const { chains, publicClient } = configureChains(
  [mainnet, optimism, goerli, polygon, {...polygonMumbai, rpcUrls: {
    public: { http: ['https://rpc.ankr.com/polygon_mumbai'] },
    default: { http: ['https://rpc.ankr.com/polygon_mumbai'] },
  }}],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'Lotto Launcha',
  // TODO get walletconnect projectId
  projectId: 'xxx',
  chains
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient
});

window.Buffer = window.Buffer || Buffer;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains}>
        <Router />
      </RainbowKitProvider>
    </WagmiConfig>
  </React.StrictMode>
);

