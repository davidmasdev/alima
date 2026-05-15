import { ApiError, apiRequest } from '@/services/api';

const mockFetch = jest.fn();
global.fetch = mockFetch as jest.Mock;

function mockResponse(ok: boolean, status: number, body: unknown) {
  return {
    ok,
    status,
    text: jest.fn().mockResolvedValue(body === null ? '' : JSON.stringify(body)),
  };
}

describe('apiRequest', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('serializes JSON requests and adds bearer token', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, 200, { ok: true }));

    const result = await apiRequest<{ ok: boolean }>('/profile', {
      method: 'PUT',
      body: JSON.stringify({ nombre: 'Ana' }),
      token: 'access-token',
    });

    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/profile',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ nombre: 'Ana' }),
        headers: expect.any(Headers),
      }),
    );

    const headers = mockFetch.mock.calls[0][1].headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer access-token');
  });

  it('throws ApiError with backend detail on failed requests', async () => {
    mockFetch.mockResolvedValue(mockResponse(false, 422, { detail: [{ msg: 'Campo invalido' }] }));

    await expect(apiRequest('/profile', { method: 'PUT' })).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        status: 422,
        detail: 'Campo invalido',
      }),
    );
  });

  it('throws a connection error when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('network'));

    await expect(apiRequest('/profile')).rejects.toEqual(
      new ApiError(0, 'No se pudo conectar con el servidor'),
    );
  });

  it('returns null for successful responses without body', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, 204, null));

    await expect(apiRequest('/profile', { method: 'DELETE' })).resolves.toBeNull();
  });
});
