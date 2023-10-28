import React from 'react';

import { useNetwork } from 'wagmi';
import { MintNew } from '../components/MintNew.js';

export function Home() {
  const { chain } = useNetwork();
  return (<>
    <fieldset>
    <p>Create your own lottery as an NFT!</p>
    <p>No middle-men, no extra fees, just ticket money goes into the pot and winners/recipients collect at the end time. Randomness provided by Chainlink VRF.</p>
    <p>Also, you can choose to have your lottery allow only one ticket per person using the Coinpassport integration.</p>
    </fieldset>
    {chain ? <MintNew /> : <>
      <iframe
       width="100%"
       height="576"
       src="https://www.youtube.com/embed/7Pc8Xxk4GaM"
       title="YouTube video player"
       frameborder="0"
       allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
       allowfullscreen>
      </iframe>
    </>}
  </>);
}

