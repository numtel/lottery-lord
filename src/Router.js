import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { Layout } from './components/Layout.js';
import { Lotto } from './pages/Lotto.js';
import { User } from './pages/User.js';
import { Home } from './pages/Home.js';

// TODO this should be in a contract config file
const defaultChain = 1;

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index
            element={<Home />}
          />
          <Route
            path="lotto/:chainId/:tokenId"
            element={<Lotto />}
          />
          <Route
            path="u/:address"
            element={<UserProfileRoot />}
          />
          <Route
            path="u/:address/:chainId"
            element={<User />}
          />
          <Route path="*" element={<>nomatch</>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function UserProfileRoot() {
  const { address } = useParams();
  return (<Navigate to={`/u/${address}/${defaultChain}`} />)
}
