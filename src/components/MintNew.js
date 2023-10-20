import React, {useState} from 'react';
import { useNetwork, useContractWrite, useWaitForTransaction } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { decodeEventLog } from 'viem';
import { chainContracts} from '../contracts.js';

const F16 = 0xffffffffffffffff;

export function MintNew() {
  const { chain } = useNetwork();
  const contracts = chainContracts(chain.id);
  const navigate = useNavigate();
  const [shares, setShares] = useState([[ 0, F16 ]]);
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
  const shareChanged = (index, newValue) => {
    setShares(shares => {
      const newShares = [...shares];
      // TODO adjust other shares to compensate
      newShares[index][1] = newValue;
      return newShares;
    });
  };
  const removeShare = (index) => {
    setShares(shares => {
      const newShares = [...shares];
      // Distribute this share's amount to other remaining shares
      for(let i = 0; i < shares.length; i++) {
        if(i === index) continue;
        if(newShares.length === 2) newShares[i][1] = F16;
        // TODO why not working?
        else newShares[i][1] = newShares[i][1] * (newShares[index][1] / shares.length - 1);
      }
      newShares.splice(index, 1);
      return newShares;
    });
  };
  // TODO be sure to warn about gas usage of too many shares, calc it!
  const addShare = (event) => {
    setShares(shares => {
      const newShares = [...shares];
      const newValue = F16 / (shares.length + 1);
      for(let i = 0; i < shares.length; i++) {
        newShares[i][1] = newShares[i][1] * ((F16 - newValue) / F16);
      }
      newShares.push([0, newValue]);
      return newShares;
    });
  };
  if(!contracts) {
    return (<p>Chain Not Supported!</p>);
  }
  return (
    <form onSubmit={submitReply}>
      <fieldset>
        <legend>Basic Configuration</legend>
        <div className="field">
          <label>Name:</label>
          <input name="lotteryName" />
        </div>
        <div className="field">
          <label>Description:</label>
          <textarea name="description"></textarea>
        </div>
        <div className="field">
          <label>End Time:</label>
          <input name="endTime" />
        </div>
      </fieldset>
      <fieldset>
        <legend>Ticket Configuration</legend>
        <div className="field">
          <label>Token:</label>
          <input name="token" />
        </div>
        <div className="field">
          <label>Ticket Price:</label>
          <input name="ticketPrice" />
        </div>
      </fieldset>
      <fieldset>
        <legend>Pot Shares Configuration</legend>
        {shares.map((share, index) => (
          <div className="share" key={index}>
            {(share[1] / F16 * 100).toFixed(1)}% to&nbsp;
            {share[0] === 0 ? 'random winner' : (<span>{share[0]}</span>)}
            <input name={`share_${index}`} type="range" min="0" max={F16} value={share[1]} onChange={(e) => shareChanged(index, Number(e.target.value))} />
            {shares.length > 1 && (<button type="button" onClick={(e) => removeShare(index)}>Remove</button>)}
          </div>
        ))}
        <button type="button" onClick={addShare}>Add Share</button>
      </fieldset>
      <button type="submit">Submit</button>
      {isLoading && <p>Waiting for user confirmation...</p>}
      {isSuccess && (
        txIsError ? (<p>Transaction error!</p>)
        : txIsLoading ? (<p>Waiting for transaction...</p>)
        : txIsSuccess ? (<p>Transaction success!</p>)
        : (<p>Transaction sent...</p>))}
      {isError && <p>Error!</p>}
    </form>
  );
}


