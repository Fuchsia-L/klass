import type { ForwardedRef } from 'react';
import type { ViewProps } from 'react-native';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock(
  'react-native-webview',
  () => {
    const React = require('react');
    const { View } = require('react-native');

    const MockWebView = React.forwardRef(
      ({ testID = 'mock-webview', ...props }: ViewProps & { testID?: string }, ref: ForwardedRef<any>) =>
        React.createElement(View, { ...props, ref, testID }),
    );

    MockWebView.displayName = 'MockWebView';

    return {
      __esModule: true,
      default: MockWebView,
      WebView: MockWebView,
    };
  },
  { virtual: true },
);

afterEach(async () => {
  const asyncStorageModule = require('@react-native-async-storage/async-storage');
  const AsyncStorage = asyncStorageModule.default ?? asyncStorageModule;

  jest.clearAllMocks();
  await AsyncStorage.clear();
});
