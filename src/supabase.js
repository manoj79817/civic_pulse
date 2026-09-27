// Mock Supabase client using localStorage for hackathon demo without real OTPs

const getMockUser = (phone) => ({
  id: `mock-user-${Date.now()}`,
  phone: phone,
  email: 'mock@example.com',
  user_metadata: {
    display_name: 'Mock Citizen'
  }
});

let currentSession = JSON.parse(localStorage.getItem('mock_supabase_session')) || null;
const listeners = [];

export const supabase = {
  auth: {
    signInWithOtp: async ({ phone }) => {
      console.log('MOCK: Sending OTP to', phone);
      localStorage.setItem('mock_pending_phone', phone);
      // Simulate network delay
      await new Promise(r => setTimeout(r, 500));
      return { data: {}, error: null };
    },
    verifyOtp: async ({ phone, token }) => {
      console.log('MOCK: Verifying OTP', token, 'for', phone);
      const actualPhone = phone || localStorage.getItem('mock_pending_phone');
      const user = getMockUser(actualPhone);
      currentSession = { user, access_token: 'mock_token' };
      localStorage.setItem('mock_supabase_session', JSON.stringify(currentSession));
      
      // Notify listeners
      listeners.forEach(fn => fn('SIGNED_IN', currentSession));
      
      return { data: { session: currentSession, user }, error: null };
    },
    updateUser: async ({ data }) => {
      if (currentSession) {
        currentSession.user.user_metadata = { ...currentSession.user.user_metadata, ...data };
        localStorage.setItem('mock_supabase_session', JSON.stringify(currentSession));
      }
      return { data: { user: currentSession.user }, error: null };
    },
    signOut: async () => {
      currentSession = null;
      localStorage.removeItem('mock_supabase_session');
      listeners.forEach(fn => fn('SIGNED_OUT', null));
      return { error: null };
    },
    getUser: async () => {
      // Some components call getUser synchronously, return data object
      return { data: { user: currentSession?.user || null }, error: null };
    },
    getSession: async () => {
      return { data: { session: currentSession }, error: null };
    },
    onAuthStateChange: (callback) => {
      listeners.push(callback);
      return { data: { subscription: { unsubscribe: () => {
        const index = listeners.indexOf(callback);
        if (index > -1) listeners.splice(index, 1);
      } } } };
    },
    signInWithOAuth: async ({ provider }) => {
      console.log('MOCK: OAuth with', provider);
      return { data: {}, error: new Error('OAuth not supported in mock mode') };
    }
  }
};
