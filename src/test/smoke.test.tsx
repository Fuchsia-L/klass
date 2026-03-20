import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import WebView from 'react-native-webview';

describe('test environment smoke test', () => {
  it('renders a basic React Native component', () => {
    const { getByText } = render(
      <View>
        <Text>CyberSchedule smoke</Text>
      </View>,
    );

    expect(getByText('CyberSchedule smoke')).toBeTruthy();
  });

  it('renders the mocked webview module', () => {
    const { getByTestId } = render(<WebView testID="webview-smoke" source={{ uri: 'https://example.com' }} />);

    expect(getByTestId('webview-smoke')).toBeTruthy();
  });
});
