import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Linkify from 'react-linkify';
import { useContractReads } from 'wagmi';
import { isAddressEqual } from 'viem';
import { chainContracts} from '../contracts.js';
import PieChart from '../components/PieChart.js';
import { DisplayAddress } from '../components/DisplayAddress.js';
import { TokenDetails } from '../components/TokenDetails.js';
import { Remaining } from '../components/Remaining.js';

const F16n = 0xffffffffffffffffn;

export function Lotto() {
  const { chainId, collection, tokenId } = useParams();
  const contracts = chainContracts(chainId);
  // TODO this could support multiple lottery contracts
  const isKnownLotto = isAddressEqual(contracts.LotteryERC721.address, collection);


  const { data, isError, isLoading } = useContractReads({
    contracts: [
      {
        ...contracts.LotteryERC721,
        functionName: 'configs',
        args: [ tokenId ],
      },
      {
        ...contracts.LotteryERC721,
        functionName: 'ticketsSold',
        args: [ tokenId ],
      },
      {
        ...contracts.LotteryERC721,
        functionName: 'lotteryStatus',
        args: [ tokenId ],
      },
      {
        ...contracts.LotteryERC721,
        functionName: 'lotteryShares',
        args: [ tokenId ],
      },
      {
        ...contracts.LotteryERC721,
        functionName: 'numberOfWinners',
        args: [ tokenId ],
      },
    ],
  });

  if(!isKnownLotto) {
    return (<p>Unknown Lottery Contract</p>);
  }

  if(isLoading) {
    return (<p>Loading lottery details...</p>);
  }

  if(isError) {
    return (<p>Error loading lottery details!</p>);
  }

  const validator = contracts.validators.filter(x =>
    isAddressEqual(x.address, data[0].result[5]));

  return (<>
    <h1>{data[0].result[0]}</h1>
    <p><Linkify>{data[0].result[1]}</Linkify></p>
    <div id="share-config">
      <PieChart data={data[3].result.map(share => [
        isWinner(share.recipient) ? 0 : share.recipient,
        share.share
      ])} />
      <div className="shares">
        {data[3].result.map((share, index) => (
          <div className="share" key={index}>
            {(Number(((share.share * 1000n) / F16n).toString(10))/10).toFixed(1)}% to&nbsp;
            {isWinner(share.recipient) ? 'random winner' : (<DisplayAddress value={share.recipient} {...{contracts}} />)}
          </div>
        ))}
      </div>
    </div>
    <dl>
      <dt>Ticket Price</dt>
      <dd><TokenDetails {...{contracts}} address={data[0].result[3]} amount={data[0].result[2]} /></dd>
      <dt>End Time</dt>
      <dd>{(new Date(Number(data[0].result[4]) * 1000)).toLocaleString()}</dd>
      <dt>Ticket Validation</dt>
      <dd className="validators">{validator.length === 1 ? (<>
        <span className="name">{validator[0].name}</span>
        <span className="description"><Linkify>{validator[0].description}</Linkify></span>
      </>) : (
        <span className="unknown">Unknown validator: <DisplayAddress value={data[0].result[5]} {...{contracts}} /></span>
      )}</dd>
      <dt>Number of Winners</dt>
      <dd>{data[4].result[0].toString()}</dd>
      <dt>Tickets Sold</dt>
      <dd>{data[1].result.toString()}</dd>
      <dt>Lottery Status</dt>
      <dd><LotteryStatus {...{data}} /></dd>
    </dl>

  </>);
}

function LotteryStatus({ data }) {
  const [, setCount] = useState(0);

  // This effect will run after the initial render
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Update the count every second
      setCount(prevCount => prevCount + 1);
    }, 1000);

    // Clean up the interval when the component unmounts
    return () => {
      clearInterval(intervalId);
    };
  }, []); // The empty dependency array ensures the effect runs once on mount

  return (<>
    {data[2].result === 0 ? Number(data[0].result[4]) * 1000 > Date.now() ?
        (<span>Ticket sales open for <Remaining value={Number(data[0].result[4])} /></span>) :
        (<span>Ticket sales ended, awaiting processing...</span>) :
        data[2].result === 1 ?
          (<span>Processing begun, awaiting random values or final processing</span>) :
          (<span>Lottery completed!</span>)}
  </>);
}

function isWinner(addr) {
  return Number(addr) < 100;
}
