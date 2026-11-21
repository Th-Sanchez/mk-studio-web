export type StudentStatus = 'NEW' | 'ACTIVE' | 'INACTIVE'

export type Gender = 'FEMALE' | 'MALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'

export type PrimaryGoal =
  | 'MUSCLE_HYPERTROPHY'
  | 'WEIGHT_LOSS'
  | 'MUSCLE_DEFINITION'
  | 'PHYSICAL_CONDITIONING'
  | 'STRENGTH_GAIN'
  | 'HEALTH_AND_QUALITY_OF_LIFE'
  | 'REHABILITATION_STRENGTHENING'
  | 'OTHER'

export type SleepQuality = 'POOR' | 'REGULAR' | 'GOOD' | 'EXCELLENT'

export type StressLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'

export interface YesNoDetail {
  answer: boolean
  details: string | null
}

export interface MedicalHistory {
  currentConditions: {
    diagnosedDisease: YesNoDetail
    heartProblem: YesNoDetail
    bloodPressureIssue: YesNoDetail
    diabetes: YesNoDetail
    respiratoryProblem: YesNoDetail
    jointProblem: YesNoDetail
    spineProblem: YesNoDetail
    frequentPain: YesNoDetail
    dizzinessOrFainting: YesNoDetail
    shortnessOfBreathDuringExercise: YesNoDetail
    otherHealthCondition: YesNoDetail
  }
  familyHistory: {
    heartDisease: boolean
    diabetes: boolean
    hypertension: boolean
    hereditaryDiseases: YesNoDetail
    otherRelevantHistory: string | null
  }
  lifestyleHabits: {
    smokes: boolean
    usedToSmoke: boolean
    frequentAlcoholConsumption: boolean
    sleepQuality: SleepQuality
    sleepHoursPerNight: number
    stressLevel: StressLevel
  }
  injuryHistory: {
    fracture: YesNoDetail
    dislocation: YesNoDetail
    muscleInjury: YesNoDetail
    ligamentInjury: YesNoDetail
    movementLimitation: YesNoDetail
    painDuringSpecificMovements: YesNoDetail
    surgeryOrMedicalProcedure: YesNoDetail
    stoppedExerciseForHealthReason: YesNoDetail
    medicalRestrictionForExercise: YesNoDetail
  }
  medicationsAndCare: {
    usesMedication: boolean
    medicationsList: string | null
    regularMedicalFollowUp: boolean
    physiotherapyFollowUp: boolean
    medicalRecommendationOrRestriction: YesNoDetail
    hasRecentHealthExams: boolean
  }
}

export interface PhysicalActivityHistory {
  practicedWeightTraining: boolean
  weightTrainingDuration: string | null
  currentlyActive: boolean
  currentActivity: string | null
  currentWeeklyFrequency: number | null
  timeInactive: string | null
  negativeExperienceDuringExercise: YesNoDetail
}

export interface AddressData {
  zipCode: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
}

export interface EmergencyContactData {
  fullName: string
  relationship: string
  phone: string
}

export interface PhysicalAssessmentInput {
  weightKg: number | null
  heightCm: number | null
  bodyFatPercentage: number | null
  muscleMassKg: number | null
  bloodPressure: string | null
  restingHeartRate: number | null
}

export interface PublicRegistrationPayload {
  personalData: {
    fullName: string
    birthDate: string
    gender: Gender
    phone: string
    email: string | null
    address: AddressData
  }
  emergencyContact: EmergencyContactData
  medicalHistory: MedicalHistory
  physicalActivityHistory: PhysicalActivityHistory
  goalsAndExpectations: {
    primaryGoal: PrimaryGoal
    primaryGoalOther: string | null
    secondaryGoal: string | null
    focusBodyArea: string | null
    weeklyAvailability: string
    intendedWeeklyFrequency: number
  }
  physicalAssessment: PhysicalAssessmentInput
  consent: {
    termsVersion: string
    termsAccepted: boolean
    lgpdConsentAccepted: boolean
    signerName: string
    signatureImage: string
  }
}

export interface PublicRegistrationResponse {
  studentId: string
  anamnesisId: string
  fullName: string
  status: StudentStatus
  signedAt: string
}

export interface TermsResponse {
  version: string
  title: string
  paragraphs: string[]
  termsAcceptanceLabel: string
  lgpdConsentLabel: string
}

export interface StudentSummaryCounts {
  total: number
  newCount: number
  activeCount: number
  inactiveCount: number
  withHealthAlertsCount: number
}

export interface StudentListItem {
  id: string
  fullName: string
  age: number
  phone: string
  primaryGoal: PrimaryGoal | null
  primaryGoalOther: string | null
  weeklyAvailability: string | null
  intendedWeeklyFrequency: number | null
  hasHealthAlerts: boolean
  healthAlertsCount: number
  healthAlerts: string[]
  status: StudentStatus
  createdAt: string
}

export interface PagedResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface StudentDetail {
  id: string
  fullName: string
  birthDate: string
  age: number
  gender: Gender
  phone: string
  email: string | null
  address: AddressData
  emergencyContact: EmergencyContactData
  status: StudentStatus
  createdAt: string
  updatedAt: string
  latestAnamnesis: {
    id: string
    medicalHistory: MedicalHistory
    physicalActivityHistory: PhysicalActivityHistory
    primaryGoal: PrimaryGoal
    primaryGoalOther: string | null
    secondaryGoal: string | null
    focusBodyArea: string | null
    weeklyAvailability: string
    intendedWeeklyFrequency: number
    physicalAssessment: PhysicalAssessmentInput & {
      professionalNotes: string | null
    }
    hasHealthAlerts: boolean
    healthAlertsCount: number
    healthAlerts: string[]
    consent: {
      termsVersion: string
      termsAccepted: boolean
      lgpdConsentAccepted: boolean
      signerName: string
      signatureImage: string
      signedAt: string
    }
    createdAt: string
    updatedAt: string
  } | null
}

export interface UpdateStudentPayload {
  fullName: string
  birthDate: string
  gender: Gender
  phone: string
  email: string | null
  address: AddressData
  emergencyContact: EmergencyContactData
  status: StudentStatus
}

export interface UpdateAssessmentPayload extends PhysicalAssessmentInput {
  professionalNotes: string | null
}

export const GENDER_LABELS: Record<Gender, string> = {
  FEMALE: 'Feminino',
  MALE: 'Masculino',
  OTHER: 'Outro',
  PREFER_NOT_TO_SAY: 'Prefiro não informar',
}

export const STATUS_LABELS: Record<StudentStatus, string> = {
  NEW: 'Novo',
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
}

export const PRIMARY_GOAL_LABELS: Record<PrimaryGoal, string> = {
  MUSCLE_HYPERTROPHY: 'Hipertrofia muscular',
  WEIGHT_LOSS: 'Emagrecimento',
  MUSCLE_DEFINITION: 'Definição muscular',
  PHYSICAL_CONDITIONING: 'Condicionamento físico',
  STRENGTH_GAIN: 'Ganho de força',
  HEALTH_AND_QUALITY_OF_LIFE: 'Saúde e qualidade de vida',
  REHABILITATION_STRENGTHENING: 'Reabilitação / fortalecimento',
  OTHER: 'Outros',
}

export const SLEEP_QUALITY_LABELS: Record<SleepQuality, string> = {
  POOR: 'Ruim',
  REGULAR: 'Regular',
  GOOD: 'Boa',
  EXCELLENT: 'Excelente',
}

export const STRESS_LEVEL_LABELS: Record<StressLevel, string> = {
  LOW: 'Baixo',
  MODERATE: 'Moderado',
  HIGH: 'Alto',
  VERY_HIGH: 'Muito alto',
}

export const FALLBACK_TERMS: TermsResponse = {
  version: 'v1',
  title: 'TERMO DE RESPONSABILIDADE – MK STUDIO',
  paragraphs: [
    'Declaro que todas as informações fornecidas nesta anamnese são verdadeiras e completas, comprometendo-me a informar ao MK STUDIO qualquer alteração no meu estado de saúde, surgimento de lesões, dores, limitações físicas ou diagnóstico médico durante o período em que estiver realizando atividades no estabelecimento.',
    'Declaro estar ciente de que a prática de atividades físicas exige atenção às minhas condições individuais de saúde e que devo respeitar as orientações dos profissionais responsáveis.',
    'Comprometo-me a comunicar imediatamente qualquer desconforto, dor ou mal-estar durante a realização dos exercícios.',
    'Declaro também que estou ciente de que a omissão de informações relevantes sobre minha saúde pode comprometer a segurança e a qualidade da prescrição dos exercícios.',
  ],
  termsAcceptanceLabel: 'Declaro que li e concordo com as informações acima.',
  lgpdConsentLabel:
    'Autorizo o tratamento dos meus dados pessoais e dados de saúde para fins de avaliação, planejamento e acompanhamento das atividades físicas, conforme a LGPD.',
}

export function createInitialYesNo(): YesNoDetail {
  return { answer: false, details: null }
}

export function createDefaultRegistrationPayload(): PublicRegistrationPayload {
  return {
    personalData: {
      fullName: '',
      birthDate: '',
      gender: 'FEMALE',
      phone: '',
      email: null,
      address: {
        zipCode: '',
        street: '',
        number: '',
        complement: null,
        neighborhood: '',
        city: '',
        state: '',
      },
    },
    emergencyContact: {
      fullName: '',
      relationship: '',
      phone: '',
    },
    medicalHistory: {
      currentConditions: {
        diagnosedDisease: createInitialYesNo(),
        heartProblem: createInitialYesNo(),
        bloodPressureIssue: createInitialYesNo(),
        diabetes: createInitialYesNo(),
        respiratoryProblem: createInitialYesNo(),
        jointProblem: createInitialYesNo(),
        spineProblem: createInitialYesNo(),
        frequentPain: createInitialYesNo(),
        dizzinessOrFainting: createInitialYesNo(),
        shortnessOfBreathDuringExercise: createInitialYesNo(),
        otherHealthCondition: createInitialYesNo(),
      },
      familyHistory: {
        heartDisease: false,
        diabetes: false,
        hypertension: false,
        hereditaryDiseases: createInitialYesNo(),
        otherRelevantHistory: null,
      },
      lifestyleHabits: {
        smokes: false,
        usedToSmoke: false,
        frequentAlcoholConsumption: false,
        sleepQuality: 'GOOD',
        sleepHoursPerNight: 7,
        stressLevel: 'MODERATE',
      },
      injuryHistory: {
        fracture: createInitialYesNo(),
        dislocation: createInitialYesNo(),
        muscleInjury: createInitialYesNo(),
        ligamentInjury: createInitialYesNo(),
        movementLimitation: createInitialYesNo(),
        painDuringSpecificMovements: createInitialYesNo(),
        surgeryOrMedicalProcedure: createInitialYesNo(),
        stoppedExerciseForHealthReason: createInitialYesNo(),
        medicalRestrictionForExercise: createInitialYesNo(),
      },
      medicationsAndCare: {
        usesMedication: false,
        medicationsList: null,
        regularMedicalFollowUp: false,
        physiotherapyFollowUp: false,
        medicalRecommendationOrRestriction: createInitialYesNo(),
        hasRecentHealthExams: false,
      },
    },
    physicalActivityHistory: {
      practicedWeightTraining: false,
      weightTrainingDuration: null,
      currentlyActive: false,
      currentActivity: null,
      currentWeeklyFrequency: null,
      timeInactive: null,
      negativeExperienceDuringExercise: createInitialYesNo(),
    },
    goalsAndExpectations: {
      primaryGoal: 'HEALTH_AND_QUALITY_OF_LIFE',
      primaryGoalOther: null,
      secondaryGoal: null,
      focusBodyArea: null,
      weeklyAvailability: '',
      intendedWeeklyFrequency: 3,
    },
    physicalAssessment: {
      weightKg: null,
      heightCm: null,
      bodyFatPercentage: null,
      muscleMassKg: null,
      bloodPressure: null,
      restingHeartRate: null,
    },
    consent: {
      termsVersion: 'v1',
      termsAccepted: false,
      lgpdConsentAccepted: false,
      signerName: '',
      signatureImage: '',
    },
  }
}
