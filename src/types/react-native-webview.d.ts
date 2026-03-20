declare module 'react-native-webview' {
  import type { ComponentType } from 'react';

  export interface WebViewProps {
    testID?: string;
    source?: { uri?: string; html?: string };
    [key: string]: unknown;
  }

  const WebView: ComponentType<WebViewProps>;

  export { WebView };
  export default WebView;
}
