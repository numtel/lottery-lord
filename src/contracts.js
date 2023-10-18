import lotteryERC721ABI from './abi/LotteryERC721.json';

export const defaultChain = 80001;

export const byChain = {
  80001: {
    name: 'Mumbai',
    explorer: 'https://mumbai.polygonscan.com/',
    nativeCurrency: 'tMATIC',
    LotteryERC721: {
      address: '0x2c35714c1df8069856e41e7b75b2270929b6459c',
      abi: lotteryERC721ABI,
      chainId: 80001,
    },
  },
};

export function chainContracts(chain) {
  if(chain && (chain.id in byChain || chain in byChain)) return byChain[chain.id || chain];
  throw new Error('INVALID_CHAIN');
}
