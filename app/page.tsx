'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { callAIAgent, uploadFiles } from '@/lib/aiAgent'
import type { AIAgentResponse } from '@/lib/aiAgent'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import {
  FiUpload,
  FiCheck,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiMail,
  FiTrash2,
  FiUser,
  FiActivity,
  FiAlertCircle,
  FiClock,
  FiRefreshCw,
  FiAward,
  FiBriefcase,
  FiStar,
  FiFileText,
} from 'react-icons/fi'

// ============================================================
// Constants
// ============================================================

const AGENT_ID = '6997e0e382553f2b07a0dc97'
const AGENT_NAME = 'Resume Screening Agent'

const THEME_VARS = {
  '--background': '0 0% 100%',
  '--foreground': '222 47% 11%',
  '--card': '0 0% 98%',
  '--card-foreground': '222 47% 11%',
  '--primary': '222 47% 11%',
  '--primary-foreground': '210 40% 98%',
  '--secondary': '210 40% 96%',
  '--secondary-foreground': '222 47% 11%',
  '--muted': '210 40% 94%',
  '--muted-foreground': '215 16% 47%',
  '--border': '214 32% 91%',
  '--input': '214 32% 85%',
  '--destructive': '0 84% 60%',
  '--accent': '210 40% 92%',
  '--radius': '0.875rem',
} as React.CSSProperties

// ============================================================
// Types
// ============================================================

interface SkillsMatch {
  matched_skills?: string[]
  missing_skills?: string[]
  score?: number
}

interface ExperienceEvaluation {
  summary?: string
  years_relevant?: string
  score?: number
}

interface NiceToHaves {
  matched?: string[]
  score?: number
}

interface ScreeningResult {
  candidate_name?: string
  fit_status?: string
  overall_score?: number
  skills_match?: SkillsMatch
  experience_evaluation?: ExperienceEvaluation
  nice_to_haves?: NiceToHaves
  recommendation?: string
  email_sent?: boolean
  email_summary?: string
}

interface HistoryEntry {
  id: string
  candidateName: string
  fitStatus: string
  overallScore: number
  timestamp: string
  data: ScreeningResult
}

// ============================================================
// Sample Data
// ============================================================

const SAMPLE_RESULT: ScreeningResult = {
  candidate_name: 'Sarah Chen',
  fit_status: 'fit',
  overall_score: 87,
  skills_match: {
    matched_skills: [
      'Kubernetes',
      'Docker',
      'Terraform',
      'AWS',
      'Python',
      'CI/CD Pipelines',
      'Linux Administration',
      'Monitoring (Prometheus/Grafana)',
    ],
    missing_skills: ['Azure DevOps', 'Pulumi'],
    score: 85,
  },
  experience_evaluation: {
    summary:
      'Sarah has 6+ years of experience in platform and infrastructure engineering roles. She led a team of 4 engineers at her current company to migrate 120+ microservices to Kubernetes, reducing deployment times by 70%. Her background includes strong DevOps practices, infrastructure-as-code expertise, and experience with high-availability production systems serving millions of requests per day.',
    years_relevant: '6 years',
    score: 90,
  },
  nice_to_haves: {
    matched: [
      'Open-source contributions (CNCF projects)',
      'Conference speaker (KubeCon 2023)',
      'Mentoring experience',
    ],
    score: 80,
  },
  recommendation:
    'Sarah is a **strong fit** for the Platform Engineer role. Her extensive experience with Kubernetes, Terraform, and cloud infrastructure directly aligns with our requirements. She brings leadership experience and a track record of improving deployment processes. The only minor gap is Azure DevOps experience, but her strong AWS and general CI/CD knowledge should make this easily bridgeable. **Recommend advancing to technical interview round.**',
  email_sent: true,
  email_summary:
    'Email summary of assessment sent to shreyas+bot@lyzr.ai with candidate profile, skills evaluation, and recommendation to advance.',
}

const SAMPLE_HISTORY: HistoryEntry[] = [
  {
    id: '1',
    candidateName: 'Sarah Chen',
    fitStatus: 'fit',
    overallScore: 87,
    timestamp: '2 minutes ago',
    data: SAMPLE_RESULT,
  },
  {
    id: '2',
    candidateName: 'Marcus Johnson',
    fitStatus: 'not_fit',
    overallScore: 42,
    timestamp: '15 minutes ago',
    data: {
      candidate_name: 'Marcus Johnson',
      fit_status: 'not_fit',
      overall_score: 42,
      skills_match: {
        matched_skills: ['Python', 'Linux'],
        missing_skills: ['Kubernetes', 'Docker', 'Terraform', 'AWS', 'CI/CD'],
        score: 30,
      },
      experience_evaluation: {
        summary: 'Marcus has 2 years of experience primarily in software development with limited infrastructure exposure. His background is mostly in application development rather than platform engineering.',
        years_relevant: '1 year',
        score: 35,
      },
      nice_to_haves: { matched: [], score: 10 },
      recommendation: 'Marcus does not currently meet the requirements for the Platform Engineer role. **Significant gaps** in Kubernetes, containerization, and infrastructure-as-code skills. May be a better fit for a junior DevOps or software engineering position.',
      email_sent: false,
      email_summary: 'No email sent as candidate does not meet minimum requirements.',
    },
  },
  {
    id: '3',
    candidateName: 'Priya Patel',
    fitStatus: 'fit',
    overallScore: 78,
    timestamp: '1 hour ago',
    data: {
      candidate_name: 'Priya Patel',
      fit_status: 'fit',
      overall_score: 78,
      skills_match: {
        matched_skills: ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'CI/CD Pipelines'],
        missing_skills: ['Pulumi', 'Advanced Monitoring'],
        score: 75,
      },
      experience_evaluation: {
        summary: 'Priya has 4 years of solid platform engineering experience with focus on AWS cloud infrastructure and Kubernetes orchestration.',
        years_relevant: '4 years',
        score: 80,
      },
      nice_to_haves: { matched: ['Blog author on DevOps topics'], score: 50 },
      recommendation: 'Priya is a **good fit** for the role. She brings solid technical skills and relevant experience. Recommend proceeding with interview.',
      email_sent: true,
      email_summary: 'Assessment summary emailed to shreyas+bot@lyzr.ai.',
    },
  },
]

// ============================================================
// Markdown Renderer
// ============================================================

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm leading-relaxed">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// ============================================================
// Helper: format file size
// ============================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// ============================================================
// Score Ring Component
// ============================================================

function ScoreRing({ score, size = 80, label }: { score: number; size?: number; label?: string }) {
  const normalizedScore = Math.max(0, Math.min(100, score ?? 0))
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (normalizedScore / 100) * circumference
  const color =
    normalizedScore >= 75
      ? 'text-green-500'
      : normalizedScore >= 50
      ? 'text-amber-500'
      : 'text-red-500'
  const strokeColor =
    normalizedScore >= 75
      ? '#22c55e'
      : normalizedScore >= 50
      ? '#f59e0b'
      : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-semibold', color, size >= 80 ? 'text-xl' : 'text-sm')}>
            {normalizedScore}
          </span>
        </div>
      </div>
      {label && <span className="text-xs text-muted-foreground font-medium">{label}</span>}
    </div>
  )
}

// ============================================================
// Collapsible Section Component
// ============================================================

function CollapsibleSection({
  title,
  icon,
  score,
  defaultOpen = false,
  children,
}: {
  title: string
  icon: React.ReactNode
  score?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border border-border/60 shadow-sm">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-accent/40 transition-colors rounded-t-[var(--radius)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/5 text-primary">{icon}</div>
              <span className="font-medium text-sm">{title}</span>
            </div>
            <div className="flex items-center gap-3">
              {score !== undefined && score !== null && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {score}/100
                </Badge>
              )}
              {isOpen ? (
                <FiChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <FiChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            <Separator className="mb-4" />
            {children}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// ============================================================
// Dropzone Component
// ============================================================

function FileDropzone({
  onFileSelect,
  disabled,
}: {
  onFileSelect: (file: File) => void
  disabled?: boolean
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) setIsDragOver(true)
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (disabled) return
      const files = e.dataTransfer.files
      if (files.length > 0) {
        const file = files[0]
        const ext = file.name.toLowerCase()
        if (ext.endsWith('.pdf') || ext.endsWith('.docx') || ext.endsWith('.doc')) {
          onFileSelect(file)
        }
      }
    },
    [disabled, onFileSelect]
  )

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileSelect(files[0])
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
        isDragOver
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-border hover:border-primary/50 hover:bg-accent/30',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-3">
        <div className={cn('p-3 rounded-full transition-colors', isDragOver ? 'bg-primary/10' : 'bg-muted')}>
          <FiUpload className={cn('w-6 h-6', isDragOver ? 'text-primary' : 'text-muted-foreground')} />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {isDragOver ? 'Drop your resume here' : 'Drag & drop a resume'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">or click to browse -- PDF, DOCX accepted</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// File Preview Component
// ============================================================

function FilePreview({
  file,
  onRemove,
  disabled,
}: {
  file: File
  onRemove: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/40 border border-border/60">
      <div className="p-2 rounded-lg bg-primary/10">
        <FiFileText className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
      </div>
      <button
        onClick={onRemove}
        disabled={disabled}
        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
      >
        <FiTrash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

// ============================================================
// Results Display Component
// ============================================================

function ResultsDisplay({ data }: { data: ScreeningResult }) {
  const isFit = data?.fit_status?.toLowerCase() === 'fit'
  const matchedSkills = Array.isArray(data?.skills_match?.matched_skills)
    ? data.skills_match.matched_skills
    : []
  const missingSkills = Array.isArray(data?.skills_match?.missing_skills)
    ? data.skills_match.missing_skills
    : []
  const niceToHaveMatched = Array.isArray(data?.nice_to_haves?.matched)
    ? data.nice_to_haves.matched
    : []

  return (
    <div className="space-y-5">
      {/* Header: Candidate Name + Fit Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-full', isFit ? 'bg-green-100' : 'bg-red-100')}>
            <FiUser className={cn('w-5 h-5', isFit ? 'text-green-600' : 'text-red-600')} />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">{data?.candidate_name ?? 'Unknown Candidate'}</h3>
            <p className="text-xs text-muted-foreground">Resume Assessment</p>
          </div>
        </div>
        <Badge
          className={cn(
            'text-sm px-4 py-1.5 font-semibold',
            isFit
              ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100'
              : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100'
          )}
        >
          {isFit ? (
            <FiCheck className="w-4 h-4 mr-1.5" />
          ) : (
            <FiX className="w-4 h-4 mr-1.5" />
          )}
          {isFit ? 'Fit' : 'Not a Fit'}
        </Badge>
      </div>

      {/* Email Confirmation Banner */}
      {data?.email_sent && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <FiMail className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Summary emailed to shreyas+bot@lyzr.ai</p>
            {data?.email_summary && (
              <p className="text-xs text-blue-600 mt-1">{data.email_summary}</p>
            )}
          </div>
        </div>
      )}

      {/* Overall Score */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Overall Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">{data?.overall_score ?? 0}</span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <Progress
                value={data?.overall_score ?? 0}
                className="h-2 mt-3 w-48"
              />
            </div>
            <ScoreRing score={data?.overall_score ?? 0} size={90} />
          </div>
        </CardContent>
      </Card>

      {/* Skills Match */}
      <CollapsibleSection
        title="Skills Match"
        icon={<FiAward className="w-4 h-4" />}
        score={data?.skills_match?.score}
        defaultOpen={true}
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Matched Skills ({matchedSkills.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {matchedSkills.length > 0 ? (
                matchedSkills.map((skill, idx) => (
                  <Badge
                    key={idx}
                    className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-xs font-medium"
                  >
                    <FiCheck className="w-3 h-3 mr-1" />
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No matched skills</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Missing Skills ({missingSkills.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {missingSkills.length > 0 ? (
                missingSkills.map((skill, idx) => (
                  <Badge
                    key={idx}
                    className="bg-red-50 text-red-600 border-red-200 hover:bg-red-50 text-xs font-medium"
                  >
                    <FiX className="w-3 h-3 mr-1" />
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No missing skills</p>
              )}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Experience Evaluation */}
      <CollapsibleSection
        title="Experience Evaluation"
        icon={<FiBriefcase className="w-4 h-4" />}
        score={data?.experience_evaluation?.score}
        defaultOpen={true}
      >
        <div className="space-y-3">
          {data?.experience_evaluation?.years_relevant && (
            <div className="flex items-center gap-2">
              <FiClock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="font-medium">Relevant Experience:</span>{' '}
                {data.experience_evaluation.years_relevant}
              </span>
            </div>
          )}
          {data?.experience_evaluation?.summary && (
            <div className="text-sm text-muted-foreground leading-relaxed">
              {renderMarkdown(data.experience_evaluation.summary)}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Nice-to-Haves */}
      <CollapsibleSection
        title="Nice-to-Haves"
        icon={<FiStar className="w-4 h-4" />}
        score={data?.nice_to_haves?.score}
      >
        <div className="flex flex-wrap gap-2">
          {niceToHaveMatched.length > 0 ? (
            niceToHaveMatched.map((item, idx) => (
              <Badge
                key={idx}
                className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50 text-xs font-medium"
              >
                <FiStar className="w-3 h-3 mr-1" />
                {item}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No nice-to-have qualifications matched</p>
          )}
        </div>
      </CollapsibleSection>

      {/* Recommendation */}
      <CollapsibleSection
        title="Recommendation"
        icon={<FiFileText className="w-4 h-4" />}
        defaultOpen={true}
      >
        <div className="text-sm text-foreground">
          {data?.recommendation ? renderMarkdown(data.recommendation) : (
            <p className="text-muted-foreground">No recommendation available</p>
          )}
        </div>
      </CollapsibleSection>

      {/* Email Status Footer */}
      {data?.email_sent === false && data?.email_summary && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border/60">
          <FiAlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">No email sent</p>
            <p className="text-xs text-muted-foreground mt-1">{data.email_summary}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Loading Skeleton
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-full" />
          <div>
            <Skeleton className="h-5 w-36 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <Card className="border border-border/60">
        <CardContent className="p-5">
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-8 w-16 mb-3" />
              <Skeleton className="h-2 w-48 rounded-full" />
            </div>
            <Skeleton className="w-[90px] h-[90px] rounded-full" />
          </div>
        </CardContent>
      </Card>
      {[1, 2, 3].map((n) => (
        <Card key={n} className="border border-border/60">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-4/5 mb-2" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </Card>
      ))}
    </div>
  )
}

// ============================================================
// Error Boundary
// ============================================================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ============================================================
// Main Page Component
// ============================================================

export default function Page() {
  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isScreening, setIsScreening] = useState(false)
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [sampleDataOn, setSampleDataOn] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [timestampNow, setTimestampNow] = useState('')

  // Set timestamp in useEffect to avoid hydration mismatch
  useEffect(() => {
    setTimestampNow(new Date().toLocaleTimeString())
  }, [])

  // Determine display data based on sample toggle
  const displayResult = sampleDataOn ? SAMPLE_RESULT : screeningResult
  const displayHistory = sampleDataOn ? SAMPLE_HISTORY : history

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setErrorMessage(null)
    setScreeningResult(null)
  }, [])

  // Handle file removal
  const handleFileRemove = useCallback(() => {
    setSelectedFile(null)
    setErrorMessage(null)
  }, [])

  // Handle resume screening
  const handleScreen = useCallback(async () => {
    if (!selectedFile) return

    setIsScreening(true)
    setErrorMessage(null)
    setScreeningResult(null)
    setActiveAgentId(AGENT_ID)

    try {
      // Step 1: Upload the file
      console.log('[ResumeScreener] Uploading file:', selectedFile.name, selectedFile.size)
      const uploadResult = await uploadFiles(selectedFile)
      console.log('[ResumeScreener] Upload result:', JSON.stringify(uploadResult))

      if (!uploadResult.success || !Array.isArray(uploadResult.asset_ids) || uploadResult.asset_ids.length === 0) {
        const errMsg = uploadResult.error
          ?? (uploadResult.asset_ids?.length === 0 ? 'Upload succeeded but no asset IDs were returned. Please try again.' : 'File upload failed. Please try again.')
        setErrorMessage(errMsg)
        setIsScreening(false)
        setActiveAgentId(null)
        return
      }

      console.log('[ResumeScreener] Asset IDs for agent:', uploadResult.asset_ids)

      // Step 2: Call the agent with the uploaded file assets
      const result: AIAgentResponse = await callAIAgent(
        'Screen this resume against the Platform Engineer job description. Evaluate skills match, experience, and qualifications. If the candidate is a fit, send an email summary to shreyas+bot@lyzr.ai via Gmail.',
        AGENT_ID,
        { assets: uploadResult.asset_ids }
      )
      console.log('[ResumeScreener] Agent result:', JSON.stringify(result))

      if (result.success) {
        // Try multiple access patterns for the response data
        let data: ScreeningResult | undefined

        // Primary: result.response.result (standard normalized response)
        if (result?.response?.result && typeof result.response.result === 'object' && Object.keys(result.response.result).length > 0) {
          // Check if the data is nested under a 'result' key within result
          const inner = result.response.result as any
          if (inner.candidate_name || inner.fit_status) {
            data = inner as ScreeningResult
          } else if (inner.result && typeof inner.result === 'object' && (inner.result.candidate_name || inner.result.fit_status)) {
            data = inner.result as ScreeningResult
          } else if (inner.text && typeof inner.text === 'string') {
            // Agent might have returned JSON as a text string
            try {
              const parsed = JSON.parse(inner.text)
              if (parsed.candidate_name || parsed.fit_status || parsed.result) {
                data = parsed.result ?? parsed
              }
            } catch {
              // Not JSON text, fall through
            }
          } else {
            // Use whatever is there
            data = inner as ScreeningResult
          }
        }

        // Fallback: check result.response.message for JSON string
        if (!data && result?.response?.message && typeof result.response.message === 'string') {
          try {
            const parsed = JSON.parse(result.response.message)
            if (parsed.candidate_name || parsed.fit_status || parsed.result) {
              data = parsed.result ?? parsed
            }
          } catch {
            // Not JSON
          }
        }

        // Fallback: check raw_response
        if (!data && result?.raw_response && typeof result.raw_response === 'string') {
          try {
            const rawParsed = JSON.parse(result.raw_response)
            const deepResult = rawParsed?.response?.result ?? rawParsed?.result ?? rawParsed
            if (deepResult?.candidate_name || deepResult?.fit_status) {
              data = deepResult as ScreeningResult
            }
          } catch {
            // Not parseable
          }
        }

        console.log('[ResumeScreener] Parsed screening data:', JSON.stringify(data))

        if (data && (data.candidate_name || data.fit_status)) {
          setScreeningResult(data)

          // Add to history
          const entry: HistoryEntry = {
            id: String(Date.now()),
            candidateName: data?.candidate_name ?? 'Unknown',
            fitStatus: data?.fit_status ?? 'unknown',
            overallScore: data?.overall_score ?? 0,
            timestamp: 'Just now',
            data: data,
          }
          setHistory((prev) => [entry, ...prev])
        } else {
          console.error('[ResumeScreener] Could not parse screening data from response:', result)
          setErrorMessage('Unexpected response format from agent. Check console for details.')
        }
      } else {
        setErrorMessage(result.error ?? 'Agent screening failed. Please try again.')
      }
    } catch (err) {
      console.error('[ResumeScreener] Error:', err)
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setIsScreening(false)
      setActiveAgentId(null)
    }
  }, [selectedFile])

  // Handle clicking a history entry
  const handleHistoryClick = useCallback((entry: HistoryEntry) => {
    setScreeningResult(entry.data)
    setSelectedFile(null)
  }, [])

  // Handle "Upload New"
  const handleUploadNew = useCallback(() => {
    setSelectedFile(null)
    setScreeningResult(null)
    setErrorMessage(null)
  }, [])

  return (
    <ErrorBoundary>
      <div style={THEME_VARS} className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 text-foreground font-sans">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary text-primary-foreground">
                  <FiFileText className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">Resume Screener</h1>
                  <p className="text-xs text-muted-foreground -mt-0.5">Platform Engineer JD</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">
                  Sample Data
                </Label>
                <Switch
                  id="sample-toggle"
                  checked={sampleDataOn}
                  onCheckedChange={setSampleDataOn}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
            {/* Left Panel: Upload + History */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upload Card */}
              <Card className="border border-border/60 shadow-md bg-white/90 backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <FiUpload className="w-4 h-4 text-primary" />
                    Upload Resume
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Upload a candidate resume to screen against the Platform Engineer job description
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selectedFile && !isScreening && (
                    <FileDropzone
                      onFileSelect={handleFileSelect}
                      disabled={isScreening}
                    />
                  )}

                  {selectedFile && (
                    <FilePreview
                      file={selectedFile}
                      onRemove={handleFileRemove}
                      disabled={isScreening}
                    />
                  )}

                  {/* Error Banner */}
                  {errorMessage && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                      <FiAlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700">{errorMessage}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex gap-3">
                  {displayResult && !isScreening ? (
                    <Button
                      onClick={handleUploadNew}
                      variant="outline"
                      className="w-full"
                    >
                      <FiRefreshCw className="w-4 h-4 mr-2" />
                      Upload New
                    </Button>
                  ) : (
                    <Button
                      onClick={handleScreen}
                      disabled={!selectedFile || isScreening}
                      className="w-full"
                    >
                      {isScreening ? (
                        <>
                          <FiRefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Screening...
                        </>
                      ) : (
                        <>
                          <FiActivity className="w-4 h-4 mr-2" />
                          Screen Resume
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>

              {/* Screening History */}
              <Card className="border border-border/60 shadow-md bg-white/90 backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <FiClock className="w-4 h-4 text-primary" />
                    Recent Screenings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {displayHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="p-3 rounded-full bg-muted inline-flex mb-3">
                        <FiFileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">No screenings yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Upload a resume to get started</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[320px]">
                      <div className="space-y-2">
                        {displayHistory.map((entry) => {
                          const entryIsFit = entry.fitStatus?.toLowerCase() === 'fit'
                          return (
                            <button
                              key={entry.id}
                              onClick={() => handleHistoryClick(entry)}
                              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left border border-transparent hover:border-border/60"
                            >
                              <div
                                className={cn(
                                  'p-1.5 rounded-full shrink-0',
                                  entryIsFit ? 'bg-green-100' : 'bg-red-100'
                                )}
                              >
                                {entryIsFit ? (
                                  <FiCheck className="w-3.5 h-3.5 text-green-600" />
                                ) : (
                                  <FiX className="w-3.5 h-3.5 text-red-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {entry.candidateName}
                                </p>
                                <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {entry.overallScore}/100
                                </Badge>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Agent Info */}
              <Card className="border border-border/60 shadow-sm bg-white/70 backdrop-blur-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-1.5 rounded-full', activeAgentId ? 'bg-green-100' : 'bg-muted')}>
                      <FiActivity
                        className={cn(
                          'w-3.5 h-3.5',
                          activeAgentId ? 'text-green-600 animate-pulse' : 'text-muted-foreground'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{AGENT_NAME}</p>
                      <p className="text-xs text-muted-foreground">
                        {activeAgentId ? 'Analyzing resume...' : 'Ready'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {activeAgentId ? 'Active' : 'Idle'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel: Results */}
            <div className="lg:col-span-3">
              <Card className="border border-border/60 shadow-md bg-white/90 backdrop-blur-md min-h-[500px]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <FiActivity className="w-4 h-4 text-primary" />
                    Screening Results
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Detailed assessment against Platform Engineer job description
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isScreening ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                        <FiRefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">Analyzing resume...</p>
                          <p className="text-xs text-blue-600 mt-0.5">
                            Evaluating against Platform Engineer JD criteria
                          </p>
                        </div>
                      </div>
                      <LoadingSkeleton />
                    </div>
                  ) : displayResult ? (
                    <ScrollArea className="max-h-[calc(100vh-220px)]">
                      <ResultsDisplay data={displayResult} />
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="p-4 rounded-full bg-muted mb-4">
                        <FiUpload className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-base font-semibold mb-1">Upload a resume to begin screening</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Drop a PDF or DOCX file into the upload area on the left. The agent will analyze skills, experience, and qualifications against the Platform Engineer job description.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
