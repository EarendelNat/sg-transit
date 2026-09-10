// AsyncStorage talks to a native module that does not exist under Jest.
// The library ships an in-memory mock for exactly this case.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
