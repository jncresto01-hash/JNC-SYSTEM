export interface SurveyIndicator {
  id: string;
  label: string;
  type: 'rating' | 'text';
  required: boolean;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  indicators: SurveyIndicator[];
  createdAt: any;
  updatedAt: any;
  active: boolean;
  createdBy: string;
}

export interface Response {
  id: string;
  surveyId: string;
  answers: Record<string, string | number>;
  customerName?: string;
  customerPhone?: string;
  suggestions?: string;
  submittedAt: any;
  customerVisitDate: string;
  metadata: {
    device: string;
    browser: string;
    userAgent: string;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  birthday: string;
  memberId: string;
  memberType: 'Umum' | 'Corporate' | 'FOC';
  companyName?: string;
  registeredAt: any;
  expiresAt: any;
  lastBirthdayGreetedYear?: number;
}

export interface ActivityLog {
  id: string;
  memberPhone?: string;
  adminEmail?: string;
  type: 'SURVEY_SUBMISSION' | 'BIRTHDAY_GREETING' | 'REGISTRATION' | 'ADMIN_ACTION';
  action?: string;
  timestamp: any;
  details: string;
  surveyId?: string;
}

export interface EmployeeFOC {
  id: string;
  focId: string;
  name: string;
  phone: string;
  companyName: string;
  position: string;
  discountValue: number;
  approvedBy: string;
  validUntil: any;
  active: boolean;
  createdAt: any;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  originalPrice?: number;
  discountedPrice?: number;
  active: boolean;
  createdAt: any;
}
