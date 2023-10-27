import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Linkify from 'react-linkify';
import { useContractWrite, useWaitForTransaction, useContractReads, useAccount, erc20ABI } from 'wagmi';
import { isAddressEqual } from 'viem';
import { chainContracts} from '../contracts.js';
import PieChart from '../components/PieChart.js';
import { DisplayAddress } from '../components/DisplayAddress.js';
import { TokenDetails } from '../components/TokenDetails.js';
import { Remaining } from '../components/Remaining.js';
import { TicketVendor } from '../components/TicketVendor.js';
import RandomSourceABI from '../abi/RandomSource.json';

const F16n = 0xffffffffffffffffn;

export function Lotto() {
  const { address: account } = useAccount();
  const { chainId, collection, tokenId } = useParams();
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
    ],
    watch: true,
  });

  const { data: beginData, isLoading: beginLoading, isError: beginError, isSuccess: beginSuccess, write: beginWrite } = useContractWrite({
    ...contracts.LotteryERC721,
    functionName: 'beginProcessLottery',
    args: [ tokenId, data && data[4].result ? 100000 + (data[4].result[1] * 20000) : null ],
  });
  const { isError: beginTxError, isLoading: beginTxLoading, isSuccess: beginTxSuccess } = useWaitForTransaction({
    hash: beginData ? beginData.hash : null,
  });

  const { data: endData, isLoading: endLoading, isError: endError, isSuccess: endSuccess, write: endWrite } = useContractWrite({
    ...contracts.LotteryERC721,
    functionName: 'finishProcessLottery',
    args: [ tokenId ],
  });
  const { isError: endTxError, isLoading: endTxLoading, isSuccess: endTxSuccess } = useWaitForTransaction({
    hash: endData ? endData.hash : null,
  });

  if(!isKnownLotto) {
    return (<p>Unknown Lottery Contract</p>);
  }

  if(isLoading) {
    return (<p>Loading lottery details...</p>);
  }

  if(isError || data[3].status === 'failure') {
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
      <dt>Pot Balance</dt>
      <dd><PotBalance {...{chainId, tokenId, contracts}} config={data[0].result} /></dd>
      <dt>My Tickets Bought</dt>
      <dd>{data[5].result.toString()}</dd>
      <dt>Lottery Status</dt>
      <dd><LotteryStatus {...{data}} /></dd>
    </dl>
    {data[2].result === 0 ? Number(data[0].result[4]) * 1000 > Date.now() ?
      (<TicketVendor {...{chainId, collection, tokenId, contracts}} config={data[0].result} />) :
      (<>
        <button onClick={() => beginWrite()} type="button">Begin Processing</button>
        {beginLoading && <p>Waiting for user confirmation...</p>}
        {beginSuccess && (
          beginTxError ? (<p>Transaction error!</p>)
          : beginTxLoading ? (<p>Waiting for transaction...</p>)
          : beginTxSuccess ? (<p>Lottery Processing Initiated!</p>)
          : (<p>Transaction sent...</p>))}
        {beginTxError && <p>Error!</p>}
      </>) :
      data[2].result === 1 ?
      (<>
        <WaitForRandomFulfilled {...{chainId, tokenId, contracts}} randomSource={data[6].result}>
          <button onClick={() => endWrite()} type="button">Finish Processing</button>
          {endLoading && <p>Waiting for user confirmation...</p>}
          {endSuccess && (
            endTxError ? (<p>Transaction error!</p>)
            : endTxLoading ? (<p>Waiting for transaction...</p>)
            : endTxSuccess ? (<p>Lottery Processing Completed!</p>)
            : (<p>Transaction sent...</p>))}
          {endTxError && <p>Error!</p>}
        </WaitForRandomFulfilled>
      </>) : data[2].result === 2 ? (
        <LotteryWinners config={data[0].result} shares={data[3].result} {...{chainId, tokenId, contracts}} />
      ) : null}


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
    return (<p>Loading lottery recipients...</p>);
  }

  if(isError) {
    return (<p>Error loading lottery recipients!</p>);
  }

  const recipients = [];
  for(let i = 0; i < shares.length; i++) {
    recipients.push({ addr: data[2 * i].result, amount: data[2 * i + 1].result });
  }
  return (<ul className="recipients">
    {recipients.map((recip, i) => (<li>
      <DisplayAddress value={recip.addr} {...{contracts}} />
      &nbsp;{isWinner(shares[i].recipient) ? 'won' : 'received'}&nbsp;
      <TokenDetails {...{contracts}} address={config[3]} amount={recip.amount} />
    </li>))}
  </ul>);
}

function WaitForRandomFulfilled({ chainId, tokenId, contracts, randomSource, children }) {
  const { data: reqData, isError: reqError, isLoading: reqLoading } = useContractReads({
    contracts: [
      { // 0
        ...contracts.LotteryERC721,
        functionName: 'lotteryRandomRequests',
        args: [ tokenId ],
      },
    ],
  });

  const { data: randomData, isError: randomError, isLoading: randomLoading } = useContractReads({
    contracts: [
      { // 0
        chainId: Number(chainId),
        abi: RandomSourceABI,
        address: randomSource,
        functionName: 'getRequestStatus',
        args: [ reqData ? reqData[0].result : null ],
      },
    ],
    watch: true,
  });

  if(randomData && randomData[0] && randomData[0].result && randomData[0].result[0]) {
    return (
      <>{children}</>
    );
  } else {
    return (
      <p>Waiting for random fulfillment...</p>
    );
  }
}

function PotBalance({ chainId, tokenId, contracts, config }) {
  const { data, isError, isLoading } = useContractReads({
    contracts: [
      { // 0
        abi: erc20ABI,
        address: config[3],
        chainId: Number(chainId),
        functionName: 'balanceOf',
        args: [ contracts.LotteryERC721.address ],
      },
    ],
    watch: true,
  });

  if(isLoading) {
    return (<p>Loading pot balance...</p>);
  }

  if(isError) {
    return (<p>Error loading pot balance!</p>);
  }

  return (
    <TokenDetails {...{contracts}} address={config[3]} amount={data[0].result} />
  );
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
