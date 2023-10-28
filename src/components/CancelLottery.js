import { useAccount, useContractReads, useContractWrite, useWaitForTransaction } from 'wagmi';

export function CancelLottery({ chainId, tokenId, contracts }) {
  const { data, isLoading, isError, isSuccess, write } = useContractWrite({
    ...contracts.LotteryERC721,
    functionName: 'cancelLottery',
    args: [ tokenId ],
  });
  const { isError: txError, isLoading: txLoading, isSuccess: txSuccess } = useWaitForTransaction({
    hash: data ? data.hash : null,
  });
  return (<>
    {isLoading && <p className="form-status">Waiting for user confirmation...</p>}
    {isSuccess && (
      txError ? (<p className="form-status error">Transaction error!</p>)
      : txLoading ? (<p className="form-status">Waiting for transaction...</p>)
      : txSuccess ? (<p className="form-status">Lottery Processing Initiated!</p>)
      : (<p className="form-status">Transaction sent...</p>))}
    {isError && <p className="form-status error">Error!</p>}
    <button onClick={() => write()} type="button">Cancel Lottery</button>
  </>);
}


export function RefundTickets({ chainId, tokenId, contracts, qtyBought }) {
  const { address: account } = useAccount();
  const { data: refundStatus, isError: readRefundError, isLoading: readRefundLoading } = useContractReads({
    contracts: [
      { // 0
        ...contracts.LotteryERC721,
        functionName: 'refundClaimed',
        args: [ tokenId, account ],
      },
    ],
    watch: true,
  });
  const { data, isLoading, isError, isSuccess, write } = useContractWrite({
    ...contracts.LotteryERC721,
    functionName: 'refundTickets',
    args: [ tokenId ],
  });
  const { isError: txError, isLoading: txLoading, isSuccess: txSuccess } = useWaitForTransaction({
    hash: data ? data.hash : null,
  });
  if(!account || qtyBought < 1) return;
  if(readRefundLoading) {
    return (<p className="form-status">Loading refund status...</p>);
  }

  if(readRefundError) {
    return (<p className="form-status error">Error loading refund status!</p>);
  }

  if(refundStatus[0].result) return (<>
    <p className="form-status">Refund already claimed!</p>
  </>);

  return (<>
    {isLoading && <p className="form-status">Waiting for user confirmation...</p>}
    {isSuccess && (
      txError ? (<p className="form-status error">Transaction error!</p>)
      : txLoading ? (<p className="form-status">Waiting for transaction...</p>)
      : txSuccess ? (<p className="form-status">Lottery Processing Initiated!</p>)
      : (<p className="form-status">Transaction sent...</p>))}
    {isError && <p className="form-status error">Error!</p>}
    <button onClick={() => write()} type="button">Refund Tickets</button>
  </>);
}

