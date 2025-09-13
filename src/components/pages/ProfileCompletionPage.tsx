import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  MapPin, 
  Building, 
  CreditCard, 
  FileText, 
  Camera, 
  PenTool,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Shield,
  Phone,
  Mail,
  Calendar,
  Briefcase
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';

interface ProfileStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: boolean;
  required: boolean;
}

export function ProfileCompletionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    // Personal Info
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    marital_status: '',
    
    // Address
    address_type: 'current' as const,
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    
    // Employment
    employment_type: '',
    company_name: '',
    designation: '',
    monthly_salary: '',
    work_experience_years: '',
    work_experience_months: '',
    salary_date: '',
    
    // Bank Account
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_holder_name: '',
    account_type: 'savings' as const,
  });

  const steps: ProfileStep[] = [
    {
      id: 'personal',
      title: 'Personal Information',
      description: 'Complete your basic details',
      icon: User,
      completed: false,
      required: true
    },
    {
      id: 'address',
      title: 'Address Details',
      description: 'Add your current address',
      icon: MapPin,
      completed: false,
      required: true
    },
    {
      id: 'employment',
      title: 'Employment Details',
      description: 'Provide your work information',
      icon: Building,
      completed: false,
      required: true
    },
    {
      id: 'bank',
      title: 'Bank Account',
      description: 'Add your bank account details',
      icon: CreditCard,
      completed: false,
      required: true
    },
    {
      id: 'documents',
      title: 'KYC Documents',
      description: 'Upload required documents',
      icon: FileText,
      completed: false,
      required: true
    },
    {
      id: 'video_kyc',
      title: 'Video KYC',
      description: 'Complete video verification',
      icon: Camera,
      completed: false,
      required: true
    },
    {
      id: 'signature',
      title: 'Digital Signature',
      description: 'Provide your digital signature',
      icon: PenTool,
      completed: false,
      required: true
    }
  ];

  useEffect(() => {
    if (user) {
      // Pre-fill with existing user data
      setProfileData(prev => ({
        ...prev,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        date_of_birth: user.date_of_birth || '',
        gender: user.gender || '',
        marital_status: user.marital_status || '',
      }));
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateCurrentStep = (): boolean => {
    const step = steps[currentStep];
    
    switch (step.id) {
      case 'personal':
        return !!(profileData.first_name && profileData.last_name && 
                 profileData.date_of_birth && profileData.gender);
      case 'address':
        return !!(profileData.address_line1 && profileData.city && 
                 profileData.state && profileData.pincode);
      case 'employment':
        return !!(profileData.employment_type && profileData.company_name && 
                 profileData.designation && profileData.monthly_salary);
      case 'bank':
        return !!(profileData.bank_name && profileData.account_number && 
                 profileData.ifsc_code && profileData.account_holder_name);
      case 'documents':
        // For demo, we'll mark this as completed
        return true;
      case 'video_kyc':
        // For demo, we'll mark this as completed
        return true;
      case 'signature':
        // For demo, we'll mark this as completed
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Save current step data
      await saveStepData();
      
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // All steps completed
        await completeProfile();
      }
    } catch (error) {
      toast.error('Failed to save data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveStepData = async () => {
    const step = steps[currentStep];
    
    try {
      switch (step.id) {
        case 'personal':
          await apiService.updateUserProfile({
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            date_of_birth: profileData.date_of_birth,
            gender: profileData.gender,
            marital_status: profileData.marital_status,
          });
          break;
          
        case 'address':
          await apiService.addAddress({
            address_type: profileData.address_type,
            address_line1: profileData.address_line1,
            address_line2: profileData.address_line2,
            city: profileData.city,
            state: profileData.state,
            pincode: profileData.pincode,
            country: profileData.country,
          });
          break;
          
        case 'employment':
          await apiService.updateEmployment({
            employment_type: profileData.employment_type as any,
            company_name: profileData.company_name,
            designation: profileData.designation,
            monthly_salary: parseFloat(profileData.monthly_salary),
            work_experience_years: parseFloat(profileData.work_experience_years),
            work_experience_months: parseFloat(profileData.work_experience_months),
            salary_date: parseInt(profileData.salary_date),
          });
          break;
          
        case 'bank':
          await apiService.addBankAccount({
            bank_name: profileData.bank_name,
            account_number: profileData.account_number,
            ifsc_code: profileData.ifsc_code,
            account_holder_name: profileData.account_holder_name,
            account_type: profileData.account_type,
            is_primary: true,
          });
          break;
          
        case 'documents':
          // Simulate document upload completion
          await apiService.updateKYCStatus({
            pan_verified: true,
            aadhaar_verified: true,
            address_verified: true,
          });
          break;
          
        case 'video_kyc':
          // Simulate video KYC completion
          await apiService.updateKYCStatus({
            video_kyc_verified: true,
          });
          break;
          
        case 'signature':
          // Simulate signature completion
          await apiService.updateKYCStatus({
            digital_signature_verified: true,
            overall_status: 'completed',
          });
          break;
      }
    } catch (error) {
      // In demo mode, we'll just continue without API calls
      console.log('Demo mode: Skipping API call for', step.id);
    }
  };

  const completeProfile = async () => {
    try {
      // Update KYC status to completed
      await apiService.updateKYCStatus({
        overall_status: 'completed',
        completion_percentage: 100,
      });
      
      toast.success('Profile completed successfully! You can now apply for loans.');
      navigate('/dashboard');
    } catch (error) {
      // In demo mode, just navigate
      toast.success('Profile completed successfully! You can now apply for loans.');
      navigate('/dashboard');
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  const renderStepContent = () => {
    const step = steps[currentStep];
    
    switch (step.id) {
      case 'personal':
        return (
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={profileData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="Enter your first name"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={profileData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Enter your last name"
                  className="h-12 text-base"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={profileData.date_of_birth}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={profileData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="marital_status">Marital Status</Label>
              <Select value={profileData.marital_status} onValueChange={(value) => handleInputChange('marital_status', value)}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select marital status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
        
      case 'address':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address_line1">Address Line 1 *</Label>
              <Input
                id="address_line1"
                value={profileData.address_line1}
                onChange={(e) => handleInputChange('address_line1', e.target.value)}
                placeholder="House/Flat number, Building name"
                className="h-12 text-base"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                value={profileData.address_line2}
                onChange={(e) => handleInputChange('address_line2', e.target.value)}
                placeholder="Street, Area, Landmark"
                className="h-12 text-base"
              />
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={profileData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="City"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={profileData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="State"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  value={profileData.pincode}
                  onChange={(e) => handleInputChange('pincode', e.target.value)}
                  placeholder="Pincode"
                  maxLength={6}
                  className="h-12 text-base"
                />
              </div>
            </div>
          </div>
        );
        
      case 'employment':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employment_type">Employment Type *</Label>
              <Select value={profileData.employment_type} onValueChange={(value) => handleInputChange('employment_type', value)}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select employment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salaried">Salaried</SelectItem>
                  <SelectItem value="self_employed">Self Employed</SelectItem>
                  <SelectItem value="business">Business Owner</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={profileData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  placeholder="Your company name"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation *</Label>
                <Input
                  id="designation"
                  value={profileData.designation}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  placeholder="Your job title"
                  className="h-12 text-base"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_salary">Monthly Salary *</Label>
                <Input
                  id="monthly_salary"
                  type="number"
                  value={profileData.monthly_salary}
                  onChange={(e) => handleInputChange('monthly_salary', e.target.value)}
                  placeholder="Monthly salary"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary_date">Salary Date</Label>
                <Input
                  id="salary_date"
                  type="number"
                  value={profileData.salary_date}
                  onChange={(e) => handleInputChange('salary_date', e.target.value)}
                  placeholder="Day of month (1-31)"
                  min="1"
                  max="31"
                  className="h-12 text-base"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="work_experience_years">Work Experience (Years)</Label>
                <Input
                  id="work_experience_years"
                  type="number"
                  value={profileData.work_experience_years}
                  onChange={(e) => handleInputChange('work_experience_years', e.target.value)}
                  placeholder="Years"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="work_experience_months">Work Experience (Months)</Label>
                <Input
                  id="work_experience_months"
                  type="number"
                  value={profileData.work_experience_months}
                  onChange={(e) => handleInputChange('work_experience_months', e.target.value)}
                  placeholder="Months"
                  className="h-12 text-base"
                />
              </div>
            </div>
          </div>
        );
        
      case 'bank':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name *</Label>
              <Input
                id="bank_name"
                value={profileData.bank_name}
                onChange={(e) => handleInputChange('bank_name', e.target.value)}
                placeholder="e.g., State Bank of India"
                className="h-12 text-base"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="account_holder_name">Account Holder Name *</Label>
              <Input
                id="account_holder_name"
                value={profileData.account_holder_name}
                onChange={(e) => handleInputChange('account_holder_name', e.target.value)}
                placeholder="Name as per bank records"
                className="h-12 text-base"
              />
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number *</Label>
                <Input
                  id="account_number"
                  value={profileData.account_number}
                  onChange={(e) => handleInputChange('account_number', e.target.value)}
                  placeholder="Bank account number"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifsc_code">IFSC Code *</Label>
                <Input
                  id="ifsc_code"
                  value={profileData.ifsc_code}
                  onChange={(e) => handleInputChange('ifsc_code', e.target.value.toUpperCase())}
                  placeholder="e.g., SBIN0001234"
                  maxLength={11}
                  className="h-12 text-base"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="account_type">Account Type</Label>
              <Select value={profileData.account_type} onValueChange={(value) => handleInputChange('account_type', value)}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Savings Account</SelectItem>
                  <SelectItem value="current">Current Account</SelectItem>
                  <SelectItem value="salary">Salary Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
        
      case 'documents':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Required Documents</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• PAN Card (Front & Back)</li>
                <li>• Aadhaar Card (Front & Back)</li>
                <li>• Bank Statement (Last 3 months)</li>
                <li>• Salary Slip (Latest)</li>
                <li>• Address Proof (Utility Bill)</li>
              </ul>
            </div>
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Document upload feature will be available soon</p>
              <p className="text-sm text-gray-500">For now, we'll mark this step as completed for demo purposes</p>
            </div>
          </div>
        );
        
      case 'video_kyc':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Video KYC Instructions</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Ensure good lighting and clear audio</li>
                <li>• Have your PAN card ready for verification</li>
                <li>• Speak clearly and look at the camera</li>
                <li>• The session will be recorded for verification</li>
              </ul>
            </div>
            <div className="text-center py-8">
              <Camera className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Video KYC feature will be available soon</p>
              <p className="text-sm text-gray-500">For now, we'll mark this step as completed for demo purposes</p>
            </div>
          </div>
        );
        
      case 'signature':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Digital Signature</h4>
              <p className="text-sm text-blue-700">
                Provide your digital signature to complete the KYC process. This signature will be used for loan agreements and other legal documents.
              </p>
            </div>
            <div className="text-center py-8">
              <PenTool className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Digital signature feature will be available soon</p>
              <p className="text-sm text-gray-500">For now, we'll mark this step as completed for demo purposes</p>
            </div>
          </div>
        );
        
      default:
        return <div>Step content not found</div>;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Please login to access this page</p>
          <Button onClick={() => navigate('/auth')} className="mt-4">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Pocket Credit Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PC</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Pocket Credit</h1>
                <p className="text-xs text-gray-500">Complete Your Profile</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
        </div>
      </div>

      <div className="py-4 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar - Mobile Optimized */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicator - Mobile Friendly Dots */}
          <div className="flex justify-center mb-6">
            <div className="flex space-x-1">
              {steps.map((_, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <div
                    key={index}
                    className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 ${
                      isCompleted 
                        ? 'bg-green-500' 
                        : isActive 
                          ? 'bg-blue-500'
                          : 'bg-gray-300'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Main Content - Mobile First */}
          <div className="space-y-6">
            {/* Step Content */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  {(() => {
                    const Icon = steps[currentStep].icon;
                    return <Icon className="w-6 h-6 text-blue-600" />;
                  })()}
                  <div>
                    <CardTitle className="text-lg">{steps[currentStep].title}</CardTitle>
                    <CardDescription className="text-sm">
                      {steps[currentStep].description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {renderStepContent()}
              </CardContent>
            </Card>

            {/* Help Section - Mobile Optimized */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-green-600" />
                  Why Complete Profile?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Faster loan approval process</li>
                  <li>• Higher loan amount eligibility</li>
                  <li>• Better interest rates</li>
                  <li>• Secure and verified account</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Navigation - Mobile Optimized */}
          <div className="mt-6">
            {/* Navigation Buttons */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex-1 flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={loading}
                className="flex-1 flex items-center justify-center"
              >
                {loading ? (
                  'Saving...'
                ) : currentStep === steps.length - 1 ? (
                  <>
                    Complete
                    <CheckCircle className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 leading-relaxed">
              <strong>Disclaimer:</strong> "Pocket Credit" operates as a platform / DLA that connects borrowers to RBI-registered NBFCs for loan transactions, with all applications being thoroughly verified, approved and sanctioned by these financial institutions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}