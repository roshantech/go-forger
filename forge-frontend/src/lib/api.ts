import axios from 'axios'
import { getToken, clearToken } from './auth'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Clear token and redirect on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearToken()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
}

export const authApi = {
  register: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { email, password }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),

  forgotPassword: (email: string) =>
    api.post<{ message: string; token?: string }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, newPassword }),

  me: () => api.get<User>('/auth/me'),
}

// ─── AST ─────────────────────────────────────────────────────────────────────

export interface ImportInfo {
  path: string
  alias?: string
}

export interface FunctionInfo {
  name: string
  receiver?: string
  params: string[]
  returns: string[]
  isExported: boolean
  lineStart: number
  lineEnd: number
  comment?: string
}

export interface FieldInfo {
  name: string
  type: string
  tag?: string
  comment?: string
}

export interface TypeInfo {
  name: string
  kind: string
  fields?: FieldInfo[]
  isExported: boolean
  lineStart: number
  lineEnd: number
}

export interface MethodInfo {
  name: string
  params: string[]
  returns: string[]
}

export interface InterfaceInfo {
  name: string
  methods: MethodInfo[]
  isExported: boolean
  lineStart: number
  lineEnd: number
}

export interface VarInfo {
  name: string
  type?: string
  value?: string
  isExported: boolean
}

export interface FileInspection {
  fileName: string
  packageName: string
  imports: ImportInfo[]
  functions: FunctionInfo[]
  types: TypeInfo[]
  interfaces: InterfaceInfo[]
  variables: VarInfo[]
  constants: VarInfo[]
  parseErrors?: string[]
}

export const astApi = {
  inspectFile: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<FileInspection>('/ast/inspect', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  inspectRaw: (fileName: string, content: string) =>
    api.post<FileInspection>('/ast/inspect-raw', { fileName, content }),

  treeFile: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<TreeNode>('/ast/tree', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  treeRaw: (fileName: string, content: string) =>
    api.post<TreeNode>('/ast/tree-raw', { fileName, content }),
}

// ─── Projects ────────────────────────────────────────────────────────────────

export interface Project {
  id: string
  userId: string
  name: string
  description: string
  language: string
  createdAt: string
  updatedAt: string
}

export interface ProjectFile {
  id: string
  projectId: string
  path: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface ProjectWithFiles extends Project {
  files: ProjectFile[]
}

export const projectApi = {
  create: (name: string, description: string, language: string) =>
    api.post<Project>('/projects', { name, description, language }),

  list: () =>
    api.get<{ projects: Project[] }>('/projects'),

  get: (id: string) =>
    api.get<ProjectWithFiles>(`/projects/${id}`),

  delete: (id: string) =>
    api.delete(`/projects/${id}`),

  uploadFiles: (projectId: string, files: File[]) => {
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    return api.post<{ uploaded: ProjectFile[] }>(`/projects/${projectId}/files`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getFile: (projectId: string, path: string) =>
    api.get<ProjectFile>(`/projects/${projectId}/files/${path}`),
}

// ─── AST Tree ────────────────────────────────────────────────────────────────

export interface TreeNode {
  id: string
  type: string
  category: string
  name?: string
  value?: string
  line?: number
  col?: number
  endLine?: number
  endCol?: number
  props?: Record<string, string>
  children?: TreeNode[]
}
