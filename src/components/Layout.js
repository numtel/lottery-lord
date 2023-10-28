import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Outlet, Link } from "react-router-dom";

export function Layout() {
  return (<>
    <div id="starbox">
      <div id="stars"></div>
      <div id="stars2"></div>
      <div id="stars3"></div>
    </div>
    <header className="ticket-panel">
      <div className="bg"></div>
      <div className="rightbar">Play Responsibly&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Play Responsibly&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Play Responsibly&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
      <div className="leftbar">clonk.me&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;clonk.me&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;clonk.me&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
      <Link to="/"><h1><span className="ball">L</span><span className="ball">o</span><span className="ball">t</span><span className="ball">t</span><span className="ball">o</span><span className="launcha">Launcha</span></h1></Link>
    </header>
    <main>
      <div id="connect">
        <ConnectButton />
      </div>
      <Outlet />
    </main>
  </>);
}

