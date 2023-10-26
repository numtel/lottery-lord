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
    watch: true,
  });
  const buyAmount = config[2] * BigInt(qty);
  const needsApproval = approvalData && (approvalData[1].result < buyAmount);
  const insufficientBalance = approvalData && (approvalData[0].result < buyAmount);

  const { data: approveData, isLoading: approveLoading, isError: approveError, isSuccess: approveSuccess, write: approveWrite } = useContractWrite({
    chainId: chain.id,
    address: config[3],
    abi: erc20ABI,
    functionName: 'approve',
  });
  const { isError: approveTxError, isLoading: approveTxLoading, isSuccess: approveTxSuccess } = useWaitForTransaction({
    hash: approveData ? approveData.hash : null,
  });

  const { data: buyData, isLoading: buyLoading, isError: buyError, isSuccess: buySuccess, write: buyWrite } = useContractWrite({
    ...contracts.LotteryERC721,
    functionName: 'buyTickets',
  });
  const { isError: buyTxError, isLoading: buyTxLoading, isSuccess: buyTxSuccess } = useWaitForTransaction({
    hash: buyData ? buyData.hash : null,
  });

  const shouldSwitchChain = chain && Number(chainId) !== chain.id;
  if(shouldSwitchChain) return (
    <button onClick={() => switchNetwork(Number(chainId))} type="button">Switch to {contracts.name}</button>
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    if(needsApproval) {
      approveWrite({
        args: [ contracts.LotteryERC721.address, buyAmount ],
      });
    } else {
      buyWrite({
        args: [ tokenId, qty ],
      });
    }
  }
  return (
    <form onSubmit={handleSubmit}>
      <fieldset>
        <legend>Buy Tickets</legend>
        <div className="field">
          <label>Quantity:</label>
          <input type="number" min="0" value={qty} onChange={(e) => setQty(isNaN(e.target.value) ? 0 : Number(e.target.value))} />
          {insufficientBalance && <span className="error">Insufficient Balance!</span>}
        </div>
        <button disabled={!needsApproval}>Approve</button>
        <button disabled={needsApproval}>Buy Tickets</button>
        {approveLoading && <p>Waiting for user confirmation...</p>}
        {approveSuccess && (
          approveTxError ? (<p>Approval transaction error!</p>)
          : approveTxLoading ? (<p>Waiting for approval transaction...</p>)
          : approveTxSuccess ? (<p>Approval success!</p>)
          : (<p>Approval transaction sent...</p>))}
        {approveTxError && <p>Error!</p>}
        {buyLoading && <p>Waiting for user confirmation...</p>}
        {buySuccess && (
          buyTxError ? (<p>Transaction error!</p>)
          : buyTxLoading ? (<p>Waiting for transaction...</p>)
          : buyTxSuccess ? (<p>Tickets Purchased!</p>)
          : (<p>Transaction sent...</p>))}
        {buyTxError && <p>Error!</p>}
      </fieldset>
    </form>
  );
}

