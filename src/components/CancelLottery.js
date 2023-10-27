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
    <button onClick={() => write()} type="button">Cancel Lottery</button>
    {isLoading && <p>Waiting for user confirmation...</p>}
    {isSuccess && (
      txError ? (<p>Transaction error!</p>)
      : txLoading ? (<p>Waiting for transaction...</p>)
      : txSuccess ? (<p>Lottery Processing Initiated!</p>)
      : (<p>Transaction sent...</p>))}
    {isError && <p>Error!</p>}
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
  if(readRefundLoading) {
    return (<p>Loading refund status...</p>);
  }

  if(readRefundError) {
    return (<p>Error loading refund status!</p>);
  }

  if(refundStatus[0].result) return (<>
    <p>Refund already claimed!</p>
  </>);

  return (<>
    <button onClick={() => write()} type="button">Refund Tickets</button>
    {isLoading && <p>Waiting for user confirmation...</p>}
    {isSuccess && (
      txError ? (<p>Transaction error!</p>)
      : txLoading ? (<p>Waiting for transaction...</p>)
      : txSuccess ? (<p>Lottery Processing Initiated!</p>)
      : (<p>Transaction sent...</p>))}
    {isError && <p>Error!</p>}
  </>);
}

