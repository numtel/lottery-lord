import React, { useState } from 'react';
import { useAccount, useContractReads, useNetwork, useSwitchNetwork, useContractWrite, useWaitForTransaction, erc20ABI } from 'wagmi';

const BigInt = window.BigInt;

export function TicketVendor({ chainId, collection, tokenId, contracts, config }) {
  const { address: account } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const [ qty, setQty ] = useState(0);
  const { data: approvalData, isError: approvalReadError, isLoading: approvalReadLoading } = useContractReads({
    contracts: [
      {
        chainId,
        address: config[3],
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [ account ],
      },
      {
        chainId,
        address: config[3],
        abi: erc20ABI,
        functionName: 'allowance',
        args: [ account, contracts.LotteryERC721.address ],
      },
    ],
  });

  const shouldSwitchChain = chain && Number(chainId) !== chain.id;
  if(shouldSwitchChain) return (
    <button onClick={() => switchNetwork(Number(chainId))} type="button">Switch to {contracts.name}</button>
  );

  const handleSubmit = (event) => {
    event.preventDefault();
  }
  console.log(approvalData);
  return (
    <form onSubmit={handleSubmit}>
      <fieldset>
        <legend>Buy Tickets</legend>
        <div className="field">
          <label>Quantity:</label>
          <input type="number" min="0" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        </div>
      </fieldset>
    </form>
  );
}

function BuyTickets({ chainId, collection, tokenId, contracts }) {
  const { data, isLoading, isError, isSuccess, write } = useContractWrite({
    ...contracts.LotteryERC721,
    functionName: 'buyTickets',
  });
  const { isError: txIsError, isLoading: txIsLoading, isSuccess: txIsSuccess } = useWaitForTransaction({
    hash: data ? data.hash : null,
  });
}
