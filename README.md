# Lotto Launcha

Generate lottery NFTs to support any cause or no cause, it's up to you!

Inspired by [Johnny Harris' YouTube short about how government-run lotteries](https://youtube.com/shorts/7Pc8Xxk4GaM?si=PXIOSae_aXlUqbWS) take a big chuck of the possible pot.

## Common commands

```sh
# Deploy RandomSource to Mumbai
$ RUST_BACKTRACE=1 SUBSCRIPTION_ID=6187 COORDINATOR_ADDR=0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed KEY_HASH=0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f forge script script/RandomSource.s.sol:Deploy --rpc-url https://rpc.ankr.com/polygon_mumbai --broadcast --legacy --verify -vvvv

# Deploy LotteryERC721
$ RUST_BACKTRACE=1 COLLECTION_NAME="Lotto Test" COLLECTION_SYMBOL="LOTTOTEST" RANDOM_SOURCE=0xfcf0566680d6de5450cb745324e6077ce49e39c3 URL_PREFIX="http://localhost:3000/lotto/80001/" forge script script/LotteryERC721.s.sol:Deploy --rpc-url https://rpc.ankr.com/polygon_mumbai --broadcast --legacy --verify -vvvv

# Deploy OneTicketPerPerson validator using Mumbai deployed MockVerification
$ RUST_BACKTRACE=1 VERIFICATIONS=0x31DE5D6E9675479a5f30C6389Bd43fc9b6f47fE9 forge script script/OneTicketPerPerson.s.sol:Deploy --rpc-url https://rpc.ankr.com/polygon_mumbai --broadcast --legacy --verify -vvvv

```

## License

MIT
