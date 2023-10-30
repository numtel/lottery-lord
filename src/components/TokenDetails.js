import { erc20ABI, useContractReads } from 'wagmi';
import { formatUnits } from 'viem';

export function TokenDetails({ address, contracts, amount }) {
  const general = { address, abi: erc20ABI, chainId: contracts.LotteryERC721.chainId};
  const { data, isError, isLoading } = useContractReads({
    contracts: [
      { ...general, functionName: 'name',},
      { ...general, functionName: 'symbol' },
      { ...general, functionName: 'decimals' },
    ],
  });
  if(isLoading) return (
    <span>Loading...</span>
  );
  if(isError || (data && data[0].error)) return (
    <span>Invalid ERC20 Token!</span>
  );
  if(data) return (<>
    {amount !== undefined && formatUnits(amount, data[2].result)}&nbsp;
    <a href={`${contracts.explorer}address/${address}`} target="_blank" rel="noreferrer">{ data[0].result } ({data[1].result})</a>
  </>);
}
