import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Key, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner@2.0.3';


interface AuthPageProps {
  onLogin: (isAuthenticated: boolean) => void;
}

export function AuthPage({ onLogin }: AuthPageProps) {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  const validateMobileNumber = (number: string) => {
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(number);
  };

  const sendOtp = async () => {
    if (!validateMobileNumber(mobileNumber)) {
      toast.error('Please enter a valid mobile number');
      return;
    }

    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setShowOtp(true);
    setTimer(60);
    setLoading(false);
    toast.success('OTP sent successfully to your mobile number');

    // Timer countdown
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock OTP verification (in real app, this would be validated by backend)
    if (otp === '123456') {
      setLoading(false);
      toast.success(authMode === 'signin' ? 'Login successful!' : 'Account created successfully!');
      onLogin(true);
      navigate('/home');
    } else {
      setLoading(false);
      toast.error('Invalid OTP. Please try again.');
    }
  };

  const resendOtp = () => {
    if (timer > 0) return;
    sendOtp();
  };

  const resetForm = () => {
    setMobileNumber('');
    setOtp('');
    setShowOtp(false);
    setTimer(0);
  };

  const switchAuthMode = (mode: 'signin' | 'signup' | 'forgot') => {
    setAuthMode(mode);
    resetForm();
  };

  const getTitle = () => {
    switch (authMode) {
      case 'signin': return 'Sign In to Your Account';
      case 'signup': return 'Create Your Account';
      case 'forgot': return 'Reset Your Password';
      default: return 'Authentication';
    }
  };

  const getDescription = () => {
    switch (authMode) {
      case 'signin': return 'Welcome back! Please sign in to continue.';
      case 'signup': return 'Join thousands of users who trust Pocket Credit for their financial needs.';
      case 'forgot': return 'Enter your mobile number to reset your password.';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen py-12" style={{ backgroundColor: '#F0F4F8' }}>
      <div className="container mx-auto px-4 max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/home')}
          className="mb-6 p-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#0052FF' }}
              >
                <span className="text-white font-bold text-xl">PC</span>
              </div>
              <span className="text-2xl font-semibold" style={{ color: '#1E2A3B' }}>
                Pocket Credit
              </span>
            </div>
            
            <CardTitle style={{ color: '#1E2A3B' }}>
              {getTitle()}
            </CardTitle>
            <CardDescription className="text-base">
              {getDescription()}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {!showOtp ? (
              // Mobile Number Input
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="Enter your mobile number"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="pl-10"
                      maxLength={10}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    We'll send an OTP to this number for verification
                  </p>
                </div>

                <Button
                  onClick={sendOtp}
                  disabled={loading || !validateMobileNumber(mobileNumber)}
                  style={{ backgroundColor: '#0052FF' }}
                  className="w-full"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              </div>
            ) : (
              // OTP Verification
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600">
                    OTP sent to <span className="font-medium">+91 {mobileNumber}</span>
                  </p>
                  <button
                    onClick={() => {
                      setShowOtp(false);
                      setOtp('');
                    }}
                    className="text-xs text-blue-600 hover:underline mt-1"
                  >
                    Change number?
                  </button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="pl-10 text-center text-lg tracking-widest"
                      maxLength={6}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    For demo purposes, use OTP: <strong>123456</strong>
                  </p>
                </div>

                <div className="text-center">
                  {timer > 0 ? (
                    <p className="text-sm text-gray-500">
                      Resend OTP in {timer} seconds
                    </p>
                  ) : (
                    <button
                      onClick={resendOtp}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <Button
                  onClick={verifyOtp}
                  disabled={loading || otp.length !== 6}
                  style={{ backgroundColor: '#0052FF' }}
                  className="w-full text-white hover:opacity-90"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </Button>
              </div>
            )}

            {/* Auth Mode Switcher */}
            {!showOtp && (
              <div className="space-y-4 pt-4 border-t">
                {authMode === 'signin' ? (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600">
                      Don't have an account?{' '}
                      <button
                        onClick={() => switchAuthMode('signup')}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        Sign Up
                      </button>
                    </p>
                    <button
                      onClick={() => switchAuthMode('forgot')}
                      className="text-sm text-gray-500 hover:text-blue-600 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                ) : authMode === 'signup' ? (
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Already have an account?{' '}
                      <button
                        onClick={() => switchAuthMode('signin')}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        Sign In
                      </button>
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Remember your password?{' '}
                      <button
                        onClick={() => switchAuthMode('signin')}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        Sign In
                      </button>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Terms and Privacy */}
            <div className="text-center pt-4">
              <p className="text-xs text-gray-500">
                By continuing, you agree to our{' '}
                <button
                  onClick={() => navigate('/terms')}
                  className="text-blue-600 hover:underline"
                >
                  Terms & Conditions
                </button>{' '}
                and{' '}
                <button
                  onClick={() => navigate('/privacy')}
                  className="text-blue-600 hover:underline"
                >
                  Privacy Policy
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-700">
              Secured with 256-bit encryption
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}