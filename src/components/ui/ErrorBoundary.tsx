import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: ReactNode;
  lang?: 'zh' | 'en';
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[ErrorBoundary]', error.message);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const lang = this.props.lang ?? 'zh';
      return (
        <View style={styles.container}>
          <Text style={styles.title}>
            {lang === 'en' ? 'Something went wrong' : '出了點問題'}
          </Text>
          <Text style={styles.body}>
            {lang === 'en'
              ? 'The app encountered an unexpected error. Please try again.'
              : '應用程式遇到意外錯誤，請重試。'}
          </Text>
          <TouchableOpacity onPress={this.handleRetry} style={styles.btn}>
            <Text style={styles.btnText}>
              {lang === 'en' ? 'Retry' : '重試'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#1a0d11' },
  title: { fontFamily: 'NotoSerifTC-Regular', fontSize: 22, color: '#f5e2c4', marginBottom: 12, textAlign: 'center' },
  body: { fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: 'rgba(245,226,196,0.6)', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  btn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 999, backgroundColor: '#e8a557' },
  btnText: { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: '#1a0d11', fontWeight: '500' },
});
