import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Outlet, Link } from "react-router-dom";

export function Layout() {
  return (<>
    <header>
      <Link to="/"><h1>Lotto Launcha</h1></Link>
      <ConnectButton />
    </header>
    <main>
      <Outlet />
    </main>
  </>);
}

