import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';
import { api, setAuthToken } from '../../lib/api';

jest.mock('../../lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  setAuthToken: jest.fn(),
}));
jest.mock('../../lib/chatApi', () => ({ setChatToken: jest.fn() }));
jest.mock('../../lib/propertyConfig', () => ({ setActiveOrgId: jest.fn() }));
jest.mock('../../lib/queryClient', () => ({ queryClient: { clear: jest.fn() } }));

const mockedPost = api.post as jest.Mock;
let auth: ReturnType<typeof useAuth>;

function AuthProbe() {
  auth = useAuth();
  return null;
}

function temporaryLoginResponse() {
  return {
    data: {
      data: {
        token: 'temporary-jwt',
        userId: 'employee-1',
        email: 'employee@hotel.com',
        firstName: 'Employee',
        middleName: null,
        lastName: 'One',
        mustChangePassword: true,
      },
    },
  };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );
  });
});

test('normal login routes a temporary-password user into password change without creating a session', async () => {
  mockedPost.mockResolvedValueOnce(temporaryLoginResponse());

  await act(async () => {
    await auth.login({ email: ' employee@hotel.com ', password: 'TempPass1' });
  });

  expect(auth.user).toBeNull();
  expect(auth.accessToken).toBeNull();
  expect(auth.passwordChangeEmail).toBe('employee@hotel.com');
  expect(setAuthToken).not.toHaveBeenCalledWith('temporary-jwt');
  expect(api.get).not.toHaveBeenCalled();
});

test('changes a temporary password with its JWT, clears the reset session, and requires a fresh login', async () => {
  mockedPost
    .mockResolvedValueOnce(temporaryLoginResponse())
    .mockResolvedValueOnce({ data: { data: { message: 'Password changed' } } });

  await act(async () => {
    await auth.startPasswordChange({ email: 'employee@hotel.com', password: 'TempPass1' });
  });
  await act(async () => {
    await auth.finishPasswordChange('PermanentPass1');
  });

  expect(mockedPost).toHaveBeenNthCalledWith(
    2,
    '/api/v1/auth/change-password',
    { currentPassword: 'TempPass1', newPassword: 'PermanentPass1' },
    { headers: { Authorization: 'Bearer temporary-jwt' } },
  );
  expect(auth.passwordChangeEmail).toBeNull();
  expect(auth.passwordChanged).toBe(true);
  expect(auth.user).toBeNull();
  expect(auth.accessToken).toBeNull();
  expect(setAuthToken).toHaveBeenCalledWith(null);
});
