import React from 'react';

import { MintNew } from '../components/MintNew.js';

export function Home() {
  return (<>
    <fieldset>
    <p>Create your own lottery as an NFT!</p>
    <p>No middle-men, no extra fees, just ticket money goes into the pot and winners/recipients collect at the end time.</p>
    </fieldset>
    <MintNew />
  </>);
}

