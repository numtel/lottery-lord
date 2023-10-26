import { useEnsAddress, useEnsName } from 'wagmi';
import { isAddress } from 'viem';

export function DisplayAddress({ value, contracts }) {
  const { data, isError, isLoading } = useEnsAddress({
    chainId: 1,
    name: String(value).toLowerCase().endsWith('.eth') ? value : null,
  });
  const { data: dataName, isError: dataError, isLoading: dataLoading } = useEnsName({
    chainId: 1,
    address: isAddress(value) ? value : null,
  });
  if(dataName) return (
    <a href={`${contracts.explorer}address/${value}`} target="_blank" rel="noreferrer">{ dataName }</a>
  );
  if(isAddress(value)) return (
    <a href={`${contracts.explorer}address/${value}`} target="_blank" rel="noreferrer">{ value.slice(0, 6) + '...' + value.slice(-4) }</a>
  );
  if(data) return (
    <a href={`${contracts.explorer}address/${data}`} target="_blank" rel="noreferrer">{ value }</a>
  );
  if(isLoading) return (
    <span>Loading...</span>
  );
  if(isError) return (
    <span>Invalid ENS Name!</span>
  );
  return (
    <span>Invalid Recipient!</span>
  );
}
