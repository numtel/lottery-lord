import React, {useState} from 'react';
import { usePublicClient, useContractWrite, useNetwork, useWaitForTransaction, erc20ABI } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import Linkify from 'react-linkify';
import { decodeEventLog, isAddress, encodeFunctionData, parseUnits, pad } from 'viem';
import { normalize } from 'viem/ens';
import { chainContracts} from '../contracts.js';
import PieChart from './PieChart.js';
import { DisplayAddress } from './DisplayAddress.js';
import { TokenDetails } from './TokenDetails.js';

const BigInt = window.BigInt;

const F16n = 0xffffffffffffffffn;
const ZERO_ADDR = pad('0x0', {size:20});

export function MintNew() {
  const { chain } = useNetwork();
  const contracts = chainContracts(chain?.id);
  const navigate = useNavigate();
  const publicClientEth = usePublicClient({ chainId: 1 });
  const publicClient = usePublicClient();
  const [shares, setShares] = useState([[ 0, F16n ]]);
  const [shareErrors, setShareErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [tokenAddr, setTokenAddr] = useState();
  const [validator, setValidator] = useState(ZERO_ADDR);
  const submitReply = async (event) => {
    event.preventDefault();
    const newErrors = [];
    const sharesOut = [...shares.map(share => ({recipient:share[0], share:share[1]}))];
    for(let i = 0; i < shares.length; i++) {
      if(shares[i][0] === 0) {
        // Ok
        sharesOut[i].recipient = pad(`0x${i}`, {size:20});
        if(i > 99) {
          newErrors[i] = 'Too many winners! Max: 100';
        }
      } else if(isAddress(shares[i][0])) {
        // Ok
      } else if(String(shares[i][0]).toLowerCase().endsWith('.eth')) {
        const ensAddress = await publicClientEth.getEnsAddress({
          name: normalize(shares[i][0]),
        });
        if(!ensAddress) {
          newErrors[i] = 'Invalid ENS Name';
        }
        sharesOut[i].recipient = ensAddress;
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
    const config = {
      name: event.target.lotteryName.value,
      description: event.target.description.value,
      shares: sharesOut,
      ticketAmount: actualTokenAmount,
      ticketToken: tokenAddr,
      endTime: (new Date(event.target.endTimeDate.value + ' ' + event.target.endTimeTime.value)).getTime() / 1000,
      ticketValidator: event.target.querySelector('input[name="validator"]:checked').value,
    };
    write({
      args: [ config ],
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
      navigate(`/details/${chain.id}/${contracts.LotteryERC721.address}/${decoded[0].args.tokenId}`);
    },
  });
  const shareChanged = (index, newValue) => {
    setShares(shares => {
      const newShares = [...shares];
      if(shares.length === 1) {
        shares[0][1] = F16n;
        return newShares;
      }
      // adjust other shares to compensate
      const diff = shares[index][1] - BigInt(Number(newValue));
      let total = BigInt(Number(newValue));
      for(let i = 0; i < shares.length; i++) {
        newShares[i][1] += diff / BigInt(shares.length - 1);
        if(newShares[i][1] < 0) newShares[i][1] = 0n;
        if(newShares[i][1] > F16n) newShares[i][1] = F16n;
        if(i !== index) total += newShares[i][1];
      }
      newShares[index][1] = BigInt(Number(newValue));
      // make sure shares add up to F16n
      const totalDiffProportion = total * 10000n / F16n;
      let sum = 0n;
      for(let i = 0; i < shares.length; i++) {
        newShares[i][1] = newShares[i][1] * 10000n / totalDiffProportion;
        sum += newShares[i][1];
      }
      // There can be an off-by-one error above
      // The adjustment above isn't 100% exact, so adjust the last share
      if(sum !== F16n) {
        newShares[newShares.length -1][1] -= sum - F16n;
      }

      return newShares;
    });
  };
  const removeShare = (index) => {
    shareChanged(index, '0');
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
      newShares.push([0, 0n]);
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
  const setValidatorEx = (e) => {
    setValidator(e.target.value);
  }
  if(!chain) return;
  if(!contracts) {
    return (<p className="form-status">Chain Not Supported!</p>);
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
        <div className="field validators">
          {contracts.validators.map(thisValidator => (
            <label>
              <input type="radio" name="validator" checked={validator === thisValidator.address} onChange={setValidatorEx} value={thisValidator.address} />
              <span className="name">{thisValidator.name}</span>
              <span className="description"><Linkify>{thisValidator.description}</Linkify></span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Pot Shares Configuration</legend>
        <div id="share-config">
          <PieChart data={shares} />
          <div className="shares">
            {shares.map((share, index) => (
              <div className="share" key={index}>
                {(Number(((share[1] * 1000n) / F16n).toString(10))/10).toFixed(1)}% to&nbsp;
                {share[0] === 0 ? 'random winner' : (<DisplayAddress value={share[0]} {...{contracts}} />)}
                <div className="field">
                  <input type="range" min="0" max={F16n.toString(10)} value={share[1].toString(10)} onChange={(e) => shareChanged(index, e.target.value)} />
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
      {!!(shareErrors.length || Object.keys(fieldErrors).length) ? <p className="form-status error">Fix input errors!</p> : (<>
      {isLoading && <p className="form-status">Waiting for user confirmation...</p>}
      {isSuccess && (
        txIsError ? (<p className="form-status error">Transaction error!</p>)
        : txIsLoading ? (<p className="form-status">Waiting for transaction...</p>)
        : txIsSuccess ? (<p className="form-status">Transaction success!</p>)
        : (<p className="form-status">Transaction sent...</p>))}
      {isError && <p className="form-status error">Error!</p>}
      </>)}
      <button type="submit">Launch New Lottery</button>
    </form>
  );
}
