# Winter Arc

Daily checklist for Oct 1 to Dec 31. Tick every habit in a day and your streak goes up by one.

## Setup
npm install
npx expo install expo react react-native @react-native-async-storage/async-storage
npx expo start

## Ship
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
