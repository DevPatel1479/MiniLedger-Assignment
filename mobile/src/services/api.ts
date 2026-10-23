import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import type * as ImagePicker from 'expo-image-picker';
import type { AuthResult, Loan, Summary } from '../types';

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
export const API_BASE_URL = configuredBaseUrl || Platform.select({
  web: 'http://localhost:4000/api',
  android: 'http://10.0.2.2:4000/api',
  default: 'http://localhost:4000/api'
}) || 'http://localhost:4000/api';

export function apiOrigin(): string {
  return API_BASE_URL.replace(/\/api\/?$/, '');
}

export function receiptUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiOrigin()}${path.startsWith('/') ? '' : '/'}${path}`;
}

interface ApiErrorBody {
  error?: { message?: string; code?: string };
  message?: string;
}

async function request<T>(path: string, options: { token?: string; method?: string; body?: BodyInit | null; isMultipart?: boolean; fetcher?: typeof fetch } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body && !options.isMultipart) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    // SDK 57's Expo fetch transport supports FileSystem File objects in FormData.
    // Keep normal JSON requests on the platform fetch implementation.
    response = await (options.fetcher ?? fetch)(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ?? undefined
    });
  } catch (cause) {
    const detail = cause instanceof Error && cause.message ? ` Details: ${cause.message}` : '';
    if (options.isMultipart) {
      throw new Error(`The receipt upload failed before the API returned a response.${detail} Check the API terminal for POST /api/loans and confirm this device can reach ${API_BASE_URL}.`);
    }
    throw new Error(`Cannot reach the MiniLedger API at ${API_BASE_URL}. Check that the API is running and the URL is correct for this device.${detail}`);
  }

  const payload = (await response.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!response.ok) {
    const message = payload && 'error' in payload ? payload.error?.message : undefined;
    throw new Error(message || payload.message || `Request failed with status ${response.status}.`);
  }
  return payload;
}

type Envelope<T> = { data: T };

export const api = {
  async requestOtp(phone: string): Promise<void> {
    await request('/auth/request-otp', { method: 'POST', body: JSON.stringify({ phone }) });
  },

  async verifyOtp(phone: string, otp: string): Promise<AuthResult> {
    const result = await request<Envelope<AuthResult>>('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp }) });
    return result.data;
  },

  async getLoans(token: string): Promise<Loan[]> {
    const result = await request<Envelope<Loan[]>>('/loans', { token });
    return result.data;
  },

  async getSummary(token: string): Promise<Summary> {
    const result = await request<Envelope<Summary>>('/summary', { token });
    return result.data;
  },

  async createLoan(token: string, input: { friendName: string; amount: number; dueDate: string }, receipt?: ImagePicker.ImagePickerAsset | null): Promise<Loan> {
    const form = new FormData();
    form.append('friendName', input.friendName);
    form.append('amount', String(input.amount));
    form.append('dueDate', input.dueDate);

    let fetcher: typeof fetch | undefined;
    if (receipt) {
      const filename = receipt.fileName || `receipt-${Date.now()}.jpg`;
      if (Platform.OS === 'web') {
        const webAsset = receipt as ImagePicker.ImagePickerAsset & { file?: Blob | null };
        // Expo's web asset may expose a File, but fetching its URI returns a Blob.
        let file: Blob | undefined = webAsset.file ?? undefined;
        if (!file) {
          const imageResponse = await fetch(receipt.uri);
          if (!imageResponse.ok) throw new Error('Could not read the selected receipt image. Please select it again.');
          file = await imageResponse.blob();
        }
        if (!file) {
          throw new Error('Could not read the selected receipt image. Please select it again.');
        }
        form.append('receipt', file, filename);
      } else {
        // Expo SDK 57 / React Native 0.86 uses Expo's fetch for FileSystem File
        // parts. The older { uri, name, type } FormData convention can reject
        // before a request reaches Express and misleadingly look like an API outage.
        const nativeFile = new File(receipt.uri);
        if (nativeFile.size > 5 * 1024 * 1024) {
          throw new Error('Receipt photos must be 5 MB or smaller. Please choose a smaller image.');
        }
        form.append('receipt', nativeFile, filename);
        fetcher = expoFetch;
      }
    }

    const result = await request<Envelope<Loan>>('/loans', { token, method: 'POST', body: form, isMultipart: true, fetcher });
    return result.data;
  },

  async markRepaid(token: string, loanId: string): Promise<Loan> {
    const result = await request<Envelope<Loan>>(`/loans/${encodeURIComponent(loanId)}/repay`, { token, method: 'PATCH' });
    return result.data;
  }
};
