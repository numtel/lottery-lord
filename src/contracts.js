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
    validators: [
      {
        name: 'One Ticket Per Person',
        description: 'Require buyers to be verified using Coinpassport and only allow each buyer to purchase a single ticket.',
        address: '0xB9DE28d814C68028178b4dB26cA47D2458535351',
      },
    ],
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
