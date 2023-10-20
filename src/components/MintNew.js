import React from 'react';
import { useNetwork, useContractWrite, useWaitForTransaction } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { decodeEventLog } from 'viem';
import { chainContracts} from '../contracts.js';

export function MintNew() {
  const { chain } = useNetwork();
  const contracts = chainContracts(chain.id);
  const navigate = useNavigate();
  const submitReply = (event) => {
    event.preventDefault();
    write({
      args: [ [
        event.target.lotteryName.value,
        event.target.description.value,
        [],
        event.target.ticketPrice.value,
        event.target.token.value,
        event.target.endTime.value,
        '0x0'
      ]],
    });
  };
  const { data, isLoading, isError, isSuccess, write } = useContractWrite({
    ...contracts.LotteryERC721,
    functionName: 'mint',
  });
  const { isError: txIsError, isLoading: txIsLoading, isSuccess: txIsSuccess } = useWaitForTransaction({
    hash: data ? data.hash : null,
    async onSuccess(data) {
      const decoded = data.logs.filter(log =>
          log.address.toLowerCase() === contracts.LotteryERC721.address.toLowerCase())
        .map(log => decodeEventLog({
          abi: contracts.LotteryERC721.abi,
          data: log.data,
          topics: log.topics,
          strict: false,
        }));
      navigate(`/lotto/${chain.id}/${contracts.LotteryERC721.address}/${decoded[0].args.tokenId}`);
    },
  });
  if(!contracts) {
    return (<p>Chain Not Supported!</p>);
  }
  return (
    <form onSubmit={submitReply}>
      <fieldset>
        <legend>Create New Lottery</legend>
        <div className="field">
          <label>Name:</label>
          <input name="lotteryName" />
        </div>
        <div className="field">
          <label>Description:</label>
          <textarea name="description"></textarea>
        </div>
        <div className="field">
          <label>Token:</label>
          <input name="token" />
        </div>
        <div className="field">
          <label>Ticket Price:</label>
          <input name="ticketPrice" />
        </div>
        <div className="field">
          <label>End Time:</label>
          <input name="endTime" />
        </div>
        <button type="submit">Submit</button>
        {isLoading && <p>Waiting for user confirmation...</p>}
        {isSuccess && (
          txIsError ? (<p>Transaction error!</p>)
          : txIsLoading ? (<p>Waiting for transaction...</p>)
          : txIsSuccess ? (<p>Transaction success!</p>)
          : (<p>Transaction sent...</p>))}
        {isError && <p>Error!</p>}
      </fieldset>
    </form>
  );
}


