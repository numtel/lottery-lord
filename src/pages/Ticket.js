import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Linkify from 'react-linkify';
import { useContractReads, useAccount } from 'wagmi';
import { isAddressEqual } from 'viem';
import { chainContracts} from '../contracts.js';
import PieChart from '../components/PieChart.js';
import { DisplayAddress } from '../components/DisplayAddress.js';
import { TokenDetails } from '../components/TokenDetails.js';
import { Remaining } from '../components/Remaining.js';

const F16n = 0xffffffffffffffffn;

export function Ticket() {
  const { address: account } = useAccount();
  const { chainId, collection, tokenId } = useParams();
  const [ showShares, setShowShares ] = useState(false);
  const contracts = chainContracts(chainId);
  // TODO this could support multiple lottery contracts
  const isKnownLotto = isAddressEqual(contracts.LotteryERC721.address, collection);


  const { data, isError, isLoading } = useContractReads({
    contracts: [
      { // 0
        ...contracts.LotteryERC721,
        functionName: 'configs',
        args: [ tokenId ],
      },
      { // 1
        ...contracts.LotteryERC721,
        functionName: 'ticketsSold',
        args: [ tokenId ],
      },
      { // 2
        ...contracts.LotteryERC721,
        functionName: 'lotteryStatus',
        args: [ tokenId ],
      },
      { // 3
        ...contracts.LotteryERC721,
        functionName: 'lotteryShares',
        args: [ tokenId ],
      },
      { // 4
        ...contracts.LotteryERC721,
        functionName: 'numberOfWinners',
        args: [ tokenId ],
      },
      { // 5
        ...contracts.LotteryERC721,
        functionName: 'ticketsBought',
        args: [ tokenId, account ],
      },
      { // 6
        ...contracts.LotteryERC721,
        functionName: 'randomSource',
        args: [],
      },
      { // 7
        ...contracts.LotteryERC721,
        functionName: 'ownerOf',
        args: [ tokenId ],
      },
    ],
    watch: true,
  });

  if(!isKnownLotto) {
    return (<p className="form-status error">Unknown Lottery Contract</p>);
  }

  if(isLoading) {
    return (<p className="form-status">Loading lottery details...</p>);
  }

  if(isError || data[3].status === 'failure' || data[7].status === 'failure') {
    return (<p className="form-status error">Error loading lottery details!</p>);
  }

  return (<>
  <fieldset className={`ticket ${showShares ? 'show-shares' : ''}`}>
    <LotteryStatus {...{data}} />
    <div className="lotto-text">
      <h1>{data[0].result[0]}</h1>
      <p><Linkify>{data[0].result[1]}</Linkify></p>
    </div>
    {data[2].result === 2 ? (
        <LotteryWinners config={data[0].result} shares={data[3].result} {...{chainId, tokenId, contracts}} />
    ) : (
      <div className={`lotto-details`}>
        <div id="share-config">
          <PieChart data={data[3].result.map(share => [
            isWinner(share.recipient) ? 0 : share.recipient,
            share.share
          ])} />
          <div className="shares">
            <button type="button" onClick={() => setShowShares(false)}>
              {data[4].result[0].toString()} winning ticket{data[4].result[0] !== 1n ? 's' : ''}
            </button>
            {data[3].result.map((share, index) => (
              <div className="share" key={index}>
                {(Number(((share.share * 1000n) / F16n).toString(10))/10).toFixed(1)}% to&nbsp;
                {isWinner(share.recipient) ? 'random winner' : (<DisplayAddress value={share.recipient} {...{contracts}} />)}
              </div>
            ))}
          </div>
        </div>
        <div className="description">
          <span className="winner-count">
            <button type="button" onClick={() => setShowShares(true)}>
              {data[4].result[0].toString()} winning ticket{data[4].result[0] !== 1n ? 's' : ''}
            </button>
          </span>
          <span className="ticket-price">
            <TokenDetails {...{contracts}} symbol={true} address={data[0].result[3]} amount={data[0].result[2]} /> each
          </span>
          <span className="tickets-sold">
            {data[1].result.toString()} ticket{data[1].result !== 1n ? 's' : ''} sold
          </span>
          {data[5].result && <>
            <span className="my-tickets">
              {data[5].result.toString()} mine
            </span>
          </>}
          <span className="details">
            <Link target="_blank" to={`/details/${chainId}/${collection}/${tokenId}`}>View details...</Link>
          </span>
        </div>
      </div>
    )}
  </fieldset>
  </>);
}

function LotteryWinners({ chainId, tokenId, contracts, shares, config }) {
  const toLoad = [];
  for(let i = 0; i < shares.length; i++) {
    toLoad.push({
      ...contracts.LotteryERC721,
      functionName: 'lotteryRecipients',
      args: [ tokenId, i ],
    });
    toLoad.push({
      ...contracts.LotteryERC721,
      functionName: 'lotteryRecipientAmounts',
      args: [ tokenId, i ],
    });
  }
  const { data, isError, isLoading } = useContractReads({
    contracts: toLoad,
  });
  if(isLoading) {
    return (<p className="form-status">Loading lottery recipients...</p>);
  }

  if(isError) {
    return (<p className="form-status error">Error loading lottery recipients!</p>);
  }

  const recipients = [];
  for(let i = 0; i < shares.length; i++) {
    recipients.push({ addr: data[2 * i].result, amount: data[2 * i + 1].result });
  }
  return (<fieldset><ul className="recipients">
    {recipients.map((recip, i) => (<li>
      <DisplayAddress value={recip.addr} {...{contracts}} />
      &nbsp;{isWinner(shares[i].recipient) ? 'won' : 'received'}&nbsp;
      <TokenDetails {...{contracts}} address={config[3]} amount={recip.amount} />
    </li>))}
  </ul></fieldset>);
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
        (<span className="status open">Open for <Remaining value={Number(data[0].result[4])} /></span>) :
        (<span className="status ended">Sale ended</span>) :
        data[2].result === 1 ?
          (<span className="status processing">Processing...</span>) :
          data[2].result === 2 ? (<span className="status complete">Completed!</span>) :
          data[2].result === 3 ? (<span className="status cancelled">Cancelled!</span>) : null}
  </>);
}

function isWinner(addr) {
  return Number(addr) < 100;
}
