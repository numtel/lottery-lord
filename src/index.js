import { Buffer } from 'buffer';
import React from 'react';
import ReactDOM from 'react-dom/client';
import Linkify from 'react-linkify';

import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { mainnet, polygon, goerli, optimism,/* arbitrum,*/ polygonMumbai } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';

import { Router } from './Router.js';
import '@rainbow-me/rainbowkit/styles.css';
import './styles.css';


const { chains, publicClient } = configureChains(
  [mainnet, optimism, goerli, polygon, {...polygonMumbai, rpcUrls: {
    public: { http: ['https://rpc.ankr.com/polygon_mumbai'] },
    default: { http: ['https://rpc.ankr.com/polygon_mumbai'] },
  }}],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'Lotto Launcha',
  projectId: 'cab9766bcaeb19d8b10cb26e4534b61e',
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
    <div id="bg"></div>
    <div id="rightbar">Play Responsibly</div>
    <div id="leftbar">clonk.me</div>
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains}>
        <Router />
      </RainbowKitProvider>
    </WagmiConfig>
  </React.StrictMode>
);


function LinkComponent(decoratedHref, decoratedText, key) {
  return (<a href={decoratedHref} target="_blank" rel="noreferrer" key={key}>{decoratedText}</a>);
}
Linkify.defaultProps.componentDecorator = LinkComponent;
