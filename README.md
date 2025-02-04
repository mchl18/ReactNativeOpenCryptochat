# OpenCryptoChat React-Native companion

This repo tries to integrate [OpenCryptoChat](https://github.com/triestpa/Open-Cryptochat) with React-Native.
It relies on the socket.io server provided by OpenCryptoChat in order to connect to rooms and exchange messages using RSA. Consists of a server along with vue ui as well as client for mobile phones (android & iOS). Extends the original RSA implementation to enable messages longer than 245 bytes.

![Screenshot](https://github.com/mchl18/ReactNativeOpenCryptochat/blob/main/client/demo.png)


## Getting started

1. check out [React Native Docs](https://reactnative.dev/docs/environment-setup) and set up client environment
2. `cd server && yarn && yarn start`
3. Open simulator and join room via browser to establish a room session

