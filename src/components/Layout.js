import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Outlet, Link } from "react-router-dom";

export function Layout() {
  return (<>
    <header>
      <Link to="/"><h1><span className="ball">L</span><span className="ball">o</span><span className="ball">t</span><span className="ball">t</span><span className="ball">o</span><span className="launcha">Launcha</span></h1></Link>
      <div id="connect">
        <ConnectButton />
      </div>
    </header>
    <main>
      <Outlet />
    </main>
  </>);
}

