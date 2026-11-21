import { apiRequest } from './api'
import type {
  PagedResponse,
  PublicRegistrationPayload,
  PublicRegistrationResponse,
  StudentDetail,
  StudentListItem,
  StudentStatus,
  StudentSummaryCounts,
  TermsResponse,
  UpdateAssessmentPayload,
  UpdateStudentPayload,
} from '../types/anamnesis'

export function fetchCurrentTerms(): Promise<TermsResponse> {
  return apiRequest<TermsResponse>('/public/terms/current')
}

export function submitPublicRegistration(
  payload: PublicRegistrationPayload,
): Promise<PublicRegistrationResponse> {
  return apiRequest<PublicRegistrationResponse>('/public/registrations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchStudentsSummary(): Promise<StudentSummaryCounts> {
  return apiRequest<StudentSummaryCounts>('/admin/students/summary', {}, true)
}

export interface ListStudentsParams {
  search?: string
  status?: StudentStatus | ''
  onlyHealthAlerts?: boolean
  page?: number
  size?: number
}

export function fetchStudents(params: ListStudentsParams = {}): Promise<PagedResponse<StudentListItem>> {
  const query = new URLSearchParams()
  if (params.search && params.search.trim()) {
    query.set('search', params.search.trim())
  }
  if (params.status) {
    query.set('status', params.status)
  }
  if (params.onlyHealthAlerts) {
    query.set('onlyHealthAlerts', 'true')
  }
  query.set('page', String(params.page ?? 0))
  query.set('size', String(params.size ?? 20))

  return apiRequest<PagedResponse<StudentListItem>>(`/admin/students?${query.toString()}`, {}, true)
}

export function fetchStudentDetail(id: string): Promise<StudentDetail> {
  return apiRequest<StudentDetail>(`/admin/students/${id}`, {}, true)
}

export function updateStudent(id: string, payload: UpdateStudentPayload): Promise<StudentDetail> {
  return apiRequest<StudentDetail>(
    `/admin/students/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    true,
  )
}

export function updateStudentAssessment(
  studentId: string,
  anamnesisId: string,
  payload: UpdateAssessmentPayload,
): Promise<StudentDetail> {
  return apiRequest<StudentDetail>(
    `/admin/students/${studentId}/anamnesis/${anamnesisId}/assessment`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    true,
  )
}

export function updateStudentStatus(id: string, status: StudentStatus): Promise<StudentDetail> {
  return apiRequest<StudentDetail>(
    `/admin/students/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    true,
  )
}

export function deleteStudent(id: string): Promise<void> {
  return apiRequest<void>(`/admin/students/${id}`, { method: 'DELETE' }, true)
}
