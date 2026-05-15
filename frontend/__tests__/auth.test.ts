import { authService } from '@/services/auth';

const mockStore = new Map<string, string>();
const mockFetch = jest.fn();
global.fetch = mockFetch as jest.Mock;

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
  deleteItemAsync: jest.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
}));

const user = {
  id: 'user-1',
  email: 'ana@example.com',
  is_validated: true,
};

function mockResponse(ok: boolean, status: number, body: unknown) {
  return {
    ok,
    status,
    text: jest.fn().mockResolvedValue(body === null ? '' : JSON.stringify(body)),
  };
}

describe('authService', () => {
  beforeEach(() => {
    mockStore.clear();
    mockFetch.mockReset();
  });

  it('stores token and user after login', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, 200, {
      access_token: 'token-1',
      token_type: 'bearer',
      user,
    }));

    const result = await authService.login({
      email: 'ana@example.com',
      password: 'secret123',
    });

    expect(result.access_token).toBe('token-1');
    expect(await authService.getToken()).toBe('token-1');
    expect(await authService.getStoredUser()).toEqual(user);
  });

  it('clears invalid stored users', async () => {
    mockStore.set('alima_user', '{bad json');

    await expect(authService.getStoredUser()).resolves.toBeNull();
    expect(mockStore.has('alima_user')).toBe(false);
  });

  it('restores a valid session from the saved token', async () => {
    mockStore.set('alima_access_token', 'token-1');
    mockFetch.mockResolvedValue(mockResponse(true, 200, user));

    await expect(authService.restoreSession()).resolves.toEqual(user);

    const headers = mockFetch.mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer token-1');
    expect(await authService.getStoredUser()).toEqual(user);
  });

  it('clears the session when restore fails', async () => {
    mockStore.set('alima_access_token', 'expired');
    mockStore.set('alima_user', JSON.stringify(user));
    mockFetch.mockResolvedValue(mockResponse(false, 401, { detail: 'No autorizado' }));

    await expect(authService.restoreSession()).resolves.toBeNull();
    expect(await authService.getToken()).toBeNull();
    expect(await authService.getStoredUser()).toBeNull();
  });
});
