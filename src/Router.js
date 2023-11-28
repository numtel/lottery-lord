import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useParams } from "react-router-dom";
import { Layout } from './components/Layout.js';
import { Lotto } from './pages/Lotto.js';
import { Ticket } from './pages/Ticket.js';
import { User } from './pages/User.js';
import { Home } from './pages/Home.js';
import { defaultChain } from './contracts.js';

export function Router() {
  const router = createBrowserRouter([
    {
      // Small sized lottery previewer
      path: "lotto/:chainId/:collection/:tokenId",
      element: <Ticket />,
      // TODO make a special error that fills screen
      errorElement: <ErrorPage />,
    },
    {
      element: <Layout />,
      children: [
        {
          errorElement: <ErrorPage />,
          children: [
            {
              path: "/",
              element: <Home />,
            },
            {
              path: "details/:chainId/:collection/:tokenId",
              element: <Lotto />,
            },
            {
              path: "u/:address",
              element: <UserProfileRoot />,
            },
            {
              path: "u/:address/:chainId",
              element: <User />,
            },
            {
              path: "*",
              element: <ErrorPage />,
            },
          ],
        },
      ],
    },
  ]);
  return (
    <RouterProvider {...{router}} />
  );
}

function UserProfileRoot() {
  const { address } = useParams();
  return (<Navigate to={`/u/${address}/${defaultChain}`} />)
}

function ErrorPage() {
  return (<p>An error has occurred!</p>);
}
