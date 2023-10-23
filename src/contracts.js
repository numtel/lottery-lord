import lotteryERC721ABI from './abi/LotteryERC721.json';

export const defaultChain = 80001;

export const byChain = {
  80001: {
    name: 'Mumbai',
    explorer: 'https://mumbai.polygonscan.com/',
    nativeCurrency: 'tMATIC',
    commonTokens: {
      EXFEE: '0xa7d04e6cf8f9cb0a24a14369997048248080a61f',
    },
    LotteryERC721: {
      address: '0x5a1338979f147c7bcfde6012f4e778461ef34d02',
      abi: lotteryERC721ABI,
      chainId: 80001,
    },
  },
};

export function chainContracts(chain) {
  if(chain && (chain.id in byChain || chain in byChain)) return byChain[chain.id || chain];
  return null;
}
