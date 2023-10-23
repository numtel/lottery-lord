import React, {useState} from 'react';
import { usePublicClient, useNetwork, useContractWrite, useWaitForTransaction, erc20ABI } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { decodeEventLog, isAddress, encodeFunctionData, parseUnits } from 'viem';
import { normalize } from 'viem/ens';
import { chainContracts} from '../contracts.js';
import PieChart from './PieChart.js';
import { DisplayAddress } from './DisplayAddress.js';
import { TokenDetails } from './TokenDetails.js';

const F16 = 0xffffffffffffffff;

export function MintNew() {
  const { chain } = useNetwork();
  const contracts = chainContracts(chain?.id);
  const navigate = useNavigate();
  const publicClientEth = usePublicClient({ chainId: 1 });
  const publicClient = usePublicClient();
  const [shares, setShares] = useState([[ 0, F16 ]]);
  const [shareErrors, setShareErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [tokenAddr, setTokenAddr] = useState();
  const submitReply = async (event) => {
    event.preventDefault();
    const newErrors = [];
    for(let i = 0; i < shares.length; i++) {
      if(shares[i][0] === 0) {
        // Ok
      } else if(isAddress(shares[i][0])) {
        // Ok
      } else if(String(shares[i][0]).toLowerCase().endsWith('.eth')) {
        const ensAddress = await publicClientEth.getEnsAddress({
          name: normalize(shares[i][0]),
        });
        if(!ensAddress) {
          newErrors[i] = 'Invalid ENS Name';
        }
      } else {
        newErrors[i] = 'Invalid Address';
      }
    }
    setShareErrors(newErrors);

    const newFieldErrors = {};
    let actualTokenAmount;
    const decimalsCalldata = encodeFunctionData({
      abi: erc20ABI,
      functionName: 'decimals',
    });
    if(!isAddress(tokenAddr)) {
      newFieldErrors.tokenAddr = 'Invalid address!';
    } else {
      const decimals = await publicClient.call({
        data: decimalsCalldata,
        to: tokenAddr,
      });
      if(!decimals.data) {
        newFieldErrors.tokenAddr = 'Invalid ERC20 contract!';
      } else {
        if(!event.target.ticketPrice.value || isNaN(event.target.ticketPrice.value) || Number(event.target.ticketPrice.value) === 0) {
          newFieldErrors.ticketPrice = 'Invalid amount!';
        } else {
          try {
            actualTokenAmount = parseUnits(event.target.ticketPrice.value, Number(decimals.data));
          } catch(error) {
            newFieldErrors.ticketPrice = 'Invalid amount!';
          }
        }
      }
    }

    setFieldErrors(newFieldErrors);

    if(newErrors.length || Object.keys(newFieldErrors).length) return;
    // TODO make it submit!
    console.log(shares, actualTokenAmount, tokenAddr);
    return;
    write({
      args: [ [
        event.target.lotteryName.value,
        event.target.description.value,
        [],
        actualTokenAmount,
        tokenAddr,
        event.target.endTime.value,
        // TODO add option to require coinpassport, 1 ticket per person
        '0x0'
      ]],
    });
  };
  const { data, isLoading, isError, isSuccess, write } = useContractWrite({
    ...contracts?.LotteryERC721,
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
      // adjust other shares to compensate
      const diff = shares[index][1] - newValue;
      let total = newValue;
      for(let i = 0; i < shares.length; i++) {
        newShares[i][1] += diff / (shares.length - 1);
        if(newShares[i][1] < 0) newShares[i][1] = 0;
        if(newShares[i][1] > F16) newShares[i][1] = F16;
        if(i !== index) total += newShares[i][1];
      }
      newShares[index][1] = newValue;
      // make sure shares add up to F16
      const totalDiffProportion = total / F16;
      for(let i = 0; i < shares.length; i++) {
        newShares[i][1] /= totalDiffProportion;
      }

      return newShares;
    });
  };
  const removeShare = (index) => {
    shareChanged(index, 0);
    setShares(shares => {
      const newShares = [...shares];
      newShares.splice(index, 1);
      return newShares;
    });
  };
  // TODO be sure to warn about gas usage of too many shares, calc it!
  const addShare = (event) => {
    setShares(shares => {
      const newShares = [...shares];
      newShares.push([0, 0]);
      return newShares;
    });
  };
  const recipChanged = (index, newValue) => {
    setShares(shares => {
      const newShares = [...shares];
      newShares[index][0] = newValue || 0;
      return newShares;
    });
  };
  if(!chain) return;
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
          <input name="endTimeDate" type="date" />
          <input name="endTimeTime" type="time" />
        </div>
      </fieldset>
      <fieldset>
        <legend>Ticket Configuration</legend>
        <div className="field">
          <label>Token:</label>
          <input name="token" value={tokenAddr} onChange={(e) => setTokenAddr(e.target.value)} />
          {isAddress(tokenAddr) && (<TokenDetails address={tokenAddr} {...{contracts}} />)}
          {'tokenAddr' in fieldErrors && (<span className="error">{fieldErrors.tokenAddr}</span>)}
          <div className="common-tokens">
            {Object.keys(contracts.commonTokens).map(key => (
              <button key={key} type="button" onClick={(e) => setTokenAddr(contracts.commonTokens[key])}>{key}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Ticket Price:</label>
          <input name="ticketPrice" />
          {'ticketPrice' in fieldErrors && (<span className="error">{fieldErrors.ticketPrice}</span>)}
        </div>
      </fieldset>
      <fieldset>
        <legend>Pot Shares Configuration</legend>
        <div id="share-config">
          <PieChart data={shares} />
          <div className="shares">
            {shares.map((share, index) => (
              <div className="share" key={index}>
                {(share[1] / F16 * 100).toFixed(1)}% to&nbsp;
                {share[0] === 0 ? 'random winner' : (<DisplayAddress value={share[0]} {...{contracts}} />)}
                <div className="field">
                  <input type="range" min="0" max={F16} value={share[1]} onChange={(e) => shareChanged(index, Number(e.target.value))} />
                </div>
                <div className="field">
                  <label>
                    <span>Recipient:</span>
                    <input placeholder="Random Winner" value={share[0] === 0 ? '' : share[0]} onChange={(e) => recipChanged(index, e.target.value)} />
                    {shareErrors[index] && (<span className="error">{shareErrors[index]}</span>)}
                  </label>
                </div>
                {shares.length > 1 && (<button type="button" onClick={(e) => removeShare(index)}>Remove</button>)}
              </div>
            ))}
            <button type="button" onClick={addShare}>Add Share</button>
          </div>
        </div>
      </fieldset>
      <button type="submit">Submit</button>
      {!!(shareErrors.length || Object.keys(fieldErrors).length) && <span className="error">Fix input errors!</span>}
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
